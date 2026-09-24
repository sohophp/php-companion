# Open Source Pack 整理与 SoPHP 下一步

日期：2026-09-25。依据本仓库的 Pack manifest、冻结 Profile 清单及已有隔离宿主报告；未修改业务项目，也未重新打包 VSIX。

## 当前组合

Open Source Pack 是唯一维护的组合安装入口。当前源码 manifest 有 11 个直接成员：SoPHP Core、SoPHP Symfony 和 9 个外部扩展。Pack 负责安装清单及少量默认设置；它不固定 Marketplace 成员版本，也不替代项目自己的 PHP、Composer、Xdebug、PHPUnit 或 PHP CS Fixer 配置。

| 能力所有者 | 扩展 ID | 使用边界 |
| --- | --- | --- |
| 通用 PHP 语义、导航、诊断和受支持重构 | `sohophp.php-companion` | 工作区只启用一个通用 PHP 语言服务；先看重构预览 |
| Symfony 服务、路由和 Controller 上下文 | `sohophp.php-companion-symfony` | 与 Core 使用同一候选 |
| Twig | `sohophp.twig-plus` | Twig 通用编辑能力由 TwigPlus 负责 |
| YAML、XML | `redhat.vscode-yaml`、`redhat.vscode-xml` | 通用语法、Schema 和格式化由各自扩展负责 |
| PHP 调试、测试 | `xdebug.php-debug`、`recca0120.vscode-phpunit` | 项目须提供可用运行时、调试配置和明确测试目录 |
| PHP 格式化、编辑约定 | `junstyle.php-cs-fixer`、`EditorConfig.EditorConfig` | PHP 只设一个默认 formatter；目标 PHP 须能运行项目级 fixer |
| Apache 配置片段 | `eiminsasete.apacheconf-snippets` | 所需 Apache 语法扩展由它自己声明依赖 |
| PHPDoc 注释生成 | `neilbrayfield.php-docblocker` | 负责写注释；Core 负责解析和使用文档类型 |

JSON、HTML、CSS、JavaScript 和 TypeScript 继续使用 VS Code 内建语言能力。PHPStan 是项目自选分析工具，不自动安装。额外通用 PHP Language Server 会与 Core 的编辑能力重叠；Symfony Language Tools 的普通 PHP Rename 冲突尚未解除，因此不进入默认组合。Recommended Pack 不再维护。

## 证据与交付状态

- [默认组合宿主门禁](open-source-pack-composition-gate-2026-09-24.md)验证了当时 10 项私有候选的基础编辑、格式化、测试与调试；当前源码后来增加了 PHP DocBlocker。已冻结 0.4.5 候选不能当作 11 项组合。
- [PHP DocBlocker 组合门禁](php-docblocker-composition-2026-09-24.md)和[完整成员 C3 宿主](open-source-pack-c3-profile-2026-09-24.md)覆盖了当前 11 项源码 Profile 的相应操作。最近的[四文件参数引用与 Rename](c3-parameter-family-references-2026-09-25.md)也通过完整成员宿主。
- 这些是隔离 Linux Extension Host 的自动证据。公开 Marketplace 页面、用户已安装的 VSIX、WSL Remote、跨平台和持续真实编码需分别验收。下一次需要交付 11 项组合时，再同批冻结 Core、Symfony、Pack 和外部成员版本及摘要。

## Core 从哪里开始

**先完成 C3 的 Change Signature 编辑链。** 现有四文件参数家族 Rename 已证明 References、预览、取消、应用和一次 Undo/Redo 能连贯工作；接下来用独立 Composer 夹具按以下顺序实现和验收：

1. 在受支持的方法家族中增加参数，并更新声明、PHPDoc 和可证明的调用；对动态调用、未知实现和工作区外使用者明确拒绝。
2. 删除参数和重排参数，分别处理位置参数与 PHP 8 命名参数；先给完整差异预览，再验证取消、应用及一次 Undo/Redo。
3. 在完整 11 项 Pack 源码 Profile 中复核同一编辑链，并记录准确结果、等待与冲突。只在需要候选交付时打包。

类型生成文件的 Redo 仍有[独立宿主重现](c3-type-generation-undo-redo-probe-2026-09-24.md)：Undo 可删除新文件，随后一次 Redo 未恢复它。这项问题并行做有界调查，不把尚未通过的生成流程计入 C3 完成。C1/C2 的冷查询、长会话与 Remote 证据继续按阶段门槛补齐；R4 的最终目标和组合验收不变。
