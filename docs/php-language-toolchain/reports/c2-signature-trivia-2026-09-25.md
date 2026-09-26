# C2 字符串与注释中的伪参数提示

日期：2026-09-25。SoPHP Core 源码、真实 stdio 和隔离 VS Code 1.139.0 Linux 扩展宿主；未修改业务项目或打包 VSIX。

`$text = "outer(se rest"` 和 `// outer(se rest` 中的文本原先被签名正则误认为 PHP 调用，导致 `Signature Help` 和命名参数补全显示 `outer`。语义红色用例确认了该误提示。完整字符串、已解析注释可直接用源码范围排除；解析器对尚未闭合的字符串与块注释没有提供相同范围，因此在光标落于语法错误范围时，补充有界的引号与注释状态检查。

修复保留真实调用中的字符串实参：`outer("text"` 即使缺少外层右括号仍可取得外层签名；已解析调用的字符串实参内也继续提供参数提示。完整语义回归先发现三项此类误抑制，收窄条件后 **333/333** 通过。定向真实 stdio 验证字符串和注释中的 Signature Help 为 `null`，同一文件中的真实 `outer(1, se` 仍返回签名。隔离 VS Code Core 源码宿主实际加载重新编译的 `dist-test`，日志包含 `C2 signature trivia: no ghost hints in text, real call remains available`，退出码 0。

这证明源码 Provider 对所测正反例的行为；已安装 VSIX、WSL Remote、PHP 字符串插值中的表达式与长期使用仍需按 C4 范围单独验收。
