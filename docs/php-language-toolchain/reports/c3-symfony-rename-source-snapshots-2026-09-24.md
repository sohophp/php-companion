# C3 Symfony Rename 的目标源码快照

日期：2026-09-24。

SoPHP Symfony 的 YAML/XML Rename 可编辑未打开的配置文件。计划形成后、编辑器收到结果前，如果这些文件在磁盘上变化，旧位置仍可能指向别的文本。Core 现在为服务 ID、容器参数和路由 Rename 返回每个目标文件在计划形成时的 SHA-256；Symfony 扩展在构造 `WorkspaceEdit` 前重新读取当前打开缓冲区或磁盘内容并逐一比较。任一目标变化时拒绝整次 Rename，请用户重新执行。打开文件的版本检查仍保留。

隔离 VS Code C3 宿主在独立 Symfony 夹具中先确认服务 ID Rename 包含关闭的 XML 文件，再暂停服务器已形成的 Rename 响应，修改该 XML 文件，释放旧响应。编辑器拒绝了旧 `WorkspaceEdit`，没有改写 YAML，XML 的新内容仍在。服务、参数和路由现有 stdio 回归继续检查其正常编辑范围；它们没有分别模拟目标文件在请求期间变化。

验证：`pnpm --filter @php-companion/language-server build`、`pnpm --dir packages/php-companion-symfony build`、`pnpm exec tsc -p test/extension/tsconfig.json`、三处相关文件的 ESLint、两项 Symfony stdio 回归及 `PHP_COMPANION_TEST_C3_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js` 均通过，宿主退出码为 0。全仓 `pnpm build` 停在另一组尚未完成的 `packages/semantic/src/index.ts` 类型错误（`ParsedTypeNarrowing.typeName`），因此本次不能声明全仓构建通过。

这项检查保护扩展把 Rename 计划交给 VS Code 之前的时间窗口。VS Code 原生 Rename 的最终预览与 Apply 之间、外部进程在最后一次比较之后修改磁盘文件、以及真实 WSL Remote 人工操作仍需单独验收。未生成 VSIX，也未修改业务项目。
