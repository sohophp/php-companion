# P9 / F01–F14 最终验收审计

日期：2026-09-23。初次审计源码提交 `208e335`，后续补充公开 API Rename 范围、private 参数删除安全域及 Extract Interface 子集。当前私有候选绑定 `53353ff6`，产物及预检见[当前候选报告](p9-alpha-candidate-current-2026-09-23.md)。此表按 [acceptance.md](../acceptance.md) 的**最终**范围判断；某个专项自动测试通过，不自动把整个 F 项标为完成。

| ID | 当前证据 | 最终验收尚缺 |
| --- | --- | --- |
| F01 | [当前候选原始 Core/Symfony VSIX](p9-alpha-candidate-current-2026-09-23.md) 在隔离 Linux VS Code 1.138.0 宿主退出码 0。 | Windows 客户端连接 WSL Remote 的 Extension Host 所属、竞争 PHP Provider 检查与持续编码记录。 |
| F02 | [版本矩阵](../version-matrix.md)列出 PHP 7.2–8.5 支持项；历史九版本 CI 见[跨平台候选报告](cross-platform-candidate-2026-09-14.md)。本轮真实 CLI 集成为 7.2/8.1/8.5 三项通过。 | P2 仍有未完成语法/语义项；当前候选的九版本运行时矩阵和完整正反例/未完成输入证据。 |
| F03 | [Winstar/CoreRepo 当前源码 Oracle](p9-linux-qualification-2026-09-23.md)、10k/50k 持久恢复和单条损坏重建通过。 | 两个真实项目的依赖索引均因 10k 文件上限截断；完整 vendor、嵌套 Composer 与多根场景的最终矩阵。 |
| F04 | [1,000 次协议热查询](editing-navigation-linux-x64-2026-09-23.json)验证补全、Hover、Definition 当前符号身份；[Winstar References](winstar-reference-baseline-2026-09-23.md)验证 174 个完整位置。 | 真实大型项目的完整成员/参数提示/导航操作矩阵和 WSL Remote 宿主交互。 |
| F05 | P5 高级类型正反例和主语义包测试已进入仓库 `pnpm check`。 | [路线图 P5](../roadmap.md)仍列一般跨块相关性、动态迭代与复杂引用等未完成范围；逐项 final fixture 覆盖未闭合。 |
| F06 | R1 冻结诊断 corpus 见[首发验收](r1-acceptance-linux-wsl-2026-09-06.md)，索引不完整时的抑制有测试。 | [路线图 P6](../roadmap.md)仍有诊断种类和配置项未完成；全量输入序列、未知及受限索引的最终反例报告。 |
| F07 | Interface/Override/构造函数生成及 import 的保守支持域已在[路线图 P6](../roadmap.md)标记完成。 | 当前候选在三平台打包宿主中的编辑、选区、撤销和原有工作流逐项最终记录。 |
| F08 | 类型 F2 Rename 的[打包宿主证据](declaration-f2-rename-2026-09-14.md)及多种局部重构已存在；private 参数删除已拒绝可能产生可观察求值行为的实参；[Extract Interface 子集](p7-extract-interface-2026-09-23.md)通过真实编辑器应用与 Undo/Redo。 | [路线图 P7](../roadmap.md)两批重构均仍开放；通用修改签名、提取接口、移动成员的支持范围与最终拒绝/预览/取消/撤销矩阵未完成。 |
| F09 | [P8 阶段验收](p8-symfony-doctrine-twig-completion-2026-09-23.md)通过独立 Symfony/Doctrine 支持清单；[Winstar 当前版本只读探针](f09-winstar-framework-probe-2026-09-23.md)覆盖 Symfony 7.4.17 / Doctrine ORM 3.6.8 的静态服务、路由与 Entity 样本。 | 其它框架版本、真实项目动态路由与 Repository 查询边界，以及当前候选的完整编辑器场景矩阵。 |
| F10 | [P8 阶段验收](p8-symfony-doctrine-twig-completion-2026-09-23.md)包括 TwigPlus interop、来源导航与受限跨语言 Rename。 | 当前四份候选与实际 TwigPlus 版本的完整组合及 WSL Remote 人工交互验收。 |
| F11 | Winstar PHP 8.5 项目 PHP CS Fixer 入口及组合证据见[开源 Profile 报告](open-source-profile-linux-wsl-2026-09-06.md)。 | 当前候选的 PHP/Twig 保存、失败、撤销及版本配置三系统矩阵。 |
| F12 | 同一[Profile 报告](open-source-profile-linux-wsl-2026-09-06.md)记录 Xdebug launch 与 PHPUnit 执行。 | 当前候选在隔离示例项目与 WSL Remote 的运行时配置冲突复验。 |
| F13 | [Linux 1k/10k/50k、1,000 次编辑、缓存及局部变更](p9-linux-qualification-2026-09-23.md)均满足冻结预算；历史三平台候选见[跨平台报告](cross-platform-candidate-2026-09-14.md)。 | 当前候选的 Windows/macOS 预算矩阵、真实 WSL Remote 多小时编辑及大项目 CPU/内存记录。 |
| F14 | `pnpm check`、24 包隔离消费、四份 VSIX 内容验证通过；[当前候选清单](p9-alpha-candidate-current-2026-09-23.md)固定扩展 ID 与版本；[公开 manifest 基线](p0-f14-public-manifest-baseline-2026-09-23.md)固定 23 个命令与 30 个设置，打包宿主确认 23 个命令均已注册；[简体中文命令标题](f14-command-localization-2026-09-23.md)专项核对 23 项，[设置说明](f14-setting-localization-2026-09-23.md)专项核对 32 处，[扩展侧运行时界面](f14-runtime-localization-2026-09-23.md)已覆盖常见操作。 | P0 运行行为基线、命令/配置迁移、Language Server/Provider 文案及旧 Profile 升级的最终逐项核验。 |

## 当前退出条件

[路线图](../roadmap.md)仍有 P0、P2–P7 与 P9 的未完成工作项；P8 阶段完成不能替代这些阶段。P9 的全量版本/系统矩阵、全部最终检查和最终交付报告仍未勾选。上述 F01–F14 均保留最终待验状态；报告按现有专项证据确认可用范围，不把历史 CI、合成 fixture、普通 WSL shell 预检或隔离 Linux 宿主扩大成当前候选的 Windows + WSL Remote 人工验收。

下一步按缺口推进：先完成 P7 支持域与拒绝/编辑器操作矩阵，再补当前候选跨平台自动矩阵；真实 Remote Profile、竞争 Provider 和两项目两小时会话按 [Alpha 候选试用](../alpha-candidate.md)记录。公开 Marketplace 发布另行确认。
