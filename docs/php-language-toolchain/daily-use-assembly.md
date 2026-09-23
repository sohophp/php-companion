# SoPHP 日常开发组合方案

日期：2026-09-24。目标是先用 SoPHP 与成熟扩展组成**可开始使用的 PHP 开发环境**，再根据实际缺口逐项改进；[R4 的 PhpStorm 式最终目标](releases.md)保持不变。本方案的“可使用”只适用于已验证的功能和环境，不等于 P0–P9 或 F01–F14 最终验收完成。

## 安装入口与能力所有者

[Open Source Pack](../../packages/php-companion-extension-pack/package.json) 和 [Recommended Pack](../../packages/php-companion-recommended-pack/package.json) 当前声明**同一组**扩展与默认设置。一次 VS Code Profile 只选其中一个 Pack；它已经包含 SoPHP Core 和 SoPHP Symfony，正常从 Marketplace 安装时无需再单独安装一份 Core。私有 Alpha 若 Symfony 扩展尚未公开，则先从**同一候选**安装 Core、Symfony VSIX，再安装其中一个 Pack；不得混用不同候选的 Core 与 Symfony。两个 Pack 不是需要叠加的两层功能。

| 日常任务 | 当前所有者 | 进入首批使用的条件 |
| --- | --- | --- |
| PHP 补全、类型、Hover、参数提示、导航、诊断与受限重构 | SoPHP Core | 一个工作区只启用一个通用 PHP 语言服务；按已声明支持范围使用，危险重构先看完整预览 |
| Symfony 服务、路由、Controller 的可证明上下文 | SoPHP Symfony | 与 Core 同候选；只对已证明的框架事实返回结果，动态配置保持显式边界 |
| Twig 编辑、格式化及模板语言服务 | TwigPlus | Twig 的通用功能由 TwigPlus 独占，SoPHP 只通过已定义的互操作契约提供 PHP 上下文 |
| YAML / XML | Red Hat YAML / Red Hat XML | 语法、schema、格式化由各自扩展负责；Symfony 扩展只贡献框架上下文 |
| JSON、HTML、CSS、JavaScript、TypeScript | VS Code 内建语言服务 | 不另装重复的基础语言服务器；PHP 混合文件另行检验 |
| Git、终端与 Composer 命令 | VS Code 内建 Git/终端及项目 Composer CLI | 依赖安装和脚本继续由项目自身管理，SoPHP 读取 Composer 事实，不另造包管理器 |
| PHP 格式化 | PHP CS Fixer VS Code 扩展 | 只选它作为 PHP 默认 formatter，使用兼容目标 PHP 的项目级 fixer；避免两个保存时格式化入口 |
| 调试、测试 | PHP Debug + PHPUnit & Pest Test Explorer | 项目已配置相应 Xdebug、PHPUnit/Pest；执行 PHP 路径、工作目录及 Remote 映射须正确 |
| 编辑约定、Apache 配置 | EditorConfig + Apache Conf Snippets | 保留现有 Pack 成员；Apache 配置语法由其依赖扩展提供 |

以上是当前 Pack 已声明的组合，具体来源和限制见[外部工具集成](integrations.md)。Pack 无法固定外部扩展的 Marketplace 版本；当前版本升级后仍要重跑组合门禁。现有 R1 Linux/WSL 候选已有基础闭环证据，但当前开发源码中的新修复不会自动进入已经安装的 0.4.5；新候选须在冻结时重新构建和验证。

## 可选增强：先隔离验证，再决定是否纳入 Pack

| 候选 | 可提供的增益 | 准入检查 |
| --- | --- | --- |
| [PHP DocBlocker](https://marketplace.visualstudio.com/items?itemName=neilbrayfield.php-docblocker) | 输入 /** 时生成 DocBlock、补标签和参数模板 | 与 SoPHP 补全/代码生成无重复弹窗或覆盖；PHP 7.2–8.5 声明和未完成输入正确。它只负责写注释，SoPHP 仍解析类型 |
| [PHPStan 扩展](https://marketplace.visualstudio.com/items?itemName=swordev.phpstan)及项目 PHPStan | 项目选择的更深静态分析诊断 | 仅在项目已有兼容的 PHPStan 配置与运行时、用户明确选择时启用；核查重复诊断、自动运行耗时及关闭后的恢复。暂不作为默认 Pack 成员 |

其他候选也走同一门禁：明确能补哪段工作流、许可与维护、PHP/VS Code/WSL 兼容性、唯一能力所有者、自动和真实操作证据、失败后的回退。Symfony Language Tools 0.20.1/0.20.2 已在普通 PHP Rename 中发生 Provider 冲突，目前不进入受支持组合；不能因为它能补部分路由能力就绕过冲突结果。

先保持现有 Pack 清单不变，在隔离 Profile 逐个验证 PHP DocBlocker 和项目自选的 PHPStan；记录功能、冲突与版本后，再决定是否把 PHPDoc 辅助加入默认 Pack。PHPStan 更适合作为显式启用的项目分析入口。数据库管理、容器和 HTTP 客户端可由用户按项目选择，不作为通用 PHP 编码闭环的默认依赖；没有通过组合门禁的候选不写成“稳定成员”。

## 从安装到日常使用

1. **选版本与 Profile。** 对当前已安装的 0.4.5，只使用其已声明的 R1 范围；评估当前源码的新功能时，冻结单一候选并记录 Core/Symfony/Pack 的版本与摘要。在干净 VS Code Profile 中安装一个 Pack。私有候选的安装和预检步骤见[Alpha 试用说明](alpha-candidate.md)。
2. **确认运行位置。** 在 Windows+WSL Remote、SSH 或容器中，检查 SoPHP、Symfony、formatter、PHP Debug 和测试扩展运行于能访问项目 PHP 与 Composer 的 Extension Host；PHP CLI、fixer、测试命令和路径映射使用该环境的实际路径。仅本地安装成功不足以证明 Remote 可用。
3. **确认唯一所有者。** 禁用其它通用 PHP LS；PHP 只由 SoPHP 返回通用补全、Definition、Rename 与诊断。PHP 格式化只由 PHP CS Fixer 提供，Twig 只由 TwigPlus 提供；YAML/XML 的通用语言功能归 Red Hat 扩展。可选静态分析诊断单独标明来源。
4. **用独立 Composer 项目完成日常闭环。** 打开项目和 vendor → 输入并修改尚未保存的 PHP → 补全、Hover、参数提示、定义、实现、引用 → import/生成 → 预览一次受支持 Rename 并撤销 → 编辑 Twig 与 YAML/XML → 格式化 → 运行及调试测试。记录每步的扩展版本、结果、等待、重复 Provider 和失败提示。业务项目只做只读复核，不为编辑器验收修改其代码。
5. **开始受限试用。** 上述闭环通过且已知限制可见时，可用该候选进行日常开发并持续报告问题。动态或歧义 PHP、工作区外公开 API、未完成索引及跨语言编辑按当前支持清单处理；不把候选称为已达到 R4。发现回归时按候选摘要退回上一已验证版本或关闭对应可选增强，保留问题输入与日志。

自动测试和独立示例项目的改进**不等待人工试用**；需要实际 VS Code 操作才能证明的体验、Extension Host 归属及持续使用记录仍是组合资格和 R4 的验收内容。日常源码增量不打包四份 VSIX；仅在冻结新组合候选或真实宿主门禁需要时构建对应产物。

## 与 R2–R4 的关系

- **当前可用组合**先让 PHP 编码、Twig/YAML/XML、格式化、测试和调试形成闭环；它有明确支持范围与限制，不等于完整 PhpStorm。
- **R2** 优先修复这套组合暴露的通用 PHP 类型、导航和诊断缺口，同时评估外部工具是否能更快补足独立能力。
- **R3** 逐项完善安全重构与框架体验；接管某个外部能力前，先比较相同操作输入、准确性、等待与回退，验证更好后才切换默认所有者。稳定外部扩展可以长期保留。
- **R4** 仍按[最终验收](acceptance.md)完成所有承诺的工作流、版本/系统/Remote 矩阵和长时间使用。R4 衡量整体 PHP 开发体验，不要求所有组成部分都由 SoPHP 自研。
