# SoPHP Symfony 重命名旧来源提示与单元门禁

日期：2026-09-25。独立 Symfony 扩展的 YAML/XML Rename 会在服务器返回编辑后核对参与文件的来源摘要。旧单元 mock 没有提供 VS Code 打开文档集合及协议中的 `sourceHashes`，导致包内 Rename 测试实际失败；用户界面在来源变化时也只显示英文错误。

现有单元测试已按实际协议提供打开文档和 SHA-256 摘要，正向测试验证服务/参数入口回退到路由名并生成编辑；新增负向测试在中文界面下改动来源文本，验证 Rename 拒绝过期编辑并给出中文提示。生产校验逻辑保持原样，只将错误文本接入 SoPHP Symfony 的英中本地化。

`pnpm --dir packages/php-companion-symfony test`：3 个测试文件、6 项测试通过；同包 `typecheck`、相关 ESLint 与差异检查通过。尚未在实际 VS Code 中文界面操作 F2，因此这项结果是单元与源码证据，不能代替安装候选的 UI 验收。未修改业务项目，也未打包 VSIX。
