# 真实项目索引元数据有界并发

日期：2026-09-21。范围：PHP Companion Language Server 的 Composer 项目索引。

## 实现

索引器已有有界 `readConcurrency` 契约，文件元数据可并发预取，语义更新和缓存恢复仍按确定顺序提交。语言服务器此前使用默认值 1；本次对主索引设置为 32。真实缓存审计工具默认采用同样设置，并记录项目事实校验、语义声明恢复耗时。没有改变 10,000 文件预算、缓存格式、PHP 类型关系或引用身份。

## 真实工作区单次测量

| 项目 | 元数据并发 | 冷索引 | 热索引 | 热启动项目可查询 | 热缓存与引用 |
| --- | ---: | ---: | ---: | ---: | --- |
| Winstar PHP 8.5 | 1 | 117.0 秒 | 19.9 秒 | 11.3 秒 | 9,999/9,999；20 类、180 位置一致 |
| Winstar PHP 8.5 | 32 | 110.7 秒 | 17.1 秒 | 10.1 秒 | 9,999/9,999；20 类、180 位置一致 |
| CoreRepo PHP 7.2 | 1 | 84.3 秒 | 14.9 秒 | 6.3 秒 | 9,999/9,999；20 类、113 位置一致 |
| CoreRepo PHP 7.2 | 32 | 78.0 秒 | 12.6 秒 | 6.1 秒 | 9,999/9,999；20 类、113 位置一致 |

所有并发 32 审计均零重解析、零缓存拒绝、零进度越界。Winstar 的串行热启动约 19.9 秒中，项目事实校验约 3.5 秒、语义声明恢复约 3.4 秒；其余时间包含候选枚举、文件元数据和调度。时间是同一机器上的单次只读测量，不能单独证明稳定性能增益，也不代表 Windows 客户端连接 WSL Remote 的持续编辑体验。依赖阶段仍会扫描到预算边界。

原始记录：[Winstar 串行剖析](real-cache-profile-winstar-v62-2026-09-21.json)、[Winstar 并发 32](real-cache-profile-winstar-v62-concurrency32-2026-09-21.json)、[CoreRepo 串行基线](real-cache-corerepo-v62-2026-09-21.json)、[CoreRepo 并发 32](real-cache-profile-corerepo-v62-concurrency32-2026-09-21.json)。

## 验证与候选

索引包 27 项、语言服务器 198 项、根扩展 45 项、TypeScript、ESLint 与 24 个隔离消费 tarball 通过；四份 VSIX 内容检查与 SHA-256 校验通过。VS Code 1.138.0 隔离打包宿主以退出码 0 完成；Winstar PHP 8.5 和 CoreRepo PHP 7.2 确定性 WSL preflight 通过。真实 WSL Alpha Profile 持续编辑仍待人工验收。

功能提交 `a557e434673e3c34c8fa52a72ba1a235f7a99f36`。候选目录：`artifacts/php-companion-alpha-0.4.5-a557e434/`。主扩展 SHA-256 为 `bfb17170b3346823157a5c2a60c9f669e1595efec6b8f7b4784fa115a2af7d29`；独立 Symfony 扩展为 `c70eca0398bbfb6af7e3d9f4cfe0b03317df1951b75736bd43a3b696ca511db9`；Open Source Pack 为 `1f86a8d88dc3f22623a866026d8a22c9b49f53ab4ceda2cf335a2da08aa27618`；Recommended Pack 为 `84a84463a58c78af43d41fd27219c5ef89ec867ab025b35b732de93c024f3423`。

候选预检：[Winstar PHP 8.5](alpha-preflight-winstar-concurrent-index.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-concurrent-index.json)。
