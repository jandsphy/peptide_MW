# 多肽分子量计算器

静态网页：根据单字母氨基酸序列计算多肽分子量，支持平均质量与单同位素质量，并允许添加残基或端修饰。

**🌐 Live Site:** https://jandsphy.github.io/peptide_MW/

快速开始

1. 在浏览器中打开 `index.html`（或访问上面的 Live Site）。
2. 在文本框输入序列，选择质量类型（平均/单同位素）。
3. 可选：在"修饰"框中输入修饰，格式为逗号分隔的键值对：
   - 全局残基修饰示例：`M=15.9949,C=57.02146`（对所有该残基加上该质量）
   - 位置特异性修饰示例：`M3=15.99`（对第 3 个残基生效，使用 1-based 索引）
   - 端修饰示例：`NTERM=42.0106,CTERM=-17.0265`
4. 点击"计算分子量"。

计算公式

**多肽质量 = 残基质量之和 − (残基数 − 1) × 水分子质量 + 端修饰**

每个肽键形成时会失去一个水分子。

说明

- 支持 20 种标准氨基酸（A, R, N, D, C, E, Q, G, H, I, L, K, M, F, P, S, T, W, Y, V）的平均/单同位素质量。
- 位置特异性修饰与序列不匹配时会自动忽略并记录警告。
- 结果显示残基数、残基质量和、失去的水分子数与质量、端修饰总计、以及完整多肽总质量。

部署到 GitHub Pages

本仓库包含 GitHub Actions workflow（`.github/workflows/deploy.yml`），推送到 `main` 分支后自动发布到 `gh-pages` 分支。

启用 Pages：

1. 打开 https://github.com/jandsphy/peptide_MW
2. **Settings** → **Pages**
3. 在 **Source** 选择 **Deploy from a branch**
4. 选择 **gh-pages** 和 **/(root)**
5. **Save**

稍等 1-2 分钟后即可访问 https://jandsphy.github.io/peptide_MW/
