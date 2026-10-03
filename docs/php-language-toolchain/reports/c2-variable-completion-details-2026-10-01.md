# C2 变量候选类型说明（2026-10-01）

## 修改

变量候选原先只有名称和替换范围，没有类型说明。语言服务器现在声明 `completionProvider.resolveProvider`，通过标准 [completionItem/resolve](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#completionItem_resolve) 为选中的变量补充 `detail`，如 `$part: string` 或 `$part: array{0: string, 1: int}`。列表生成不逐项计算类型；名称、排序、替换范围和插入文本保持既有逻辑。

语义层提供当前作用域与光标位置的说明查询。局部赋值和 foreach 复用现有事实；已重赋值的参数使用局部值，不沿用入口声明。不可见变量、未声明变量、引用参数、未知调用接收参数、动态符号表写入和无法证明的结果不附加说明。

候选绑定 URI、文档版本和 WeakMap 中的文档对象身份。修改、关闭或同 URI／同版本号重新打开后，旧候选不能取得说明；传入旧 detail 也会撤下。完成异步查询后复核当前文档与取消状态。WeakMap 不持有旧文档的强引用，未增加候选或文档快照常驻缓存。

首次全量检查发现把说明的保护逻辑放进共享预期类型查询会影响空赋值与参数位置排序；该改动已撤回。最终说明查询复用值推断，但不改变预期类型排序，最终全量通过。另补齐 foreach 候选说明回归，不能用纯赋值测试代表遍历场景。

## 验证

- 最终语义全量 532 项通过。新增用例覆盖局部整数、参数重赋值、稳定字符串参数、引用参数、跨作用域／不存在变量、未知调用、eval、unset、foreach 元素说明。
- PHP 7.2／8.5 两项独立 Composer 真实 stdio LSP 通过：explode／str_split／整数数组／普通 preg_split／组合偏移捕获切换时，Hover、变量替换文本与解析后的 detail 一致。
- 同一 LSP 测试核对编辑后旧候选、关闭后旧候选，以及重新打开版本 1 后的旧候选均没有 detail；新候选恢复正确说明。
- 隔离源码 VS Code Extension Host 通过：使用实际 `vscode.executeCompletionItemProvider` 请求解析候选，核对变量 detail 随未保存类型切换及 Undo／Redo 更新，同时核对 Hover。退出码 0。
- Semantic／语言服务器构建、TypeScript、所改文件 ESLint 与 git diff --check 通过。

## 等待测量

扩充现有 `scripts/benchmark-project-completion.mjs`，通过 `SOPHP_BENCHMARK_DETAIL_A`／`SOPHP_BENCHMARK_DETAIL_B` 可选地解析指定变量并核对完整 detail；原有未启用解析的基准行为保留。

独立 Composer 临时项目 100 轮真实 stdio，交替普通字符串元素与偏移二元数组源码。每轮检查候选出现、旧变量撤回、选定变量说明正确；计时包含 completion 和 resolve 两个往返：P50 5.53 ms、P95 9.07 ms、最大／首次 66.07 ms，没有 incomplete。它是小型项目协议等待，不代表大型项目或可见弹窗。

没有生成 VSIX、更新 Profile、提交或推送。真实 WSL UI、复杂流窄化的呈现及长期使用仍单列，不以自动化宣称路线图全部完成。
