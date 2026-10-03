# XSL phpstorm-stubs 接入

- 固定来源：JetBrains/phpstorm-stubs `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `xsl/xsl.php`，Apache-2.0。提取 `XSLTProcessor` 的 13 个方法名、4 个属性名和 14 个常量名，不复制上游描述文本。
- `scripts/sync-phpstorm-xsl.mjs` 通过本机 PHP 7.2／7.4／8.1／8.2／8.4／8.5 反射记录方法签名、返回类型、属性和常量。前四版各有 12 个方法且没有声明属性；8.4／8.5 各有 13 个方法和 4 个属性。PHP 8.4 加入 `registerPHPFunctionNS()` 并显式声明 `cloneDocument`、`doXInclude`、`maxTemplateDepth` 和 `maxTemplateVars`，与 [PHP 手册](https://www.php.net/manual/en/class.xsltprocessor.php)的版本记录一致。
- 固定上游的 `LIBXSLT_DOTTED_VERSION` 为 `1.1.28`，本机六个 PHP 运行时均导出 `1.1.32`。`LIBXSLT_*` 和 `LIBEXSLT_*` 四个版本常量在缺少项目运行时事实时不生成；有运行时探测时提供其实际导出值。其它 10 个 XSL 常量可作为固定回退。
- XSL 已纳入通用 PHP 内置声明和扩展可用性过滤。stdio LSP 验证 PHP 8.5 的新方法与属性补全、类型和运行时常量跳转；禁用 XSL 后候选与跳转撤回。六个本机版本的解析结果与运行时反射逐一比较，方法数、参数名、必填数、属性数均一致，解析错误为零；运行时探测均返回 14 个常量，内置 URI 往返恢复完整。

验证：目录同步检查、语言规格 116 项测试、运行时探测 24 项测试、定向 stdio LSP 测试、三个包的 TypeScript 构建及定向 ESLint。PHP 7.3／8.0／8.3 本机没有对应运行时，签名采用相邻快照和上游版本边界；真实 VS Code/WSL 界面尚未验收。本轮不打包、提交或更新 Profile。
