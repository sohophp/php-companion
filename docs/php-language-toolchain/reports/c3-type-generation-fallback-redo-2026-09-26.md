# C3 类型生成备用创建路径的一次 Redo

日期：2026-09-26。独立 Composer 夹具、Linux x64、VS Code 1.139.0 隔离 Extension Host；未修改业务项目，未重新打包 VSIX。

在现有 C3 生成命令中，通过 `testApplyStagedEdit` 注入移动编辑返回 `false`，让产品实际执行备用的 `WorkspaceEdit.createFile`。命令返回 `true`，目标 PHP 文件内容正确；随后打开目标，执行一次标准 `undo`，文件消失；执行一次标准 `redo`，文件仍不存在。日志 `/tmp/sophp-c3-fallback-redo-probe-20260926.log` 记录 `C3 fallback createFile Redo: restored=false` 与断言失败，测试退出码 1。这是针对开放缺口的**预期失败探针**，不是完整 C3 套件通过。

复现入口是 `PHP_COMPANION_TEST_C3_FALLBACK_REDO_PROBE=1 pnpm test:extension:c3`。该环境变量只在备用创建路径后追加 Undo/Redo 断言；默认 C3 回归不启用这个预期失败探针。正常的预先准备文件移动路径已有[独立与完整 Pack 宿主的一次 Undo/Redo 通过证据](c3-type-generation-staged-redo-2026-09-25.md)。更早的 VS Code 最小 `createFile` 对照也未恢复文件；本次把缺口明确定位到**SoPHP 实际备用命令路径**。

因此备用创建路径只保证预览后成功创建及 Undo 删除，**不满足 C3 的一次 Redo 门槛**。若用户在该路径撤销后想恢复文件，可重新执行生成命令；不能把正常移动路径的通过结果推广到移动失败、跨文件系统或虚拟文件系统。下一步要么找到可验证的同文件系统预先准备文件移动方案，要么由 VS Code 公共资源编辑 API 修正 Redo 路由；任何方案都须检查残留临时文件、覆盖保护与真实 Remote 行为。

本轮在备用路径成功创建文件后增加中英文警告，告知用户 Undo 后 Redo 可能无法恢复，并可重新执行创建命令。正常预先准备文件移动路径不显示该警告。此提示改善失败恢复信息，不把 Redo 缺口判作已解决。

改动后的默认完整 C3 源码宿主退出码 0，日志 `/tmp/sophp-c3-fallback-warning-default-20260926.log`；其中主路径类型生成与其它 C3 预览、编辑、撤销链继续通过。根扩展与测试入口 TypeScript、改动文件 ESLint、`git diff --check` 通过。预期失败探针须显式设置环境变量才启用。

## 同文件系统备用移动（后续修复）

当前源码在首个系统临时目录移动失败后，会尝试在工作区根目录的同级位置写入权限为 `0600` 的临时 PHP 文件，再通过 `WorkspaceEdit.renameFile` 移入目标。该位置位于所有工作区之外时才启用；移动仍失败才使用原有 `createFile` 兜底。成功移动的临时源路径必须保留给 VS Code 的 Undo/Redo，不能在命令结束时清除。

在独立 VS Code 1.139.0 Linux x64 C3 源码宿主中，注入首个移动返回 `false` 后，第二次移动成功；对生成文件执行一次 Undo 删除、一次 Redo 恢复，日志记录 `C3 fallback stage Redo: restored=true`。同一完整 C3 宿主还注入两次移动都返回 `false`，确认最终 `createFile` 兜底仍创建正确内容；宿主以 0 退出，日志 `/tmp/sophp-c3-sibling-stage-final-host-20260926.log`。根扩展与测试入口 TypeScript、相关 ESLint、`git diff --check` 通过，宿主结束后工作区同级没有残留 `.sophp-type-stage-*.php`。未重新打包 VSIX，未修改业务项目。

此结果关闭了**已测 Linux 文件工作区中首个移动失败时**的 Redo 缺口。若同级目录不可写、工作区根位于文件系统根目录、跨 scheme 或虚拟文件系统仍落到 `createFile`，其一次 Redo 缺口继续开放；实际 WSL Remote 与其他平台尚未验收。

后续清理检查修正了一个边界：临时路径只在本命令的独占写入成功、随后移动失败时删除；若独占写入因路径已存在而失败，不删除该路径。根扩展与测试入口 TypeScript、相关 ESLint 和 `git diff --check` 通过。此处没有重新运行 VS Code 宿主；前述完整 C3 宿主结果对应修正前的清理条件。
