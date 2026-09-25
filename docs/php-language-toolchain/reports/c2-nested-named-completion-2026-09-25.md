# C2 嵌套调用后的外层命名参数补全

日期：2026-09-25。SoPHP Core 源码、语义包与真实 stdio；未修改业务项目或打包 VSIX。

`outer(inner(second: 1), se…)` 中，内层 `second:` 原本会被原始文本扫描误认为外层已使用的参数；更早一步，光标经过内层调用的 `)` 后，签名正则无法识别外层调用，因此补全和参数提示均缺失。新增语义红色用例首先得到 `signature === undefined`。

现在当直接文本匹配无法识别调用时，签名查询先用已解析的、包含光标的调用范围回到外层括号；若外层右括号尚未输入，则跳过字符串与注释中的括号，从源码中寻找仍未闭合的调用左括号。回退只请求严格早于当前光标的位置，防止递归。参数上下文只在顶层逗号处分段，顶层命名参数才算外层已使用；内层命名实参不会屏蔽外层补全。方法候选的参数分析原本已有嵌套分段，本次使签名提示与它保持一致。

语义定向用例覆盖完整代码与尚未输入外层右括号的 `outer(inner(second: 1), se`，并扩展到 `$service->outer(…)` 方法调用、`new Service(…)` 构造函数及字符串实参内含多个右括号的情形；这些未完成输入均取得外层 `second:`。真实 stdio 的 Completion 返回外层 `second:`，Signature Help 选中外层第二参数。第一次完整语义回归暴露了左括号后同位置递归，修正后受影响的 7 项定向用例及完整语义包 **332/332** 通过；随后扩展的断言也通过定向回归。语义包、语言服务器 TypeScript 构建及真实 stdio 测试通过。尚未用安装 VSIX 或人工输入验证编辑器可见补全，按 C4 继续验收。

随后在隔离 VS Code 1.139.0 Linux Core 源码宿主，以尚未输入外层右括号的源码，通过 `vscode.executeCompletionItemProvider` 取得外层 `second:` 候选，通过 `vscode.executeSignatureHelpProvider` 确认外层签名及第二参数；现有 C2 诊断与 PHPDoc 编辑链也全部执行，宿主退出码 0。这证明 Extension Host 的 Provider 返回值，不等于用户在已安装候选中看见建议列表或 WSL Remote 操作。

同日补齐实参间注释：`outer(inner(second: 1), /* next, ) argument */ se` 原先能找到外层签名，但把注释也算进当前实参文本，`namedArgumentPrefix` 为 `undefined`，因此没有 `second:` 候选。现在计算参数上下文时忽略块注释、行注释和 `#` 注释中的逗号与括号，且在光标仍处于未闭合注释内时不提供命名参数候选。语义红绿用例还覆盖字符串中的 `//`、非 BMP Unicode 字符和行注释换行。完整语义包 **332/332**、相关 ESLint、语义包和语言服务器构建、真实 stdio Completion/Signature Help、隔离 VS Code C2 源码宿主 Provider 查询均通过；本轮仍未生成或安装 VSIX。

随后发现 `@method` 有多个签名时的同源问题：`$model->locate(/* hint, ) */ id: 1)` 原先把注释内逗号当成第二个实参，候选筛选退回两个签名；参数提示因此混入 `string $slug`。候选筛选现在复用上述保留源码偏移的注释处理，语义红色用例由 `[User, Other]` 变为仅 `[User]`。完整语义包 **332/332**、定向真实 stdio 和 VS Code 1.139.0 Linux Core 源码宿主均验证只返回 `locate(int $id): User`。宿主测试在执行前实际编译了 `dist-test`，日志包含 `C2 documented overload: punctuation in argument comment keeps the matching signature` 且退出码 0；此前一次仅用 `--noEmit` 检查测试源码的宿主运行加载旧测试文件，不计为新断言证据。
