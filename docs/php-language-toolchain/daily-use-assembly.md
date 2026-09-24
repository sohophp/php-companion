# SoPHP 日常开发组合方案

日期：2026-09-24。目标是先用 SoPHP 与成熟扩展组成**可开始使用的 PHP 开发环境**，再根据实际缺口逐项改进；[R4 的 PhpStorm 式最终目标](releases.md)保持不变。本方案的“可使用”只适用于已验证的功能和环境，不等于 P0–P9 或 F01–F14 最终验收完成。

## 安装入口与能力所有者

[Open Source Pack](../../packages/php-companion-extension-pack/package.json) 是当前唯一维护的组合安装入口。当前源码清单为 **SoPHP Core、SoPHP Symfony 和 9 个外部扩展**；格式化、调试、测试、Twig、YAML、XML、PHPDoc 生成等功能各有明确所有者。Pack 的 `extensionPack` 只声明扩展 ID，不锁定 Marketplace 上的成员版本；安装成功也不等于运行时组合已验收。当前 Symfony 扩展按私有 Alpha 候选交付，因此试用时应从**同一候选**依次安装 Core、Symfony、Open Source Pack 三份 VSIX，并记录摘要，不把 Marketplace 的旧 Pack 页面当作当前候选。旧版 Recommended Pack 与当前包曾有相同清单；已有用户可卸载旧 Pack，再安装 Open Source Pack，并核对成员扩展。

截至 2026-09-24，公开 Marketplace 的 Open Source Pack 页面仍显示旧版说明；本仓库的 0.4.5 manifest 与冻结 Profile 已核对，但尚无证据表明公开页面提供这一组合。日常试用应以同一私有候选的三个 VSIX 为准。

当前成员清单可直接在 [Pack manifest](../../packages/php-companion-extension-pack/package.json) 核对：`sohophp.php-companion`、`sohophp.php-companion-symfony`、`sohophp.twig-plus`、`redhat.vscode-yaml`、`redhat.vscode-xml`、`xdebug.php-debug`、`recca0120.vscode-phpunit`、`junstyle.php-cs-fixer`、`EditorConfig.EditorConfig`、`eiminsasete.apacheconf-snippets`、`neilbrayfield.php-docblocker`。Apache Conf Snippets 依赖的 Apache 语法扩展由其自身安装。冻结试用版本记录在 [Profile 清单](../../test/extension/open-source-profile.extensions.json)；该文件用于复核，不会锁住 Pack 安装时的 Marketplace 版本。

| 日常任务 | 当前所有者 | 进入首批使用的条件 |
| --- | --- | --- |
| PHP 补全、类型、Hover、参数提示、导航、诊断与受限重构 | SoPHP Core | 一个工作区只启用一个通用 PHP 语言服务；按已声明支持范围使用，危险重构先看完整预览 |
| Symfony 服务、路由、Controller 的可证明上下文 | SoPHP Symfony | 与 Core 同候选；只对已证明的框架事实返回结果，动态配置保持显式边界 |
| Twig 编辑、格式化及模板语言服务 | TwigPlus | Twig 的通用功能由 TwigPlus 独占，SoPHP 只通过已定义的互操作契约提供 PHP 上下文 |
| YAML / XML | Red Hat YAML / Red Hat XML | 语法、schema、格式化由各自扩展负责；Symfony 扩展只贡献框架上下文 |
| JSON、HTML、CSS、JavaScript、TypeScript | VS Code 内建语言服务 | 不另装重复的基础语言服务器；PHP 混合文件另行检验 |
| Git、终端与 Composer 命令 | VS Code 内建 Git/终端及项目 Composer CLI | 依赖安装和脚本继续由项目自身管理，SoPHP 读取 Composer 事实，不另造包管理器 |
| PHP 格式化 | PHP CS Fixer VS Code 扩展 | 只选它作为 PHP 默认 formatter，使用兼容目标 PHP 的项目级 fixer；避免两个保存时格式化入口 |
| PHPDoc 注释生成与标签补全 | PHP DocBlocker | 只负责写注释；SoPHP 负责解析生成的 PHPDoc 类型。PHP 7.2/8.5 的隔离 Profile 已验证常用函数与 `@param` 生成 |
| 调试、测试 | PHP Debug + PHPUnit & Pest Test Explorer | 项目已配置相应 Xdebug、PHPUnit/Pest；执行 PHP 路径、工作目录及 Remote 映射须正确 |
| 编辑约定、Apache 配置 | EditorConfig + Apache Conf Snippets | 保留现有 Pack 成员；Apache 配置语法由其依赖扩展提供 |

以上是当前 Pack 已声明的组合，具体来源和限制见[外部工具集成](integrations.md)。Pack 无法固定外部扩展的 Marketplace 版本；当前版本升级后仍要重跑组合门禁。现有 R1 Linux/WSL 候选已有基础闭环证据，但当前开发源码中的新修复不会自动进入已经安装的 0.4.5；新候选须在冻结时重新构建和验证。

### Open Source Pack 整理结果

| 处理 | 扩展或能力 | 当前依据与使用边界 |
| --- | --- | --- |
| 保留在 Pack | SoPHP Core、SoPHP Symfony、TwigPlus、Red Hat YAML/XML | 组成 PHP 与框架/模板/配置的编辑链；Symfony 仍须与 Core 安装同一私有候选，Pack 的 Marketplace 页面不能替代候选验收 |
| 保留在 Pack | PHP Debug、PHPUnit & Pest Test Explorer | 已有 Linux/WSL 组合运行证据；实际项目仍须提供可用的 PHP、Xdebug 和测试入口 |
| 保留在 Pack | PHP CS Fixer、EditorConfig | 格式化与项目编辑约定各有一个所有者；PHP CS Fixer 扩展自带 PHAR 曾在 PHP 8.5 被拒绝，须使用与目标 PHP 兼容的项目级 fixer |
| 保留在 Pack | Apache Conf Snippets | 用户要求的 Apache 配置片段；其 `mrmlnc.vscode-apache` 依赖由扩展自身声明，Pack 不重复列入 |
| 保留在 Pack | PHP DocBlocker | [完整成员 Profile 的 PHP 7.2/8.5 宿主门禁](reports/php-docblocker-composition-2026-09-24.md)中 `/**` 生成项和 `@param` 标签各只有一个；生成注释由 SoPHP 解析，超出已测语法的结果继续观察 |
| 单独试用 | 项目自选 PHPStan | 需要项目分析配置和兼容运行时；暂不自动安装 |
| 不纳入 | 额外通用 PHP Language Server、Symfony Language Tools | 前者会造成 PHP 能力所有者冲突；后者已有普通 PHP Rename 冲突证据 |

这份整理保留当前 `extensionPack` 清单；它是已选工具的安装入口，不表示每个成员在所有 PHP 版本、系统和 Remote 环境都已通过最终验收。成员版本及其依赖以冻结的 [Profile 清单](../../test/extension/open-source-profile.extensions.json)和候选记录为准。

SoPHP Core 与 Open Source Pack 现在都把 VS Code 内建 `php.suggest.basic` 默认设为 `false`。VS Code 内建 PHP Language Features 原本也提供 Completion、Hover 和参数提示；关闭基础提示后，这三项默认由 SoPHP 负责，隔离 Core 宿主中的 `abs` 函数补全只出现一次。若明确关闭 SoPHP 语言服务器、又希望改用 VS Code 内建 PHP 提示，可在用户或工作区设置显式指定 `"php.suggest.basic": true`。此设置不改变 PHP 语法验证的配置；同版本完整 Pack 的实际安装仍须在候选门禁复核。

## 可选增强：先隔离验证，再决定是否纳入 Pack

| 候选 | 可提供的增益 | 准入检查 |
| --- | --- | --- |
| [PHPStan 扩展](https://marketplace.visualstudio.com/items?itemName=swordev.phpstan)及项目 PHPStan | 项目选择的更深静态分析诊断 | 仅在项目已有兼容的 PHPStan 配置与运行时、用户明确选择时启用；核查重复诊断、自动运行耗时及关闭后的恢复。暂不作为默认 Pack 成员 |

其他候选也走同一门禁：明确能补哪段工作流、许可与维护、PHP/VS Code/WSL 兼容性、唯一能力所有者、自动和真实操作证据、失败后的回退。Symfony Language Tools 0.20.1/0.20.2 已在普通 PHP Rename 中发生 Provider 冲突，目前不进入受支持组合；不能因为它能补部分路由能力就绕过冲突结果。

PHP DocBlocker 已通过 PHP 7.2/8.5 的隔离完整成员 Profile 门禁，因此加入当前源码 Pack；现有已安装候选不会自动获得这个新成员，须待下一次同批候选冻结。PHPStan 更适合作为显式启用的项目分析入口。数据库管理、容器和 HTTP 客户端可由用户按项目选择，不作为通用 PHP 编码闭环的默认依赖；没有通过组合门禁的候选不写成“稳定成员”。

## 从安装到日常使用

1. **选版本与 Profile。** 对当前已安装的 0.4.5，只使用其已声明的 R1 范围；评估当前源码的新功能时，冻结单一候选并记录 Core/Symfony/Pack 的版本与摘要。在干净 VS Code Profile 中安装 Open Source Pack。私有候选的安装和预检步骤见[Alpha 试用说明](alpha-candidate.md)。
2. **确认运行位置。** 在 Windows+WSL Remote、SSH 或容器中，检查 SoPHP、Symfony、formatter、PHP Debug 和测试扩展运行于能访问项目 PHP 与 Composer 的 Extension Host；PHP CLI、fixer、测试命令和路径映射使用该环境的实际路径。仅本地安装成功不足以证明 Remote 可用。
3. **确认唯一所有者。** 禁用其它通用 PHP LS；PHP 只由 SoPHP 返回通用补全、Definition、Rename 与诊断。PHP 格式化只由 PHP CS Fixer 提供，Twig 只由 TwigPlus 提供；YAML/XML 的通用语言功能归 Red Hat 扩展。可选静态分析诊断单独标明来源。
4. **用独立 Composer 项目完成日常闭环。** 打开项目和 vendor → 输入并修改尚未保存的 PHP → 补全、Hover、参数提示、定义、实现、引用 → import/生成 → 预览一次受支持 Rename 并撤销 → 编辑 Twig 与 YAML/XML → 格式化 → 运行及调试测试。记录每步的扩展版本、结果、等待、重复 Provider 和失败提示。业务项目只做只读复核，不为编辑器验收修改其代码。
5. **开始受限试用。** 上述闭环通过且已知限制可见时，可用该候选进行日常开发并持续报告问题。动态或歧义 PHP、工作区外公开 API、未完成索引及跨语言编辑按当前支持清单处理；不把候选称为已达到 R4。发现回归时按候选摘要退回上一已验证版本或关闭对应可选增强，保留问题输入与日志。

自动测试和独立示例项目的改进**不等待人工试用**；需要实际 VS Code 操作才能证明的体验、Extension Host 归属及持续使用记录仍是组合资格和 R4 的验收内容。日常源码增量不打包三份 VSIX；仅在冻结新组合候选或真实宿主门禁需要时构建对应产物。

## 当前整理结论与进入 Core 的顺序

Pack 的成员和默认设置已与 [manifest 单元检查](../../test/unit/extension-pack.test.ts)及冻结 Profile 清单对齐；Apache Conf Snippets 已纳入，Recommended Pack 不再维护。已移出组合的 Symfony Language Tools 设置也从 Pack 默认值和组合测试中清除，见[本轮整理记录](reports/open-source-pack-core-start-2026-09-24.md)。PHP DocBlocker 已加入当前源码 Pack，PHPStan 保持可选。三份 VSIX 已在[隔离 Linux Open Source Profile 组合门禁](reports/open-source-pack-composition-gate-2026-09-24.md)完成默认 `onDemand` 的 Core、Symfony 与外部工具操作，并从干净提交冻结为私有 Alpha 候选；WSL Remote、跨平台及持续使用门槛仍开放。PHP DocBlocker 的源码成员 Profile 已完成单独组合门禁；新 VSIX 候选尚未冻结。

当前 11 项源码组合还可运行 `pnpm test:extension:open-source-profile:source`：预先用 `install:open-source-profile` 安装冻结版本，并设置 `PHP_COMPANION_TEST_EXTENSIONS_DIR`、`PHP_COMPANION_PHP_EXECUTABLE`、`PHP_COMPANION_PHP_CS_FIXER`、`PHP_COMPANION_PHPUNIT_EXECUTABLE`。它在独立临时 Composer 项目和隔离 VS Code Profile 中加载 Core、Symfony、Pack 源码，复用格式化、导航、调试与测试的组合宿主门禁，无需生成 VSIX。2026-09-24 的 11 项源码复测通过；这项结果不能替代下一次候选的 VSIX 安装和 WSL Remote 验收。

| 层次 | 当前可核对的结果 | 下一道门槛 |
| --- | --- | --- |
| Pack 源码 | 11 项清单；Core、Symfony、9 个外部扩展；manifest 检查 4/4 通过 | 保持单一 PHP 语言服务和 formatter 所有权 |
| 已冻结 0.4.5 私有候选 | Core、Symfony、Pack 三份 VSIX 及 8 个当时的外部成员完成隔离 Linux 组合门禁 | 该候选不包含后来加入 Pack 源码的 PHP DocBlocker |
| 当前源码成员组合 | PHP DocBlocker 的 PHP 7.2/8.5 完整成员 Profile 已单独通过；[11 项 Pack 的 C2 编辑链](reports/open-source-pack-c2-local-feedback-2026-09-24.md)在隔离宿主完成 10 轮未保存切换 | 下次冻结候选时，按 11 项记录版本与摘要并复核实际安装和 Extension Host |
| 更广的日常使用 | 独立 Composer 项目的编码、格式化、测试和调试有自动宿主证据 | WSL Remote、Windows/macOS、较长真实使用及项目工具路径仍需验收 |

因此可以按已验的 Linux 隔离宿主范围开始使用现有 Alpha 候选，并把发现的问题继续交给 Core 或对应的外部扩展所有者；不能把仓库当前源码清单等同于已安装的 0.4.5 候选。WSL Remote 的实际 Extension Host 归属仍待验收。下一次只在组合候选冻结时打包 Core、Symfony、Pack，不因每项 Core 修复重复打包。

Core 接下来从 [C2 编辑反馈链](future-core-plan.md)推进：C1 已有未保存编辑、不同 Composer 根、真实 vendor、10k 文件和六项编辑查询的自动及隔离宿主证据，冷查询分布和长会话等退出门槛仍开放。`onDemand` 下当前文件的 `never`、参数和简单 PHPDoc 冲突反馈已修复；[生成后未保存编辑链](reports/c2-generated-phpdoc-flow-2026-09-24.md)验证了补全、Hover、Definition 与局部标量诊断。快速编辑的旧诊断发布也已修复，仍需继续观察可见等待、跨文件类型、复杂 PHPDoc 和长会话。真实 Remote 和跨平台结果进入 C4 验收，R4 最终目标保持开放。

独立 Composer path repository 的[双路径打开回归](reports/c2-dual-path-open-2026-09-24.md)现规定冲突时最近编辑的缓冲区拥有跨文件项目事实，并向用户说明歧义。默认 `onDemand` 的[可证明跨文件参数诊断](reports/c2-ondemand-psr4-literal-diagnostics-2026-09-24.md)已覆盖唯一 PSR-4 类方法、直接或稳定局部标量字面量，以及直接或稳定局部赋值的原生标量方法返回；未保存声明、使用方编辑及 watcher 的诊断往返已有真实 stdio 证据，隔离 VS Code 宿主也观察到诊断撤销和恢复。[局部值 Hover](reports/c2-local-value-hover-2026-09-24.md)补齐了同一类型事实的显示，[完整 Pack 源码组合](reports/open-source-pack-c2-local-feedback-2026-09-24.md)的 10 轮未保存切换也未出现旧 Hover 或旧诊断。复杂控制流、动态返回和仅 PHPDoc 声明的跨文件返回仍保持保守。下一步在更大的独立 Composer 项目观察等待与长期稳定性，并继续核对数组、联合类型的跨能力反馈。人工使用反馈可以并行进入，不阻塞这些独立测试。

### 下一次执行顺序

1. **收稳 Pack 的 11 项源码组合。** 保持当前成员和唯一能力所有者；用冻结 Profile 对照 manifest，并在独立 Composer 项目运行源码组合宿主。PHPStan 保持项目级可选。只在下一次组合候选冻结时，记录固定外部版本、三份同批 VSIX 摘要和实际安装结果；日常 Core 修复无需重打包。
2. **先做 Core C2 的可信类型反馈。** 从已验证的跨文件 PHPDoc 联合数组形状继续，依次检查可选中间键、多层别名和跨调用写入是否会留下过期补全、Hover 或 Definition；对无法证明的值撤销事实。每个修复都覆盖未保存编辑、合法反例，以及补全、Hover、导航和诊断之间的版本一致性。固定两层键写入及动态键撤回已通过完整 Pack 源码宿主，见[报告](reports/c2-cross-file-union-shape-return-2026-09-24.md)。
3. **复核 C1/C2 的等待和长会话。** 复用独立真实 vendor 与约 10k 文件夹具，记录首次可见查询、连续编辑、取消、诊断往返和 RSS；自动宿主门禁先行，真实使用记录随后补齐。若出现旧结果或明显卡顿，优先修复该用户操作，再扩大语义支持范围。
4. **按 C3、C4 的退出证据推进。** 高频重构逐项验证预览、应用、取消和 Undo/Redo；组合候选再验证 WSL Remote、跨平台、PHP 版本矩阵和长期使用。R4 的整体体验目标保持开放。

## 与 R2–R4 的关系

- **当前可用组合**先让 PHP 编码、Twig/YAML/XML、格式化、测试和调试形成闭环；它有明确支持范围与限制，不等于完整 PhpStorm。
- **R2** 优先修复这套组合暴露的通用 PHP 类型、导航和诊断缺口，同时评估外部工具是否能更快补足独立能力。
- **R3** 逐项完善安全重构与框架体验；接管某个外部能力前，先比较相同操作输入、准确性、等待与回退，验证更好后才切换默认所有者。稳定外部扩展可以长期保留。
- **R4** 仍按[最终验收](acceptance.md)完成所有承诺的工作流、版本/系统/Remote 矩阵和长时间使用。R4 衡量整体 PHP 开发体验，不要求所有组成部分都由 SoPHP 自研。
