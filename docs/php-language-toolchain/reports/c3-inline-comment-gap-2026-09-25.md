# C3 Inline Variable 保留中间注释

日期：2026-09-25。只修改 SoPHP 语义分析与隔离编辑器夹具；未修改业务项目或生成 VSIX。

此前 Inline Variable 只看声明后的下一个语法节点。声明与唯一整值使用之间有 `//` 或 `/* ... */` 注释时，注释也会成为节点，使安全的内联操作消失。现在只在寻找下一条可执行语句时跳过注释；仍要求同一作用域内只有声明与该整值使用两处变量引用，且中间不能有可执行语句、引用赋值、嵌套赋值或声明行尾注释。删除声明后，原注释留在原处，内联表达式只替换使用点。

语义正例包含两种独立注释，反例继续覆盖中间函数调用、重复使用、引用别名、嵌套赋值和声明行尾注释；定向语义测试通过。VS Code 1.139.0 隔离 C3 源码宿主将注释放在真实 PHP 文件的声明与 `return` 之间，完成旧计划拒绝、预览取消、应用与一次 Undo/Redo；注释在应用和 Redo 后仍保留，完整 C3 宿主退出码 0，日志 `/tmp/sophp-c3-inline-comment-20260925.log`。语义与 Language Server 构建、扩展 bundle、宿主 TypeScript、相关 ESLint 和差异检查通过。安装候选与 Remote 编辑器操作仍待 C4 验收。

同轮核对 [VS Code 资源管理器新文件实现](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/files/browser/fileActions.ts)：`explorer.newFile` 使用内部文件编辑服务并要求用户在资源管理器输入文件名，不能作为 SoPHP 自动生成类型文件的公开程序接口。现有生成文件一次 Undo 后 Redo 未恢复的问题仍单列，不因 Inline Variable 的完整撤销链而关闭。
