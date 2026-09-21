# 条件同名声明的 mixin 缓存恢复

日期：2026-09-21。范围：PHP 核心 `@mixin` 声明精度，以及真实 WSL 项目的冷、热索引一致性。

## 问题与修复

Winstar PHP 8.5 真实项目的 v61 冷索引可处理 9,999 个文件，但热启动只有 9,996 个缓存命中，另外 3 个文件每次重解析。它们都是 Gedmo Doctrine Extensions 的 ORM 2/3 兼容 Trait：同一文件的两个运行时条件分支分别声明同名 Trait，且都附有相同 `@mixin`。旧语义快照记录两条相同 owner/target 关系，热恢复按唯一关系校验时拒绝该文件。

同一文件出现多个相同 FQCN 的声明时，语义层现在不发布该 owner 的 mixin 关系。运行时分支无法静态唯一确定，跳过代理成员也避免给出错误导航。普通唯一声明的 mixin 行为不变。语义快照升至 schema 81，语言服务器索引缓存升至 v62；缓存版本函数供服务器和真实审计脚本共同使用。

新增 `pnpm audit:real-cache -- <Composer root> [PHP version] [max files]`。审计只读项目源码，在系统临时目录建立两轮缓存并自动清理，记录解析/命中数量、项目可查询时间、进度异常及 20 个抽样类型的 References 集合。

## 真实项目证据

| 项目与缓存 | 冷索引 | 热索引 | 热命中 | 热重解析 | 抽样 References |
| --- | ---: | ---: | ---: | ---: | --- |
| Winstar v61，修复前 | 118.3 秒 | 25.8 秒 | 9,996/9,999 | 3 | 20 个类型、180 个位置一致 |
| Winstar v62，修复后 | 111.8 秒 | 20.4 秒 | 9,999/9,999 | 0 | 20 个类型、180 个位置一致 |
| CoreRepo PHP 7.2 v62 | 84.3 秒 | 14.9 秒 | 9,999/9,999 | 0 | 20 个类型、113 个位置一致 |

Winstar v62 项目阶段在 11.7 秒可查询，CoreRepo 为 6.3 秒；两者进度事件均无 `files > total` 或 `cached > files`。这些时间是本机单次只读测量，不代表 VS Code UI 已完成持续实际使用验收。依赖阶段仍会扫描至 10,000 文件预算并报告截断；本次消除了反复解析 3 个文件的缺陷，没有宣称冷索引已达到最终性能目标。

原始记录：[Winstar v61 冷索引](real-workspace-winstar-v61-2026-09-21.json)、[Winstar v61 失败热恢复](real-cache-winstar-v61-2026-09-21.json)、[Winstar v62 热恢复](real-cache-winstar-v62-2026-09-21.json)、[CoreRepo v62 热恢复](real-cache-corerepo-v62-2026-09-21.json)。

## 自动验证与候选

同文件条件同名 class/Trait 的正反测试覆盖 mixin 抑制和快照恢复。全仓 822 项测试、TypeScript、ESLint、24 个隔离消费 tarball 与四份 VSIX 内容校验通过。VS Code 1.138.0 隔离打包宿主以退出码 0 完成；Winstar PHP 8.5 和 CoreRepo PHP 7.2 的确定性 WSL preflight 通过。两小时真实 WSL Remote Alpha Profile 编辑仍待人工验收。

功能提交 `fc191583a250615e973ba265baed67317ac1a399`。候选目录：`artifacts/php-companion-alpha-0.4.5-fc191583/`。主扩展 SHA-256 为 `c587c0bea3592f98633d3653eeedb2f628b2ca4b931c35447ff214578fde464e`；独立 Symfony 扩展为 `bfcb5fcd4a78802375fd81622e5d12c1b08483d5d2ebfe42143a8aaa3ffb5137`；Open Source Pack 为 `21d7834e6bafa2a151e83af9a229e79a93cfe0239105b1a1645a534b863f4aa0`；Recommended Pack 为 `bab88560e9fdecc7f9fef9c66ac0442b2ff634622540d434f18b90201f3ed00a`。

候选预检原始记录：[Winstar PHP 8.5](alpha-preflight-winstar-mixin-cache.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-mixin-cache.json)。
