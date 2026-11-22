# 当前源码与构建产物一致性

2026-10-13。本批使用正常构建入口核对候选源码与已验证运行资产的关系，不修改功能。

已执行并通过：实际pnpm typecheck退出0，包含组件边界、公开契约、24组件重建、根tsc --noEmit及Symfony类型检查。随后原node esbuild.mjs --production和pnpm --dir packages/php-companion-symfony build均退出0。

重建前后831个packages/*/dist与根dist文件逐字一致，无新增或删除；构建期间记录的237个源码及构建输入校验值保持。Core仍为8e1a08c7、Semantic仍为761e112d。当前源码正常重建能复现已有运行资产，因此相同运行输入的既有回归和隔离消费者资格可按原范围复用；无需仅因产物重建重复运行同快照测试。

证据：[完整类型与组件构建日志](../../../.vscode-test/current-build-consistency-2026-10-13/typecheck.log)、[Core正常构建](../../../.vscode-test/current-build-consistency-2026-10-13/core-build.log)、[Symfony正常构建](../../../.vscode-test/current-build-consistency-2026-10-13/symfony-build.log)、[终态校验](../../../.vscode-test/current-build-consistency-2026-10-13/final-audit.json)。来源及运行文件清单保留在同目录。

产物一致不增加新平台、真人或性能资格。工具最近的清理/最小输入修复保留各自定向及根测试证据，历史规模和两小时工具快照不能冒充新工具复测。复杂Controller原500/150ms、真实编辑器/Remote及完整计划继续开放。未提交、推送、发布或更新日常Profile，新增功能暂缓。
