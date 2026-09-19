# 项目索引缓存快速恢复

日期：2026-09-20

## 问题

Winstar 的 `onDemand` 项目源码索引包含 2265 个 PHP 文件，语义缓存约 123 MiB。旧实现即使所有文件都未变化，也会逐个读取源码、重新计算 SHA-256，并把相同缓存完整写回。已安装候选的无缓存扫描为 56.964 秒，同一缓存目录的第二次扫描仍需 18.112 秒。

## 实现

持久缓存项现在同时保存 size、mtime 和 ctime。三项与当前文件完全一致时，索引直接验证并恢复 payload，不再读取源码或重新计算内容哈希。任一元数据变化时仍读取源码并使用原有 SHA-256 比较；因此同大小、人工恢复 mtime 的内容替换仍会因 ctime 变化而重建。

当本轮所有缓存项都直接复用，且路径集合没有增加或删除时，不再序列化和原子覆盖相同缓存。旧缓存没有 ctime，会自动走一次内容哈希并升级，不需要迁移命令。

## 当前证据

- `@php-companion/index` 3 个文件、21 项测试通过。新增用例把缓存文件时间固定到 2001 年，证明完全恢复后不会重写；既有同大小且恢复 mtime 的内容替换用例继续证明缓存失效。
- Language Server 6 个文件、187 项测试，全仓 TypeScript、ESLint 与 `git diff --check` 通过；打包核心 VSIX 在隔离的 VS Code 1.138.0 Extension Host 完整通过，包括索引、诊断、导航、引用、重命名与 Safe Move。
- 真实 Winstar 使用新缓存目录的首次扫描为 60.936 秒；第二次扫描为 14.535 秒，较修改前同机热扫描 18.112 秒减少 3.577 秒（19.8%）。两次都返回 9 个 Controller context，随后 4 个 Symfony YAML 控制器 Definition 查询全部唯一命中。
- 功能提交为 `9bff193`。候选目录为 `artifacts/php-companion-alpha-0.4.5-9bff193e/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `1c258ced2ce146b8d852cdc27a0e2050f3b2995fa13ec68ef0038769564e3408`、`4de36c2f36f35c27114942af17e066c0f89c97966e7375787de9a9701b90f107`、`3ae2d085557bc162be8bdc5bb47546e95f231b5980fdd98b91a987fe4b76a334`。三份清单复核通过，Winstar PHP 8.5 与 CoreRepo PHP 7.2 的 WSL 确定性预检均通过。
- 核心候选已由 Remote CLI 覆盖安装到 WSL RockyLinux8。已安装 Language Server 为 `4a2ed510a579288911e8b2655479b99cc92a4b31b33288a7564bffc27ca35745`，扩展入口为 `116c624e95589f504f6b30821db1aa830a586deb2982e0134a1de5f41705babd`，均与构建输出相同。
- 已安装 bundle 使用全新缓存目录的冷扫描为 59.146 秒，第二次热恢复为 14.609 秒；两次都返回 9 个 Controller context，`HealthController::live` 与 `RegionController::countriesAndProvinces` 的类段和方法段共 4 个 YAML Definition 均唯一命中预期 PHP 文件。编辑器需执行 Reload Window 才会加载刚覆盖安装的 bundle。
- 剩余约 14.5 秒主要包括读取并解析约 123 MiB JSON 语义缓存，以及逐文件结构/校验和验证和声明恢复；后续优化必须继续保留损坏缓存拒绝、精准失效和按需实现层语义，不以跳过完整性验证换取时间。
