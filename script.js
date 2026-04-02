(function(){
  // Average masses (Da)
  const AVG = {
    A:71.0788,R:156.1875,N:114.1038,D:115.0886,C:103.1388,
    E:129.1155,Q:128.1307,G:57.0519,H:137.1411,I:113.1594,
    L:113.1594,K:128.1741,M:131.1926,F:147.1766,P:97.1167,
    S:87.0782,T:101.1051,W:186.2132,Y:163.1760,V:99.1326
  };

  // Monoisotopic masses (Da)
  const MONO = {
    A:71.03711,R:156.10111,N:114.04293,D:115.02694,C:103.00919,
    E:129.04259,Q:128.05858,G:57.02146,H:137.05891,I:113.08406,
    L:113.08406,K:128.09496,M:131.04049,F:147.06841,P:97.05276,
    S:87.03203,T:101.04768,W:186.07931,Y:163.06333,V:99.06841
  };

  const WATER = { average: 18.01528, monoisotopic: 18.01056 };

  const seqEl = document.getElementById('seq');
  const calcBtn = document.getElementById('calc');
  const clearBtn = document.getElementById('clear');
  const resultSection = document.getElementById('result');
  const massSummary = document.getElementById('massSummary');
  const compositionBody = document.querySelector('#composition tbody');
  const errorsEl = document.getElementById('errors');
  const massTypeEl = document.getElementById('massType');
  const modsEl = document.getElementById('mods');

  function sanitizeSequence(raw){
    return raw.toUpperCase().replace(/[^A-Z]/g,'');
  }

  function parseMods(text){
    // supports: A=15.99 (global residue), A3=15.99 (position-specific, 1-based), NTERM=42.01, CTERM=-17.02
    const mods = { residues: {}, positions: {}, nterm: 0, cterm: 0, errors: [] };
    if(!text) return mods;
    const parts = text.split(',').map(s=>s.trim()).filter(Boolean);
    for(const p of parts){
      // NTERM / CTERM
      if(/^NTERM$/i.test(p.split('=')[0])){
        const m = p.match(/^NTERM\s*=\s*([+\-]?\d*\.?\d+)$/i);
        if(m) mods.nterm += parseFloat(m[1]); else mods.errors.push(p);
        continue;
      }
      if(/^CTERM$/i.test(p.split('=')[0])){
        const m = p.match(/^CTERM\s*=\s*([+\-]?\d*\.?\d+)$/i);
        if(m) mods.cterm += parseFloat(m[1]); else mods.errors.push(p);
        continue;
      }

      // residue or positional: e.g., M=15.99 or M3=15.99
      const m = p.match(/^([A-Za-z])(\d*)\s*=\s*([+\-]?\d*\.?\d+)$/);
      if(!m){ mods.errors.push(p); continue; }
      const res = m[1].toUpperCase();
      const posStr = m[2];
      const delta = parseFloat(m[3]);
      if(posStr){
        const pos = parseInt(posStr,10);
        if(isNaN(pos) || pos < 1) { mods.errors.push(p); continue; }
        mods.positions[pos] = mods.positions[pos] || [];
        mods.positions[pos].push({ residue: res, delta });
      } else {
        mods.residues[res] = (mods.residues[res]||0) + delta;
      }
    }
    return mods;
  }

  function calculateMass(sequence, massType, mods){
    const table = massType === 'monoisotopic' ? MONO : AVG;
    const counts = {};
    let invalid = [];
    let sum = 0;
    const posWarnings = [];
    for(let i=0;i<sequence.length;i++){
      const ch = sequence[i];
      const idx = i+1; // 1-based
      if(table[ch]){
        counts[ch] = (counts[ch]||0)+1;
        const base = table[ch];
        const globalDelta = mods.residues[ch] || 0;
        let posDelta = 0;
        if(mods.positions && mods.positions[idx]){
          for(const item of mods.positions[idx]){
            if(item.residue === ch){
              posDelta += item.delta;
            } else {
              // residue mismatch at that position
              posWarnings.push(`位置 ${idx} 指定的残基 ${item.residue} 与序列上的 ${ch} 不匹配；已忽略该修饰`);
            }
          }
        }
        sum += base + globalDelta + posDelta;
      } else {
        invalid.push(ch);
      }
    }
    const waterMass = massType === 'monoisotopic' ? WATER.monoisotopic : WATER.average;
    const totalMass = sum + (sequence.length>0 ? waterMass : 0) + mods.nterm + mods.cterm;
    return {counts,invalid,totalMass,sumResidues:sum,waterMass,posWarnings};
  }

  function renderResult(data, seqLen, mods){
    compositionBody.innerHTML = '';
    const sorted = Object.keys(data.counts).sort();
    for(const aa of sorted){
      const tr = document.createElement('tr');
      const td1 = document.createElement('td'); td1.textContent = aa;
      const td2 = document.createElement('td'); td2.textContent = data.counts[aa];
      tr.appendChild(td1); tr.appendChild(td2);
      compositionBody.appendChild(tr);
    }

    const detail = `序列长度：${seqLen} 残基\n残基质量和：${data.sumResidues.toFixed(4)} Da\n水分质量：${data.waterMass.toFixed(5)} Da\n端修饰总计：${(mods.nterm+mods.cterm).toFixed(4)} Da`;
    massSummary.innerHTML = `${detail.replace(/\n/g,'<br>')}<br>完整多肽总质量：<strong>${data.totalMass.toFixed(5)} Da</strong>`;

    const parts = [];
    if(data.invalid && data.invalid.length){
      parts.push(`忽略的无效字符：${[...new Set(data.invalid)].join(', ')}`);
    }
    if(mods.errors && mods.errors.length){
      parts.push(`无法解析的修饰：${mods.errors.join(', ')}`);
    }
    if(data.posWarnings && data.posWarnings.length){
      parts.push(data.posWarnings.join('; '));
    }
    errorsEl.textContent = parts.join('. ');

    resultSection.classList.remove('hidden');
  }

  calcBtn.addEventListener('click', ()=>{
    const raw = seqEl.value || '';
    const sanitized = sanitizeSequence(raw);
    if(!sanitized){
      alert('请输入至少一个有效的氨基酸单字母代码。');
      return;
    }
    const mods = parseMods(modsEl.value || '');
    const massType = massTypeEl.value || 'average';
    const data = calculateMass(sanitized, massType, mods);
    renderResult(data, sanitized.length, mods);
  });

  clearBtn.addEventListener('click', ()=>{
    seqEl.value = '';
    modsEl.value = '';
    resultSection.classList.add('hidden');
    compositionBody.innerHTML = '';
    errorsEl.textContent = '';
  });

  seqEl.placeholder = '例如：ACDEFGHIKLMNPQRSTVWY';
})();
