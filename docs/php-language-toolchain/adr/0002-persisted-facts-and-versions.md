# ADR 0002：分别版本化持久化事实与执行引擎身份

状态：记录现有序列化与缓存边界；完整恢复和迁移资格按实际构建单独验证。

内存中的 ParsedPhpDocument 可以持有 Tree-sitter tree。持久化使用独立的 SemanticSnapshot、SemanticSourceDeclarationSnapshot 与项目事实封装；不要直接把 CST 对象图当成磁盘格式。修改字段或语义约定时，核对所属 schema、命名空间及恢复校验，不把所有版本号机械改成同一个数值。

当前 SemanticSnapshot 为93，SourceDeclaration 为10，ProjectPhpFileFacts 为7，CachedProjectPhpFile 为13，压缩封装为1。entry-store 写入schema2并兼容读取schema1/2；引用结果记录为1；callable事实封装和文件为1，命名空间为 callable-facts-v1。通常项目语义索引命名空间为 semantic-v80-php-<目标版本>。这些数值由[机器基线](../reports/public-contract-baseline-mixed-html-2026-10-10.json)绑定源码，而非新建另一套常量。

引用结果另外绑定 buildId、Node运行时、服务器/候选worker/builtin worker与两WASM的实际内容、路径和角色。缺失资产、重复角色或无有效buildId不能形成可复用身份。这一执行引擎守卫属于引用结果缓存；普通语义缓存使用自己的命名空间、schema、源码哈希和负载校验，不能将前者的证明外推给后者。

不同 schema、校验失败、来源或目标不匹配时放弃对应缓存事实并重建；具体失效、取消、损坏和长期恢复场景仍需要各自测试。静态字段基线不替代这些运行证明。

源码：[snapshot生产与恢复](../../../packages/semantic/src/index.ts)、[项目封装](../../../packages/language-server/src/projectFacts.ts)、[entry-store](../../../packages/index/src/entry-store.ts)、[引用引擎身份](../../../packages/language-server/src/referenceEngineIdentity.ts)、[缓存命名空间](../../../packages/language-server/src/cacheVersion.ts)。

2026-10-10核对保留原35个公开类型身份，补充六个PHPDoc与两个项目缓存模型，共43项、19个来源。原13项设置/激活策略单元在当前113项根测试中保持；[旧快照](../reports/public-contract-baseline-2026-10-09.json)独立保留。上一构建的1,480项完整LSP只绑定其原始构建。混合PHP/HTML边界修复将实现事实升至93，声明快照10保持；[原92/10快照](../reports/public-contract-baseline-2026-10-10.json)继续保留，[新构建完整1,488项协议](../reports/mixed-html-symbol-boundaries-2026-10-10.md)已独立通过；全部迁移资格继续单独验证。
