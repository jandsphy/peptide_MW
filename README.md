# 多肽分子量计算器

静态网页：根据单字母氨基酸序列计算多肽分子量，支持平均质量与单同位素质量，并允许添加残基或端修饰。

**🌐 Live Site:** https://jandsphy.github.io/peptide_MW/

快速开始

1. 在浏览器中打开 `peptide-mw/index.html`。
2. 在文本框输入序列，选择质量类型（平均/单同位素）。
3. 可选：在“修饰”框中输入修饰，格式为逗号分隔的键值对：
   - 残基修饰示例：`M=15.9949,C=57.02146`（对所有该残基加上该质量）
   - 端修饰示例：`NTERM=42.0106,CTERM=-17.0265`
   - 可选：在“修饰”框中输入修饰，格式为逗号分隔的键值对：
      - 全局残基修饰示例：`M=15.9949,C=57.02146`（对所有该残基加上该质量）
      - 位置特异性修饰示例：`M3=15.99`（对第 3 个残基生效，使用 1-based 索引；如果指定的残基类型与序列上该位点不匹配，则该条修饰会被忽略并记录警告）
      - 端修饰示例：`NTERM=42.0106,CTERM=-17.0265`
4. 点击“计算分子量”。

部署到 GitHub Pages

本仓库包含一个 GitHub Actions workflow（`.github/workflows/deploy.yml`），它会在你把代码推送到 `main` 分支后自动把站点发布到 `gh-pages` 分支，从而启用 GitHub Pages。

简要步骤：

```bash
git init
git add .
git commit -m "Add peptide MW site"
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
git push -u origin main
```

推送到 `main` 后，Actions 会自动运行并将站点发布到 `gh-pages` 分支；你可以在仓库的 `Settings → Pages` 中查看页面地址。

如需我替你：
- 替换为你仓库名并生成更复杂的构建/发布配置。
