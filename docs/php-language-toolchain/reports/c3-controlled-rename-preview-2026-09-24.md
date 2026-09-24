# C3 由 SoPHP 控制的 PHP Rename 预览

日期：2026-09-24。

新增命令面板入口 `SoPHP: Rename PHP Symbol with Preview`。命令复用 Core 的 PHP Rename Provider 及其服务端工作区编辑计划，把每个参与文件的原文与修改后文本作为快照差异展示；PSR-4 文件改名在差异标题中列出目标路径。用户确认后，命令重新核对计划中所有源码摘要，并比对预览前后磁盘文件摘要，随后以一个 `WorkspaceEdit` 应用；取消、校验失败或应用失败均返回失败，不把旧范围直接提交给编辑器。类型文件声明编辑仍通过现有 `onWillRenameFiles` 协调，确认时重新暂存，避免预览超过原 60 秒暂存期后丢失声明修改。预览使用独立内容快照，不会为了展示差异打开原本关闭的目标文件。

隔离 VS Code 1.139.0 C3 宿主以独立 Composer 夹具验证了局部变量 Rename 的预览、取消、预览期间修改源缓冲区后拒绝、正常应用和一次 Undo/Redo；另一组 PSR-4 类型案例先确认新使用方进入引用图，再验证声明及使用方差异、文件改名、引用更新和一次 Undo/Redo。PHP 服务 ID 入口还验证 YAML 与 XML 目标分别出现在跨格式差异预览中，取消后保持原文。`pnpm exec tsc --noEmit`、扩展宿主测试 TypeScript、所改 TypeScript 文件 ESLint、源码 esbuild、Pack manifest 单元测试 4/4、定向 C3 宿主均通过；宿主退出码 0，日志 `/tmp/sophp-c3-controlled-rename-final.log`。没有打包 VSIX，也没有修改业务项目。

后续增量将此命令绑定为 PHP 编辑器的 F2：仅在 SoPHP 自研语言服务器成功启动、PHP Rename 已启用、编辑器可写且不在差异视图中生效；其它语言和未由 SoPHP 接管的 PHP Profile 保留 VS Code 原生 F2。隔离宿主已核对键位声明与命令注册，但实际键盘事件及设置切换仍需人工 UI 验收。外部进程在预览期间改写磁盘文件的宿主探针未形成可靠保留证据，仍须在独立场景复测；最后一次快照检查到 `workspace.applyEdit` 之间的短竞态也未关闭。此次自动宿主确认流程不等同于实际键盘与鼠标的 UI 验收。

再下一轮把 Rename 差异两侧改为 `sophp-rename-preview` 只读内容快照，流程结束即关闭本次打开的差异标签并释放快照。定向 C3 宿主确认预览文档不脏、取消及应用后无残留差异标签，跨格式服务 ID 预览期间原本关闭的 XML 目标仍保持关闭。根扩展和测试 TypeScript、相关 ESLint、源码构建及定向 C3 宿主通过，宿主退出码 0，日志 `/tmp/sophp-c3-readonly-rename-preview-final.log`。本轮不改变上述磁盘交错与真实键盘验收边界。
