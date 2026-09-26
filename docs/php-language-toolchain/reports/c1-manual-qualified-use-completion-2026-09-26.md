# C1 手写限定类导入补全

日期：2026-09-26。只修改 SoPHP 源码与独立 Composer 夹具；未修改业务项目，未生成 VSIX。

原先在 `use Domain\\Billing\\Inv` 输入类名时，类型补全上下文返回空。现在普通类导入语句可使用已写出的限定命名空间和最后一段前缀搜索 Composer 候选；建议项返回类名段 `Invoice`，不附加第二条 `use` 编辑。匹配范围限定在该命名空间路径，`Domain\\Other\\Invoice` 不会混入。trait `use`、`use function` 和 `use const` 不走类导入补全。

语义定向用例先复现空结果，修复后检查路径筛选、无重复导入和排除场景；语义包 **349/349**。真实 stdio LSP 的独立 PSR-4 项目在默认 `onDemand` 下从未打开文件返回 `Domain\\Billing\\Invoice`，无附加编辑；同一文档未保存地改为 `use Domain\\Other\\Inv` 后只返回 `Domain\\Other\\Invoice`，关闭并按磁盘原文重新打开后只恢复 Billing 候选；定向用例 **1/1**。VS Code 1.139.1 Linux x64 Core 源码宿主以 PHP 8.5、`onDemand` 模式验证手写导入的唯一建议；随后实际执行编辑器的 `editor.action.triggerSuggest` 与 `acceptSelectedSuggestion`，缓冲区精确变为 `use App\\C1\\External\\C1ExternalTypeProbe;`，没有重复 `use`。另一个独立文档在 VS Code 中未保存地把 `External` 改为 `Alternative`，候选随即切到新命名空间；执行 Revert 并关闭重开后只恢复原命名空间候选。两种命名空间各有一个同名类，普通类型位置可能同时建议两者，因此宿主断言以完整类名核对目标项。原有六项编辑查询、未保存切换、vendor 与多根链通过，退出码 **0**。语义与语言服务构建、根扩展 esbuild、扩展测试 TypeScript、相关 ESLint 和差异检查通过。

当前范围是已经写出命名空间并正在输入类名的普通 `use` 语句；尚未覆盖只输入 `use Dom` 的命名空间建议、组导入、数小时 VS Code 长会话或真实人工键盘操作。源码增量不在冻结候选 `15a5254` 中，真实 WSL Remote 安装仍待交付时验收。
