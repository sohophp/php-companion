# Open Source Pack 的 Apache 片段宿主验证

日期：2026-09-25。使用独立 Composer 夹具、VS Code 1.139.0 Linux 源码 Profile 和冻结的 8 个外部成员；未修改业务项目或生成 VSIX。

完整 Profile 加载 Core、Symfony、Open Source Pack 元数据和 8 个外部成员。打开夹具 `.htaccess` 后，VS Code 将它识别为 `apacheconf`；在 `a-force-ht` 末尾请求补全，结果包含 `a-force-https`，类型为 Snippet，对应已安装的 Apache Conf Snippets 1.4.0。Apache 语言贡献来自其依赖 `mrmlnc.vscode-apache` 1.2.0。相同宿主随后通过 C2 六项查询和诊断编辑链。日志：`/tmp/sophp-pack10-apache-snippet-final-20260925.log`，退出码 0。

后续在同一 10 项源码 Profile 补齐了实际片段应用：从补全项取得 `SnippetString` 和替换范围，插入后确认 `.htaccess` 包含 `RewriteEngine on`、HTTPS 条件、301 重写规则和 HSTS 头，原输入前缀不残留；一次 Undo 恢复原输入，一次 Redo 恢复配置文本。同一完整 C2 宿主退出码 0，日志 `/tmp/sophp-pack10-apache-snippet-insert-20260925.log`。测试文件 TypeScript、ESLint 与差异检查通过。

这证明当前 Linux 源码 Profile 的语言识别、片段候选与插入文本可用。人工按 Tab 接受建议的界面操作、已安装同批候选及 WSL Remote 尚未由本用例验证；Pack 的 Marketplace 公开版仍是旧清单。
