# F02 PHP 8.5 clone-with 语法对照

日期：2026-09-27。只使用 SoPHP 隔离工作树和本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 CLI；未修改业务项目或重新打包 VSIX。

[PHP 8.5 官方说明](https://www.php.net/manual/en/migration85.new-features.php)将 `clone` 扩展为可接收属性覆盖数组的函数式语法。对照 `php -l` 发现，`clone(new A(), ["name" => "b"])`、构造实参与覆盖值含表达式、覆盖数组来自变量以及调用尾随逗号均由 PHP 8.5 接受。旧版 grammar 原先只对简单变量操作数及字面量属性数组过滤误报；前述输入在 SoPHP Problems 中产生 `php.syntax`，尾随逗号还使旧目标缺少版本诊断。

现在先从真实代码位置识别 `clone(...)` 的完整括号范围，处理嵌套括号、字符串和注释，并将同一参数列表按普通调用重新解析。只有参数列表本身完整时，才过滤旧 grammar 的对应错误；若旧 grammar 把整个赋值包进 `ERROR`，还要核对替换关键字后的完整文档在该范围没有剩余错误。PHP 8.4 及以前继续得到 `clone with properties` 版本诊断。解析过的临时语法树立即释放。

验证：`php-runtime-syntax.test.ts` 的 20 个版本语法样本逐项与六个真实 CLI 比较，另有无操作数 void 的反例和合法对照；该测试与 `analysis.test.ts` 共 54 项通过。反例确认属性数组缺值和相邻独立语法错误仍产生 `php.syntax`。Language Server TypeScript、相关 ESLint、`git diff --check` 通过。随后完整 Language Server 回归 21 个文件通过，382 项通过、1 项跳过，退出码 0；这次完整运行未设置真实 CLI 路径，六版本对照以上述定向测试为准。该源码修复不在已冻结的 `248ee1f8` VSIX 中。
