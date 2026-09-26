# F02 PHP 8.5 无操作数 void 转换诊断

日期：2026-09-27。真实 `php -l` 对照使用本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 CLI；本机没有 7.3、8.0、8.3 CLI，这三个目标版本仍由现有语言服务版本测试覆盖。

PHP 8.5 的 `(void) strlen("x")` 合法，`(void) ;`、`(void) /* spacer */ ;` 和 `foo((void))` 被真实 CLI 拒绝。早期 PHP 可把单独 `(void)` 解析为括号中的常量，因此这些输入的语法结果与 8.5 不同。Tree-sitter 把无操作数形式解析为 `parenthesized_expression`，此前 SoPHP 没有发出 `php.syntax`。现在只在目标 PHP 8.5 对缺少后续操作数的该节点发出语法诊断；注释后的合法操作数与字符串里的 `(void)` 不受影响。

验证：带六个真实 CLI 路径的 `php-runtime-syntax.test.ts` 与原有 `analysis.test.ts` 共 54 项通过；Language Server TypeScript 检查、相关 ESLint、`git diff --check` 通过。对照还覆盖调用尾随逗号、箭头函数、`match`、enum、readonly class、类型化类常量、属性钩子和合法 void 转换的版本边界。该增量只有源码测试证据，**不在已冻结的 `248ee1f8` VSIX 中**；未安装或重打候选。

随后执行 `pnpm --dir packages/language-server test`：21 个测试文件通过，382 项通过、1 项跳过，退出码 0。该次完整回归没有设置真实 CLI 路径；六个 CLI 的差异对照以上述定向运行结果为准。
