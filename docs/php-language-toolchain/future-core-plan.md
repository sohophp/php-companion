# SoPHP 核心功能后续计划

日期：2026-09-24。本文按用户在 VS Code 中完成 PHP 工作的顺序组织 C1–C4；[长期工程路线图](roadmap.md)记录 P0–P9 的技术任务，[最终验收](acceptance.md)记录 F01–F14 的门槛，实际完成情况以[实施状态](status.md)和测试报告为准。

## 目标体验

在独立 Composer PHP 项目中，用户打开文件后能立即开始编码：补全给出相关候选，参数提示和 Hover 能解释当前调用，跳转与查找引用能准确找到声明和使用处；修改代码时，诊断跟随未保存内容更新，导入、生成和重构能预览、应用和撤销。跨文件、跨 namespace、Trait/继承、vendor 与多根项目仍保持一致。遇到动态 PHP 或不完整索引时，SoPHP 应说明可用范围或拒绝危险操作，不能显示看似确定的错误结果。

“向 PhpStorm 学习”指学习其常用 PHP 编码操作的**连贯性、结果质量和反馈方式**，并在 VS Code 中完成同一类任务；不以功能菜单数量、内部模型复杂度或逐项复制 PhpStorm 界面衡量。每项能力都从用户操作开始验收，包含结果、等待时间、失败提示与恢复路径。已有能力先通过真实编辑器工作流审计，再决定是否扩展语义支持域。

产品交付先组装并验证成熟扩展与 VS Code 内建能力，让完整开发流程尽早可用。对尚缺的体验先评估外部提供者；只有记录了不稳定、冲突或明显体验缺口，并验证 SoPHP 替代方案更好时，才逐项接管。成熟且稳定的提供者可以长期保留，不把全部能力自研当作 R2–R4 的前提。同一编辑能力须有明确所有者，避免多个扩展同时返回互相冲突的结果。

可先开始使用的安装组合、可选增强及回退步骤见[日常开发组合方案](daily-use-assembly.md)。

Core 负责通用 PHP 7.2–8.5 的解析、PHPDoc、Composer、内建符号、类型、LSP 和 PHP 编辑计划。Symfony 服务/路由/Controller 由独立 SoPHP Symfony 扩展负责；Doctrine 当前由独立 framework-doctrine 包提供事实并被语言服务器消费；Twig 由 twig-plus 负责，格式化、调试、测试继续由已选工具负责。这些能力的组合体验仍须验收，但框架功能本身不计入 C1–C4 的通用 PHP 核心完成度。开发中使用独立 PHP 项目；不修改 Winstar 或其他被测业务项目代码。

## 当前起点

- R1 的 S01–S08 已有 Linux/WSL 首发候选证据，基础 LSP、Composer 索引、部分类型推断和编辑操作已经存在；P0、P2、P4–P7、P9 的完整支持域和最终验收仍开放。
- 语义快照 schema 82 的 Linux x64 合成项目索引、热缓存和编辑基准满足冻结预算，见[复测报告](reports/p9-schema82-linux-benchmarks-2026-09-23.md)；这些数据尚不能证明真实 VS Code 操作、Windows/macOS 或 WSL Remote 长时间体验。
- F04 已有 References 的编号正例、文本反例、未完成输入和文件顶层赋值回归；补全、Hover、参数提示、定义、实现、引用的联合编辑流程仍缺完整证据。[P9 审计](reports/p9-acceptance-audit-2026-09-23.md)记录其余缺口。

## 按体验交付的阶段

| 阶段 | 用户可以完成的任务 | 优先解决的问题 | 退出证据 |
| --- | --- | --- | --- |
| C1：真实编码基线 | 打开独立 Composer 项目，输入成员和调用，查看类型/参数，跳转声明并查找引用；改动尚未保存的文件后继续操作 | 把补全、Hover、Signature Help、Definition、Implementation、References 串成同一工作流；修正错误候选、错误落点、旧版本结果、同名符号混淆及明显卡顿。审计 parser/index 事实和缓存契约，只修复工作流暴露的缺口 | 编号独立项目的正例、合法反例和未完成输入通过真实 stdio；对应操作在干净 VS Code Extension Host 中逐步完成并记录可见结果、延迟及失败。至少覆盖 PHP 7.2、8.1、8.5 锚点，再扩充版本矩阵 |
| C2：理解代码并给出有用反馈 | 沿赋值、返回、集合、PHPDoc 和控制流读懂常用代码；诊断能指出可证明的错误，快速输入不闪现旧错误或大量伪错误 | 让同一类型事实驱动补全、Hover、参数提示、导航和诊断；审计已有 phpdoc AST，并评估成熟解析库对缺失语法的复用价值，再按真实场景补内建签名、类型传播和合流。对未知、动态、未完成索引给出可理解的状态 | 真实编辑序列检验提示内容、诊断出现和消失、取消/重启后的一致性；跨版本正反例、缓存和增量回归通过，记录漏报、误报及 unknown 范围 |
| C3：放心修改代码 | 导入或生成代码，Rename、Safe Move、提取及修改签名；先看到完整变更，确认后应用，必要时一次 Undo/Redo 恢复 | 以“选中目标→预览→应用/取消→撤销”为单位完善 P6–P7；明确支持域、冲突、工作区外引用和动态调用的提示。先完成高频 Rename/import/生成，再扩展 Extract、Move 和 Change Signature | 每个受支持操作在真实编辑器中完成预览、应用、取消和 Undo/Redo；歧义、版本过期、不完整索引、危险跨文件修改有明确拒绝理由；编号反例证明不会静默漏改 |
| C4：持续使用资格 | 在不同 PHP 版本、平台及真实规模项目中持续编码，重启或缓存损坏后仍能恢复；只有一个通用 PHP 语言服务负责结果 | 完成九个 PHP 次版本、Windows/Linux/macOS、Windows+WSL Remote、1k/10k/50k、长时间编辑、缓存损坏、命令/设置迁移与本地化矩阵；完成 Core 与既定外部工具的组合边界验证 | 冻结性能预算不放宽；源码、真实 LSP、Extension Host、人工操作分别留报告，逐项关闭核心 F01–F08/F13–F14；交付可安装候选、支持清单、限制、安装和回退说明 |

C1–C4 是交付顺序，不要求把每阶段的底层代码推迟到对应阶段。C2/C3 已完成的子集直接复用并验证。每阶段同时看**用户能否完成任务、结果是否准确、等待和反馈是否可接受**；测试数量或内部模型覆盖率不能单独证明体验达标。PhpStorm 可作为操作体验的参照，但 SoPHP 的支持范围以公开矩阵和自身证据为准。

PHPDoc 注释生成和标签输入可由独立 VS Code 扩展提供；Core 已有独立的 phpdoc AST 包，仍需把文档类型与项目符号、增量修改、补全、导航和诊断关联。选用外部解析库前比较语法覆盖、源码范围、未完成输入、进程调用成本及许可证；不把“重写 PHPDoc 解析器”作为预设任务。

## 下一批具体任务

**当前执行起点是 C2 的编辑反馈链。** C1 已有独立 Composer 项目、真实依赖树、10k 文件和隔离宿主的六项查询与可见补全证据，但冷查询等待分布、长期会话、Remote 和跨平台验收仍开放。C2 快速编辑的旧诊断已修复；[逐段计时](reports/c2-rapid-diagnostic-version-2026-09-24.md)发现旧版本通知排队使诊断短暂清空 268–319 ms。文档变化后的诊断分析现合并 25 ms，三轮相同宿主复测把空白缩至 64–100 ms；单次编辑、快速连续输入和关闭文件的通知边界已有定向 stdio 证据。[跨文件诊断往返](reports/c2-cross-file-diagnostics-2026-09-24.md)现覆盖已完成索引的两个文件：未保存声明改变及关闭恢复时，使用方的参数类型错误会同步撤销和重现，参数提示与诊断使用相同签名事实。[打开文件数量基准](reports/c2-related-diagnostics-scale-2026-09-24.md)在 80/128 个文件时将真正受影响使用方的本机等待从 256/372 ms 降到约 95/98 ms，并避免无关诊断重复通知。下一步检查更多诊断类型、默认 `onDemand` 的可证明范围、复杂文件和长会话，再检查 PHPDoc、补全、Hover、导航和诊断是否消费同一版本的类型事实。C1 未关闭的门槛与 C3/C4 继续在各自阶段验收，不因单个业务项目或 Symfony Provider 的缺口改变 Core 优先级。Open Source Pack 当前源码为 11 项，PHP DocBlocker 已通过 PHP 7.2/8.5 的完整成员 Profile 首轮门禁；PHPStan 继续按项目单独验收，详见[日常开发组合方案](daily-use-assembly.md)。

截至 2026-09-24，F04-NAV-01–13 已用独立 Composer 项目验证接口、未保存类型切换、未完成成员输入、跨 namespace 父类与同名短类、跨文件 Trait 优先级和别名、外部声明变更后的索引失效，以及进行中查询的取消、版本隔离和同版本重新打开防护。F04-HOST-01 又在隔离 VS Code Core 宿主中，以 auto、PHP 7.2、8.1、8.5 设置完成六项编辑请求及未保存切换后的完整查询链；F02-VERSION-01 用同一版本文件验证了 `match`、`enum`、`(void)` 的版本诊断。查询版本保护已统一覆盖主要异步边界。Pack 组合、Remote、跨平台和持续使用按后续门槛执行。Symfony 或单个业务项目特例不决定通用 Core 的优先级。

**现在从这里继续：**References、Implementation 已有实际候选扫描期间的未保存编辑证据；Completion、Hover、Signature Help 和 Definition 也已通过测试模式中的可控暂停点验证新旧版本分离，并修复可变文档版本比较错误。隔离 VS Code Core 宿主在 auto、PHP 7.2、8.1、8.5 设置下完成未保存接收者切换前后的六项编辑查询，也完成小型 Composer vendor 与双根工作区的六项查询链。不同根使用不同显式 PHP 版本时，诊断、内建补全与六项查询已分别验证；auto 的 Composer 解析版本现已传入服务器，运行中 Composer 平台或显式版本变更后的诊断与补全也可更新。嵌套 Composer 项目现可在 onDemand 下按文件发现并隔离版本和符号，已安装 vendor 包保留父项目归属。配置运行时、PATH 自动发现与路径仓库符号链接已有独立证据；虚拟内建声明文档的跨根 PHP 7.2/8.5 版本显示也已通过隔离宿主。其它系统、真实依赖树和长期会话仍需验收。Completion/Hover 的偶发长等待发生在服务器处理计时之外，Language Client 轻量往返也未复现长等待；可见建议列表的本地基线已建立，默认 10,000 文件预算下已安装依赖 Implementation 候选被无关项目文件挤掉的问题已有快速 `rg` 与有界可移植预筛路径；下一步扩大 vendor、未完成输入和长时间会话等 C1 场景，最后按退出证据判断 C1 是否可关闭。C2 随后以类型与诊断反馈为重点；PHPDoc 生成交由 Pack 中的 PHP DocBlocker，Core 继续补类型消费和语义一致性。Open Source Pack 当前源码为 11 项清单，冻结候选时再做完整组合门禁，不因每次 Core 源码增量重打三份 VSIX。

本轮 Pack 清单与默认值复核见[整理记录](reports/open-source-pack-core-start-2026-09-24.md)。Core 接下来的执行顺序是：已用[Implementation 候选预算正反例](reports/c1-implementation-candidate-budget-2026-09-24.md)修复 10,000 文件边界，并加入有界可移植搜索；随后扩展隔离宿主中的可见建议等待分布、未完成输入、跨环境版本探测及较大 vendor 树。path repository 的链接路径与真实路径 References 已有[真实 stdio 正反例](reports/c1-path-repository-2026-09-24.md)；配置 PHP 8.1 可执行文件的[宿主证据](reports/c1-configured-runtime-2026-09-24.md)与无配置时优先 PATH `php` 的[宿主证据](reports/c1-path-php-version-2026-09-24.md)均已具备。键入到建议列表可见的[本地基线](reports/c1-visible-completion-2026-09-24.md)、[1,000 文件合成 vendor 树基线](reports/c1-vendor-visible-completion-2026-09-24.md)和[同缓冲区未保存类型往返](reports/c1-unsaved-visible-completion-2026-09-24.md)已建立；同一未保存缓冲区连续 10 轮 A/B 类型切换与快速键入已有[可见候选证据](reports/c1-rapid-unsaved-completion-2026-09-24.md)；锁定的 Guzzle、Monolog 与 Symfony HttpFoundation [真实 Composer 依赖树](reports/c1-real-composer-vendor-2026-09-24.md)已覆盖首批六项查询及未保存类型切换；锁定的真实依赖树现扩至 1,029 个 PHP 文件，并在隔离宿主中完成[六种真实 vendor 类型的可见建议](reports/c1-real-composer-vendor-2026-09-24.md)正反例；10,130 文件候选预算问题已修复，50,000 个 autoload PHP 文件的按需 Implementation 找到了正确落点，超过边界会明确报告搜索不完整，见[实施报告](reports/c1-implementation-candidate-budget-2026-09-24.md)；10,130 文件项目的 Implementation 与 References 已在同一未保存缓冲区完成[连续 100 轮](reports/c1-implementation-references-session-2026-09-24.md)正确性、等待与 RSS 采样；隔离 VS Code Core 宿主也在该规模完成[六项查询与六种真实 vendor 可见建议](reports/c1-real-composer-10k-host-2026-09-24.md)；已修复已打开文件监视事件触发的重复扫描，两轮 10k 宿主冷 Implementation 从约 2.5 秒降至约 1.4 秒，见[宿主报告](reports/c1-real-composer-10k-host-2026-09-24.md)；仍需测数小时会话、跨平台与 Remote，并继续观察冷查询等待分布。自动发现运行时的跨环境结果也开放。每项都要同时覆盖未保存编辑和错误归属的反例。完成后用冻结的 Core、Symfony、Pack 及外部版本做一次完整组合门禁，再决定 C1 是否达到日常使用基线。人工持续编码反馈可以并行到来，不阻塞这些自动化工作。

新增进展：10,130 文件隔离宿主完成两轮各 100 次和一轮 1000 次未保存类型切换的可见候选检查，均无旧方法候选；1000 轮的 P95 为 215 ms，约四分钟会话的 RSS 采样没有持续增长。Composer 监视事件曾使无关工作区根也重新索引；现已收窄刷新范围，并保留跨文件夹路径依赖的全量回退，双根真实 stdio 正反例与 10k 宿主通过。一次更早的嵌套 Composer 项目 Definition 超时未能确定具体成因，继续观察并保留失败结果记录，见[宿主报告](reports/c1-real-composer-10k-host-2026-09-24.md)。

同一 10,130 文件宿主又完成真实 PSR Response/Request 接口与 Guzzle 实现之间的 50 轮未保存切换，六项编辑查询共 300 次均返回正确目标。Completion、Hover、Signature Help、Definition 的首轮 P95 为 31、14、8、10 ms；Implementation 与 References 原先因每轮候选重扫，P95 分别为 829、743 ms。Implementation 已以打开缓冲区完整更新和项目版本条件复用先前完成的候选覆盖，P95 降至 7 ms；References 随后按文件刷新接收者证据并复用扫描覆盖，完整 stdio 正反例与 10k 隔离宿主 50 轮复测通过，P95 从上一轮 762 ms 降至 132 ms。冷查询、较长会话、跨平台/Remote 和冻结版本的完整组合验收仍是 C1 门槛。正反例与宿主结果见[宿主报告](reports/c1-real-composer-10k-host-2026-09-24.md)。

Open Source Pack 现有独立的[默认组合宿主门禁](reports/open-source-pack-composition-gate-2026-09-24.md)：本机 Linux 隔离 Profile 加载 Core、Symfony、Pack 与冻结外部扩展，按 Pack 默认 `onDemand` 实际完成 PHP/Symfony 导航和引用、格式化、调试与 PHPUnit 操作。干净 Alpha 候选与独立 PHP 7.2 Composer 项目的确定性预检已通过。下一步按以下顺序推进，避免把单个 Symfony 项目当作 Core 需求来源：

1. **C1 冷启动和持续编辑。** [首轮冷查询](reports/c1-cold-first-query-2026-09-24.md)发现并修复了激活完成早于 Provider 注册导致首次 References 返回空结果；10k 独立项目中首次 References/Implementation 现能一次取得正确位置。继续记录空缓存、后台准备后与重载后的可见等待，并用较长会话重复未保存编辑的六项查询与建议显示，定位超时、旧结果或内存增长。先复用现有 1k/10k/真实 vendor 夹具。
2. **C2 类型与诊断一致性。** [当前文件的 `never` 漏报](reports/c2-ondemand-local-never-2026-09-24.md)已在 `onDemand` 下修复并通过独立宿主；未保存地改成 `void` 再恢复 `never` 时，诊断完成 10 → 7 → 10 往返。[快速编辑的旧诊断发布](reports/c2-rapid-diagnostic-version-2026-09-24.md)已通过带版本接收与编辑时撤下旧集合修复。[同文件参数诊断](reports/c2-ondemand-local-arguments-2026-09-24.md)在默认 `onDemand` 下已通过 PHP 7.2/8.5 的真实 stdio 与 PHP 8.5 隔离宿主；[PHP 8 同文件错误命名参数](reports/c2-ondemand-local-named-arguments-2026-09-24.md)也已在默认模式下通过 stdio 与宿主的未保存修复往返。[跨文件参数类型诊断](reports/c2-cross-file-diagnostics-2026-09-24.md)在完整索引下已有未保存编辑和关闭恢复的往返证据，其它事实仍要求完整证明。继续审计补全、Hover、导航和诊断是否消费同一版本的类型事实，尤其检查索引状态变化、清空等待与长会话。PHPDoc 注释生成已由 Pack 中的 PHP DocBlocker 提供；[生成后未保存类型切换](reports/c2-generated-phpdoc-flow-2026-09-24.md)已在 PHP 7.2/8.5 完整成员宿主验证补全、Hover、Definition、局部标量冲突诊断，以及 `list<A|B>` 只暴露共有成员。下一步按日常代码频率检查数组形状、嵌套泛型及返回值经赋值传播时的同一事实，再处理可证明的缺口；复杂泛型关系和长会话仍开放。
3. **C3 和 C4 顺序验收。** C1/C2 的高频工作流稳定后，逐项检查 Rename、导入、生成和其它工作区编辑的预览/撤销；[私有参数重构的无关同名方法误挡](reports/c3-private-parameter-owner-2026-09-24.md)已修复，源码宿主套件现能执行并撤销该动作。C4 再验证 WSL Remote 的 Extension Host 与工具路径、Windows/macOS、PHP 版本矩阵和长时间真实使用。Pack 成员仅在外部扩展通过独立准入门禁后调整。

C2 的[本轮 PHPDoc 类型反馈](reports/c2-generated-phpdoc-flow-2026-09-24.md)又覆盖嵌套 `list<list<A|B>>` 经过返回、赋值和两层迭代的公共成员，以及联合数组形状的共有键和缺失键。下一步针对常见函数返回值与局部赋值，检查补全、Hover、Definition 和诊断是否同时遵循这些类型事实；先修复用户可见的错误结果，再扩大语法支持域。

联合数组形状的共有键现已在完整 Pack 宿主验证补全、Hover、Definition 与同文件参数类型诊断；缺失键和数组写入后的不确定结果保持保守。下一步把同一编辑链扩至跨文件函数返回、未保存声明变化和默认 `onDemand` 的诊断撤销，继续检查实际等待和结果版本一致性。

[跨文件 PHPDoc 返回编辑链](reports/c2-cross-file-phpdoc-return-2026-09-24.md)现覆盖完整索引和 `onDemand` 中已打开声明的补全、Definition 切换；完整索引下使用方诊断也同步撤销与恢复。当前 11 项 Open Source Pack 的源码组合宿主进一步验证了未保存声明切换后的补全、旧 Definition 撤销，以及未保存使用方改写后的新 Definition 和 Hover。`onDemand` 关闭未保存声明后已能恢复磁盘类型，并响应后续 watcher 更新；跨文件类型诊断仍需完整证明才发布。下一步检查大量关闭文件的缓存上限、跨根依赖与未保存使用方并发编辑的结果版本，再决定哪些跨文件事实能安全扩大按需诊断范围。

使用方连续未保存编辑的版本 3 反馈和关闭后立即重开的诊断保留，已有真实 stdio 回归。C2 接下来优先检查大量关闭文件的缓存上限与跨根依赖，再在独立 Composer 项目的长会话中观察持续编辑的内存、等待与结果版本。

[按需缓存与嵌套根回归](reports/c2-ondemand-root-cache-2026-09-24.md)现证明 257 次关闭后的 256 文件上限及重新打开后的淘汰顺序，并修复了新建子 Composer 项目时父项目残留子项目 PHPDoc 事实的问题。下一步在独立项目中检查较长会话的内存与等待分布，以及路径依赖、符号链接跨根关系在未保存编辑和文件监视事件交错时的结果；随后回到可证明的跨文件诊断范围。

[5,000 轮 C2 编辑序列](reports/c2-session-retained-tree-2026-09-24.md)发现并修复关闭文件时未释放保留语法树造成的 RSS 增长；默认 `onDemand` 的跨文件 PHPDoc 补全、Hover、Definition 及磁盘恢复在修复前后均无旧结果，修复后五段 RSS 均值基本持平。接下来继续处理路径依赖/符号链接和 watcher 交错，并在更大的独立 Composer 项目、完整 Pack 与真实 Extension Host 中检查等待和长时间内存；这些证据不能由小项目 stdio 基准替代。

[路径仓库编辑与监视回归](reports/c2-path-repository-edits-2026-09-24.md)现覆盖真实路径未保存编辑、安装链接路径的磁盘更新、打开缓冲区优先、反向监视与删除清理。[双路径同时打开回归](reports/c2-dual-path-open-2026-09-24.md)进一步让最近编辑的缓冲区拥有跨文件项目事实，冲突时给出一次警告，并在关闭后逐级恢复另一打开缓冲区和磁盘。[按需跨文件参数诊断](reports/c2-ondemand-psr4-literal-diagnostics-2026-09-24.md)现对唯一 PSR-4 类方法、直接或稳定局部标量字面量，以及封闭的调用目标发布可证明错误；调用目标可由 `final class`、`final` 方法或同一代码块内直接 `new` 的精确接收者证明。隔离 VS Code 宿主已观察到未保存编辑的诊断有 → 无 → 有与参数提示更新。两个 PSR-4 候选路径及跨文件 PHPDoc 返回传播继续保守。下一步验证更多参数来源、较大 Composer 项目和完整 Pack 宿主中的等待与长期稳定性。

[局部字面量变量来源](reports/c2-ondemand-local-literal-source-2026-09-24.md)现纳入同一按需跨文件参数诊断证明链；隔离编辑器宿主已验证未保存编辑后的诊断出现、撤销和恢复，函数改写保持保守。[双路径局部查询](reports/c2-dual-path-open-2026-09-24.md)现让非事实所有者标签页继续读取自己的未保存内容，同时保持跨文件项目事实归属；隔离宿主已验证项目补全与局部 Hover、补全、Definition 分别使用正确的版本。[规模基准](reports/c2-alias-query-scale-2026-09-24.md)发现并消除了重复解析项目源码及空移除误触发重建造成的等待；1,024 文件、20 轮隔离 stdio 的所有者编辑后 Hover P95 约 1.7 ms，隔离宿主 10 轮本机样本 P95 为 5 ms，两边均核对项目所有者与局部结果。下一步检查完整 Pack 与 WSL Remote 的连续编辑，并在真实长期使用中测量等待分布与取消响应；条件赋值和跨文件返回传播须分别建立可靠来源证明后才能扩展。

1. 在 SoPHP 仓库建立独立 Composer 示例项目和可重复的编辑序列：打开 PHP 文件 → 成员补全 → 参数提示 → Hover → Definition → Implementation → References → 修改未保存内容后重复查询。记录候选、落点、等待时间和错误反馈，作为 C1 基线。先用真实 stdio 自动化完成可重复部分，不等待人工试用。
2. 为这条序列补齐 F04 编号输入，覆盖有类型接收者、文件顶层变量、跨文件类、同名无关符号、Trait/继承、namespace/use、未完成输入及未保存版本；断言精确候选、位置和失效后的新结果。现有 F04-REF 夹具直接复用，不重复造一套。
3. 按用户可见影响排序：错误结果或旧结果 → 缺失的高频结果 → 明显延迟与缺少进度反馈。对每个问题追溯 parser/index 事实、作用域、完整性、失效条件与 schema；一次只修复可证明的场景，同时验证合法反例。
4. 每个修复先跑语义与真实 LSP 定向回归；受影响的能力再做隔离 VS Code Extension Host 操作验证。阶段冻结时才检查完整组合、跨平台和 Remote；业务项目只用于只读对照与性能观测，不修改其代码。

C1 首个交付物是上述操作序列及缺口清单；清单形成后按实测问题推进 C1 修复，再进入 C2 的类型和诊断闭环。R3 重构与 R4 最终验收目标保持不变。

日常增量只运行相关包测试、类型检查、Lint 和定向 stdio；影响 parser、索引或缓存时追加相应完整回归及性能基准。**不为每个增量打包三份 VSIX**；真实 Extension Host 门禁只构建所需的 Core 候选，组合或发布门禁再构建相应扩展。

## 完成判定与排期

每个阶段的完成证据包含真实操作、精确结果、合法反例、未完成输入、缓存/增量一致性和用户可理解的失败反馈。C1–C4 与[最终验收](acceptance.md)中的核心条目都关闭后，才能称 SoPHP 核心开发完成。Symfony/Doctrine/Twig 与辅助工具的组合验收继续按 P8、F09–F12 完成；公开发布另行确认。

此前按技术分层给出的 C1–C4 工期不直接适用于本体验顺序。先完成 C1 的真实操作基线并统计缺口，再用实测的问题规模重估余下阶段；估算仍应分别列开发工作量、平台验证等待及框架扩展范围。
