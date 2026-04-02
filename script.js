(function(){
  // Average mass of free amino acids (Da)
  const AVG = {
    A:89.094, R:174.203, N:132.119, D:133.103, C:121.158,
    E:147.131, Q:146.146, G:75.067, H:155.156, I:131.175,
    L:131.175, K:146.189, M:149.212, F:165.192, P:115.132,
    S:105.093, T:119.119, W:204.228, Y:181.191, V:117.148
  };

  // Monoisotopic mass of free amino acids (Da)
  const MONO = {
    A:89.04768, R:174.11168, N:132.05349, D:133.03751, C:121.01975,
    E:147.05316, Q:146.06914, G:75.03203, H:155.06948, I:131.09463,
    L:131.09463, K:146.10553, M:149.05105, F:165.07898, P:115.06333,
    S:105.04259, T:119.05824, W:204.08988, Y:181.07389, V:117.07903
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
  const presetModEl = document.getElementById('presetMod');
  const presetPosEl = document.getElementById('presetPos');
  const presetPosNumEl = document.getElementById('presetPosNum');
  const addPresetBtn = document.getElementById('addPresetMod');

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

  function updatePresetPositionVisibility(){
    const container = document.getElementById('presetPosContainer');
    if(presetPosEl.value === 'position'){
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  }

  function addPresetMod(){
    const preset = presetModEl.value;
    if(!preset){
      alert('请选择预设修饰。');
      return;
    }
    const [key, delta] = preset.split(':');
    const pos = presetPosEl.value;
    let entry;
    if(pos === 'position'){
      const num = parseInt(presetPosNumEl.value, 10);
      if(!num || num < 1){
        alert('请输入有效的位置编号。');
        return;
      }
      if(key === 'NTERM' || key === 'CTERM'){
        alert('NTERM/CTERM 修饰不能指定具体位置');
        return;
      }
      entry = `${key}${num}=${delta}`;
    } else if(pos === 'NTERM' || pos === 'CTERM'){
      entry = `${pos}=${delta}`;
    } else {
      entry = `${key}=${delta}`;
    }
    if(modsEl.value.trim()) modsEl.value += ',';
    modsEl.value += entry;
    modsEl.focus();
  }

  presetPosEl.addEventListener('change', updatePresetPositionVisibility);
  addPresetBtn.addEventListener('click', addPresetMod);

  updatePresetPositionVisibility();

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
    const waterLoss = sequence.length > 1 ? (sequence.length - 1) * waterMass : 0;
    const totalMass = sum - waterLoss + mods.nterm + mods.cterm;
    return {counts,invalid,totalMass,sumResidues:sum,waterMass,waterLoss,posWarnings};
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

    const detail = `序列长度：${seqLen} 残基\n自由氨基酸质量和：${data.sumResidues.toFixed(4)} Da\n失去的水分子数：${seqLen > 1 ? seqLen - 1 : 0}\n失去的水分质量：-${data.waterLoss.toFixed(5)} Da\n端修饰总计：${(mods.nterm+mods.cterm).toFixed(4)} Da`;
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
