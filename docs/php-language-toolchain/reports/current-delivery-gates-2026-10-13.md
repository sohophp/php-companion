# 当前候选交付门禁

2026-10-13。本批核对已有候选的组件契约、源码质量和独立消费者交付路径，不新增功能。

已执行并通过：组件边界24组件/200源文件/511导入，违规0；公开契约43项/12源文件，违规0；仓库完整pnpm lint退出0。此前根测试23文件121项的验证属于当前工具与测试快照，未重复执行产品包全套测试。

独立消费者门禁第一次实际失败：changeset status --since origin/main发现包改动，但没有新的发布说明。已新增stable-query-cancellation-and-scope-boundaries.md，为semantic与language-server现有刷新/取消、作用域及已获准性能修复声明patch。未改版本号、未执行changeset version或发布。

未跟踪说明仍不被Git差异识别，第二次失败保留。核对安装的Changesets Git实现后，复制用户当前索引到任务私有GIT_INDEX_FILE，只加入新说明，并运行同一原门禁。私有索引下原changeset status已退出0，识别两个包的patch计划；普通索引未暂存新文件。资格明确依赖该说明被纳入提交后的Git差异，当前普通工作区命令仍无法识别未跟踪文件。

已执行并通过：私有索引下原消费者门禁退出0，24组件包打包与隔离安装、公开API冒烟及真实语言服务器initialize/documentSymbol/shutdown查询通过。817个包dist顶层运行资产校验值保持，普通Git索引校验值保持。门禁未重建运行资产；使用当前已有构建验证消费路径，不代替重新构建或远程CI。

证据：[首次失败](../../../.vscode-test/current-delivery-gates-2026-10-13/package-consumer-first-failure.log)、[未跟踪文件失败](../../../.vscode-test/current-delivery-gates-2026-10-13/package-consumer-untracked-failure.log)、[发布计划](../../../.vscode-test/current-delivery-gates-2026-10-13/changeset-status.json)、[消费者门禁日志](../../../.vscode-test/current-delivery-gates-2026-10-13/package-consumer-private-index.log)。

复杂Controller原500/150ms性能预算、真实编辑器/Remote及完整计划继续开放。未提交、推送、发布或更新日常Profile，功能扩展暂缓。
