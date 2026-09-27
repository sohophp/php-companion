# SoPHP 核心功能后续计划

2026-09-27 当前交付点：[0.4.8 私有冻结候选](reports/open-source-pack-048-private-alpha-2026-09-27.md)在 `cbd82a72` 将 Core、Symfony、10 项 Open Source Pack 组合打成同批三份 VSIX，并通过隔离 Linux 的完整组合与 C3 打包宿主。真实 WSL Remote Profile 的安装、宿主位置和完整操作链仍待验收；日常增量不重复打包。[当前 Pack 整理和 Core 起点](reports/open-source-pack-current-priority-2026-09-27.md)是执行入口。下方较早的候选与 Redo 描述保留为阶段记录。

日期：2026-09-24。本文按用户在 VS Code 中完成 PHP 工作的顺序组织 C1–C4；[长期工程路线图](roadmap.md)记录 P0–P9 的技术任务，[最终验收](acceptance.md)记录 F01–F14 的门槛，实际完成情况以[实施状态](status.md)和测试报告为准。

## 当前执行顺序

2026-09-25 最新进展：[类型生成的一次 Undo/Redo](reports/c3-type-generation-staged-redo-2026-09-25.md)已在 VS Code 1.139.0 Linux 的独立与当前 10 项 Pack 源码宿主通过，包括原本不存在的目标父目录。下方“生成文件 Redo 未恢复”的段落记录此前直接 `createFile` 路径的历史状态；当前回退路径、跨平台、真实 WSL Remote、安装候选、临时文件清理和 Undo 后空目录仍需验收。C1/C2 的可见错误与等待、C3 其余高频编辑链和 C4 整体门槛继续按本节顺序推进。

2026-09-25 更新：先按 [Open Source Pack 整理与 SoPHP 起点](reports/open-source-pack-next-core-2026-09-25.md)使用固定的 10 项组合，明确各能力所有者、项目工具路径和独立 Composer 项目门禁。[私有候选 21977ee1](reports/alpha-21977ee1-packaged-profile-2026-09-25.md)已完成同批三份 VSIX 的隔离安装检查；真实 WSL Remote 仍待验。[C3 的 `if / elseif / else` 同一局部输出](reports/c3-extract-method-if-else-output-2026-09-25.md)、[完整条件返回](reports/c3-extract-method-conditional-return-2026-09-25.md)、[提前返回加最终返回](reports/c3-extract-method-guard-return-2026-09-25.md)和[静态方法提取](reports/c3-extract-method-static-2026-09-25.md)已通过完整 Pack 源码宿主；后三项尚未进入该候选。C1/C2 有可复现的用户可见错误时优先修复。新文件生成 Redo 只有取得新的资源撤销栈线索才重开调查。日常增量不重复打包 VSIX，真实安装和 Remote 属于 C4。

这条 C3 主线现已完成[双标量变量 echo 的 Extract Method](reports/c3-extract-method-scalar-echo-pair-2026-09-25.md)源码组合宿主验收。下一项继续覆盖常用且可证明输入、输出关系的语句提取；对象转换、引用与副作用顺序未证明时保持拒绝。

[末尾 return 与连续语句提取](reports/c3-extract-method-return-sequence-2026-09-25.md)现也通过有类型和无类型两种返回的完整 Pack 宿主门禁。下一项 C3 工作应转向复杂控制流或多输出的明确用户场景，并继续解决生成新文件的资源 Redo；只在具备可验证语义与编辑器操作链时扩大支持范围。

[独立局部变量的双输出提取](reports/c3-extract-method-multiple-outputs-2026-09-25.md)已通过完整 Pack 源码宿主，并补齐解构后的必有数组位置类型反馈。下一步继续覆盖跨分支或部分输出的可证明场景；资源 Redo 等待上游公开路由证据，不能用重复焦点探针替代修复。

同一提取流程现能在一个输出类型未知时保留其它已知位置的 Hover；三个独立输出的顺序和类型在语义层通过。跨分支控制流仍是下一项 C3 设计与验证目标，不把它归入已完成范围。

1. **继续 C3 高频编辑的剩余阻断项。** Import、生成类型、Safe Move、Extract、Inline 和[私有参数移除](reports/c3-private-signature-preview-2026-09-24.md)已有预览和旧版本保护；当前 10 项 Pack 的 [C3 源码宿主](reports/open-source-pack-next-core-2026-09-25.md)已通过组合操作。下一项实现扩大 Extract Method 的可证明场景，并验证真实预览、应用及一次 Undo/Redo。Rename 已补上[关闭预览即拒绝应用](reports/c3-rename-preview-close-2026-09-24.md)和多组预览固定；[Extract、Safe Move 与 Optimize Imports](reports/c3-preview-close-all-2026-09-25.md)也会在预览被关闭时取消应用。[跨接口参数家族的 References 与 Rename](reports/c3-parameter-family-references-2026-09-25.md)、[新增参数](reports/c3-add-method-family-parameter-2026-09-25.md)、[删除参数](reports/c3-remove-method-family-parameter-2026-09-25.md)和[参数重排](reports/c3-reorder-method-family-parameters-2026-09-25.md)均已有宿主预览、取消、应用及一次 Undo/Redo 证据。Import 应用失败、Rename 和 Safe Move 预览前的磁盘并发变化也已有受控回归。生成新文件的 Redo 仍是独立阻断项，出现新的资源撤销栈线索时再调查。原版 PHPUnit 测试视图的文件 Rename 异常按 Pack 使用边界单独跟踪。
2. **保留 C2 日常编码反馈和 C1 导航门槛。** [当前 10 项 Pack 的真实 vendor 组合链](reports/open-source-pack-10-real-vendor-c2-2026-09-25.md)已完成 200 轮标量及 30 轮联合形状未保存切换；[49,000 文件 References](reports/c1-cold-candidate-scan-2026-09-25.md)已保留逐文件元数据检查，五个独立 Linux 源码宿主首次查询均返回两个正确位置，命令等待中位 1325 ms、五样本 P95 1496 ms；100 轮温态结果稳定，命令 P95 为 177 ms。独立 Composer 项目和当前 Pack 源码 Profile 中继续检查取消、关闭和 watcher 与未保存输入重叠时的补全、参数提示、Hover、定义、诊断与 References；发现可复现的错误或明显等待时优先修复。数小时会话、跨平台和 Remote 不由短时本机测试代替。
3. **候选冻结时做 C4 组合门禁。** 固定 Core、Symfony、Pack 三份 VSIX 与外部扩展版本，再查唯一能力所有者、安装位置、PHP CLI/调试/测试路径和回退。日常 Core 增量只做定向构建及测试，不重复打包三份 VSIX。

2026-09-25 进度：C3 的 Import 应用失败、Rename 和 Safe Move 的预览前磁盘变动及未保存关联文件背后写盘已在独立宿主做受控回归。C3 新文件创建的一次 Redo 仍是单列阻断项，待找到可验证的 VS Code 资源撤销路径后继续；C4 仅在冻结新候选时做完整安装门禁。

[新文件生成 Redo 的 1.138.0 对照](reports/c3-type-generation-undo-redo-probe-2026-09-24.md)与 1.139.0 一样未恢复已撤销文件，不能通过回退一个 VS Code 次版本关闭该门槛。公开 `isRefactoring` 标记只影响自动保存，下一步仍需公开资源撤销栈路径证据；先推进其它可验证的 C3 编辑闭环。

同日 C1 元数据工作线程的两次 49,000 文件冷查询和 25 轮真实 vendor 六项编辑链已通过；[C2 未保存声明与 watcher 交错](reports/c2-open-buffer-watcher-burst-2026-09-25.md)的真实 LSP 回归及日常隔离宿主也通过。接下来按具体可复现的用户结果缺口推进 C2；C3 新文件 Redo 和 C4 Remote/长会话门槛仍开放。

后续 [49,000 文件 C1 复测](reports/c1-cold-candidate-scan-2026-09-25.md)补齐了五个独立冷进程，并在另一个进程核对 100 次温态 References：位置始终正确，温态命令中位 161 ms、P95 177 ms；服务器内新鲜度检查约占 111 ms 中位等待。保留无 watcher 新文件的下一次查询完整性门槛，优化须先建立等价证明。

C3 的 [Inline Variable 注释间隔](reports/c3-inline-comment-gap-2026-09-25.md)现可保留 `//` 与块注释并完成预览、应用及一次 Undo/Redo；含可执行中间语句的情况继续拒绝。生成文件 Redo 仍未解决。

[Inline Variable 带括号整值使用](reports/c3-inline-parenthesized-value-2026-09-25.md)现支持 `return (($value));` 和赋值右侧 `($value)`；嵌入复杂表达式仍拒绝。语义定向回归与隔离 VS Code C3 预览、取消、应用及一次 Undo/Redo 已通过；新文件 Redo 仍开放。

[Inline Variable 返回表达式最左侧使用](reports/c3-inline-leftmost-return-2026-09-25.md)现可把紧邻赋值内联到 `return $value ?? fallback()` 或 `return $sum * 3`，并加括号保留原表达式优先级；右操作数或中间有可执行语句仍拒绝。语义包与隔离 C3 源码宿主通过，安装候选和新文件资源 Redo 仍开放。

[Inline Variable 普通赋值右侧](reports/c3-inline-assignment-rhs-2026-09-25.md)现沿用受限最左侧规则，支持 `$result = $sum * 3`；属性或下标赋值目标会改变原表达式的求值顺序，现明确拒绝。语义与隔离 C3 宿主通过，已安装候选和新文件资源 Redo 仍开放。

C2 的[按需跨文件标量参数诊断](reports/c2-ondemand-double-quoted-literal-2026-09-25.md)已由真实 stdio 红绿回归修复并复用语义层的类型规则：`"bad"`、`"$dynamic"` 与 `3.5` 作为 `int` 参数，在严格类型下报告可证明的类型错误；完整插值字符串及其稳定局部赋值已有独立语法树证明及 10 项 Pack 宿主未保存编辑证据。拼接或不完整字符串仍保持保守。

C2 的[按需跨文件未知命名参数与缺参](reports/c2-ondemand-external-named-arguments-2026-09-25.md)现复用唯一 PSR-4 声明和动态派发证明：final 类上的错误名称与缺少必填参数报告诊断，改正名称或增加默认值后消失；方法可覆写且子类契约可能不同则保持保守。真实 stdio 正反例及隔离 VS Code Core 源码宿主的未保存往返已通过。

C2 的[嵌套调用后外层命名参数补全](reports/c2-nested-named-completion-2026-09-25.md)现只按顶层实参统计外层已用名称，内层命名参数不会屏蔽外层候选；外层右括号尚未输入、实参之间含注释时也能返回外层签名与候选。`@method` 多签名的候选筛选同样忽略注释中的逗号与括号。真实 LSP、隔离 VS Code Core 源码宿主的 Completion/Signature Help 以及完整语义包 332 项回归通过。已安装候选的可见建议列表仍待验收。

[C2 字符串与注释中的伪参数提示](reports/c2-signature-trivia-2026-09-25.md)已被抑制，同时保留真实调用内的字符串实参提示；语义包 333 项、真实 stdio 和隔离 VS Code Core 源码宿主正反例通过。字符串插值表达式及安装候选仍待对应验收。

[C2 函数声明中的伪参数提示](reports/c2-declaration-signature-context-2026-09-25.md)已修正：完整与未完成的 `function name(` 参数声明不再被当作调用，默认值里的真实调用及声明外的调用仍显示正确提示。语义、真实 stdio 和隔离 VS Code C2 源码宿主通过；安装候选与 Remote 仍待验收。

[C2 动态实参展开后的参数提示](reports/c2-dynamic-unpack-named-arguments-2026-09-25.md)不再把 `...$args` 当成一个确定位置参数；未知展开时压制可能误导的命名补全和浮层，明确的 `tls:` 仍有准确高亮，空展开仍正常补全。[已完成的字面量数组映射](reports/c2-literal-unpack-named-arguments-2026-09-25.md)还会按已知位置元素和简单字符串键计算占用参数；动态键、显式数字键和非法顺序保持未知。语义、stdio、隔离 C2 宿主及当前 10 项 Pack 的源码宿主通过；安装候选与 Remote 继续开放。

[字面量展开的参数顺序诊断](reports/c2-literal-unpack-order-diagnostic-2026-09-25.md)已让 PHP 8.1+ 的命名键后位置元素产生精确 Error，并随未保存修正撤回；不确定或未完成展开仍保持保守。语义、真实 stdio 版本门禁与隔离 C2 宿主通过，安装候选和 Remote 仍开放。

[编辑器关闭后磁盘更新与重开](reports/c2-editor-close-disk-reopen-2026-09-25.md)已在独立 Composer 项目的 VS Code 1.139.0 Core 和当前 10 项 Pack 源码宿主贯通补全、定义、Hover、参数提示、Implementation、References，以及严格类型诊断的出现与撤回。关闭标签页后宿主仍保留文档，因此这是实际编辑操作的结果证据，不等同于 `didClose/didOpen` 时序证据。下一步继续使用真实操作暴露的缺口推进 C1/C2，安装候选与 Remote 仍归 C4。

[C3 单项 echo 的 Extract Variable](reports/c3-extract-single-echo-crlf-2026-09-25.md)现可从函数块里的完整 `echo` 表达式提取变量，生成声明沿用源文件 CRLF/LF；多项 echo 保持拒绝。独立语义测试与完整 C3 源码宿主的预览、应用和一次 Undo/Redo 已通过。其它表达式位置与新文件资源 Redo 仍依各自支持范围验收。

[C3 单项 echo 的 Inline Variable](reports/c3-inline-single-echo-2026-09-25.md)也已支持紧邻赋值后的唯一单项 `echo $value;`，注释原位保留，语义测试和完整 C3 源码宿主的一次 Undo/Redo 通过。多项 echo 与可能改变求值顺序的用法继续拒绝。

[C3 单条 echo 的 Extract Method](reports/c3-extract-method-single-echo-2026-09-25.md)已支持类方法中把 `echo $message;` 提成接收已证明按值输入的私有方法；多表达式与跨多语句混合仍拒绝。语义正反例及完整 C3 源码宿主的预览、应用、一次 Undo/Redo 通过，多输出和控制流提取继续开放。

Open Source Pack 的当前源码清单为 Core、Symfony 和 8 项外部扩展；原版 PHPUnit/Pest 测试视图因文件 Rename 的旧路径错误已移出默认清单，测试由项目 CLI 执行。公开 Marketplace 页面仍对应旧组合；[私有候选 15a5254](reports/alpha-15a5254-packaged-profile-2026-09-26.md)已包含当前组合。实际安装状态与下一步见[Pack 当前入口](reports/open-source-pack-current-entry-2026-09-26.md)。以上顺序从真实用户操作出发，R4 的最终验收目标保持不变。

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

## 阶段实施记录（2026-09-24 起）

**2026-09-24 的执行起点是 C2 编辑反馈链；最新优先顺序见[Pack 整理与 Core 下一步](reports/open-source-pack-next-core-2026-09-25.md)。** C1 已有独立 Composer 项目、真实依赖树、10k 文件和隔离宿主的六项查询与可见补全证据，但冷查询等待分布、长期会话、Remote 和跨平台验收仍开放。C2 快速编辑的旧诊断已修复；[逐段计时](reports/c2-rapid-diagnostic-version-2026-09-24.md)发现旧版本通知排队使诊断短暂清空 268–319 ms。文档变化后的诊断分析现合并 25 ms，三轮相同宿主复测把空白缩至 64–100 ms；单次编辑、快速连续输入和关闭文件的通知边界已有定向 stdio 证据。[跨文件诊断往返](reports/c2-cross-file-diagnostics-2026-09-24.md)现覆盖已完成索引的两个文件：未保存声明改变及关闭恢复时，使用方的参数类型错误会同步撤销和重现，参数提示与诊断使用相同签名事实。[打开文件数量基准](reports/c2-related-diagnostics-scale-2026-09-24.md)在 80/128 个文件时将真正受影响使用方的本机等待从 256/372 ms 降到约 95/98 ms，并避免无关诊断重复通知。下一步检查更多诊断类型、默认 `onDemand` 的可证明范围、复杂文件和长会话，再检查 PHPDoc、补全、Hover、导航和诊断是否消费同一版本的类型事实。C1 未关闭的门槛与 C3/C4 继续在各自阶段验收，不因单个业务项目或 Symfony Provider 的缺口改变 Core 优先级。下述 PHP DocBlocker 门禁当时使用 11 项 Profile；当前默认清单为 10 项，PHPStan 继续按项目单独验收，详见[日常开发组合方案](daily-use-assembly.md)。

截至 2026-09-24，F04-NAV-01–13 已用独立 Composer 项目验证接口、未保存类型切换、未完成成员输入、跨 namespace 父类与同名短类、跨文件 Trait 优先级和别名、外部声明变更后的索引失效，以及进行中查询的取消、版本隔离和同版本重新打开防护。F04-HOST-01 又在隔离 VS Code Core 宿主中，以 auto、PHP 7.2、8.1、8.5 设置完成六项编辑请求及未保存切换后的完整查询链；F02-VERSION-01 用同一版本文件验证了 `match`、`enum`、`(void)` 的版本诊断。查询版本保护已统一覆盖主要异步边界。Pack 组合、Remote、跨平台和持续使用按后续门槛执行。Symfony 或单个业务项目特例不决定通用 Core 的优先级。

**2026-09-24 的 C1 进展：**References、Implementation 已有实际候选扫描期间的未保存编辑证据；Completion、Hover、Signature Help 和 Definition 也已通过测试模式中的可控暂停点验证新旧版本分离，并修复可变文档版本比较错误。隔离 VS Code Core 宿主在 auto、PHP 7.2、8.1、8.5 设置下完成未保存接收者切换前后的六项编辑查询，也完成小型 Composer vendor 与双根工作区的六项查询链。不同根使用不同显式 PHP 版本时，诊断、内建补全与六项查询已分别验证；auto 的 Composer 解析版本现已传入服务器，运行中 Composer 平台或显式版本变更后的诊断与补全也可更新。嵌套 Composer 项目现可在 onDemand 下按文件发现并隔离版本和符号，已安装 vendor 包保留父项目归属。配置运行时、PATH 自动发现与路径仓库符号链接已有独立证据；虚拟内建声明文档的跨根 PHP 7.2/8.5 版本显示也已通过隔离宿主。其它系统、真实依赖树和长期会话仍需验收。Completion/Hover 的偶发长等待发生在服务器处理计时之外，Language Client 轻量往返也未复现长等待；可见建议列表的本地基线已建立，默认 10,000 文件预算下已安装依赖 Implementation 候选被无关项目文件挤掉的问题已有快速 `rg` 与有界可移植预筛路径；下一步扩大 vendor、未完成输入和长时间会话等 C1 场景，最后按退出证据判断 C1 是否可关闭。C2 随后以类型与诊断反馈为重点；PHPDoc 生成交由 Pack 中的 PHP DocBlocker，Core 继续补类型消费和语义一致性。Open Source Pack 当前源码为 10 项清单，冻结候选时再做完整组合门禁，不因每次 Core 源码增量重打三份 VSIX。

本轮 Pack 清单与默认值复核见[整理记录](reports/open-source-pack-core-start-2026-09-24.md)。Core 接下来的执行顺序是：已用[Implementation 候选预算正反例](reports/c1-implementation-candidate-budget-2026-09-24.md)修复 10,000 文件边界，并加入有界可移植搜索；随后扩展隔离宿主中的可见建议等待分布、未完成输入、跨环境版本探测及较大 vendor 树。path repository 的链接路径与真实路径 References 已有[真实 stdio 正反例](reports/c1-path-repository-2026-09-24.md)；配置 PHP 8.1 可执行文件的[宿主证据](reports/c1-configured-runtime-2026-09-24.md)与无配置时优先 PATH `php` 的[宿主证据](reports/c1-path-php-version-2026-09-24.md)均已具备。键入到建议列表可见的[本地基线](reports/c1-visible-completion-2026-09-24.md)、[1,000 文件合成 vendor 树基线](reports/c1-vendor-visible-completion-2026-09-24.md)和[同缓冲区未保存类型往返](reports/c1-unsaved-visible-completion-2026-09-24.md)已建立；同一未保存缓冲区连续 10 轮 A/B 类型切换与快速键入已有[可见候选证据](reports/c1-rapid-unsaved-completion-2026-09-24.md)；锁定的 Guzzle、Monolog 与 Symfony HttpFoundation [真实 Composer 依赖树](reports/c1-real-composer-vendor-2026-09-24.md)已覆盖首批六项查询及未保存类型切换；锁定的真实依赖树现扩至 1,029 个 PHP 文件，并在隔离宿主中完成[六种真实 vendor 类型的可见建议](reports/c1-real-composer-vendor-2026-09-24.md)正反例；10,130 文件候选预算问题已修复，50,000 个 autoload PHP 文件的按需 Implementation 找到了正确落点，超过边界会明确报告搜索不完整，见[实施报告](reports/c1-implementation-candidate-budget-2026-09-24.md)；10,130 文件项目的 Implementation 与 References 已在同一未保存缓冲区完成[连续 100 轮](reports/c1-implementation-references-session-2026-09-24.md)正确性、等待与 RSS 采样；隔离 VS Code Core 宿主也在该规模完成[六项查询与六种真实 vendor 可见建议](reports/c1-real-composer-10k-host-2026-09-24.md)；已修复已打开文件监视事件触发的重复扫描，两轮 10k 宿主冷 Implementation 从约 2.5 秒降至约 1.4 秒，见[宿主报告](reports/c1-real-composer-10k-host-2026-09-24.md)；仍需测数小时会话、跨平台与 Remote，并继续观察冷查询等待分布。自动发现运行时的跨环境结果也开放。每项都要同时覆盖未保存编辑和错误归属的反例。完成后用冻结的 Core、Symfony、Pack 及外部版本做一次完整组合门禁，再决定 C1 是否达到日常使用基线。人工持续编码反馈可以并行到来，不阻塞这些自动化工作。

新增进展：10,130 文件隔离宿主完成两轮各 100 次和一轮 1000 次未保存类型切换的可见候选检查，均无旧方法候选；1000 轮的 P95 为 215 ms，约四分钟会话的 RSS 采样没有持续增长。Composer 监视事件曾使无关工作区根也重新索引；现已收窄刷新范围，并保留跨文件夹路径依赖的全量回退，双根真实 stdio 正反例与 10k 宿主通过。一次更早的嵌套 Composer 项目 Definition 超时未能确定具体成因，继续观察并保留失败结果记录，见[宿主报告](reports/c1-real-composer-10k-host-2026-09-24.md)。

同一 10,130 文件宿主又完成真实 PSR Response/Request 接口与 Guzzle 实现之间的 50 轮未保存切换，六项编辑查询共 300 次均返回正确目标。Completion、Hover、Signature Help、Definition 的首轮 P95 为 31、14、8、10 ms；Implementation 与 References 原先因每轮候选重扫，P95 分别为 829、743 ms。Implementation 已以打开缓冲区完整更新和项目版本条件复用先前完成的候选覆盖，P95 降至 7 ms；References 随后按文件刷新接收者证据并复用扫描覆盖，完整 stdio 正反例与 10k 隔离宿主 50 轮复测通过，P95 从上一轮 762 ms 降至 132 ms。冷查询、较长会话、跨平台/Remote 和冻结版本的完整组合验收仍是 C1 门槛。正反例与宿主结果见[宿主报告](reports/c1-real-composer-10k-host-2026-09-24.md)。

Open Source Pack 现有独立的[默认组合宿主门禁](reports/open-source-pack-composition-gate-2026-09-24.md)：本机 Linux 隔离 Profile 加载 Core、Symfony、Pack 与冻结外部扩展，按 Pack 默认 `onDemand` 实际完成 PHP/Symfony 导航和引用、格式化、调试与 PHPUnit 操作。干净 Alpha 候选与独立 PHP 7.2 Composer 项目的确定性预检已通过。下一步按以下顺序推进，避免把单个 Symfony 项目当作 Core 需求来源：

1. **C1 冷启动和持续编辑。** [首轮冷查询](reports/c1-cold-first-query-2026-09-24.md)发现并修复了激活完成早于 Provider 注册导致首次 References 返回空结果；10k 独立项目中首次 References/Implementation 现能一次取得正确位置。继续记录空缓存、后台准备后与重载后的可见等待，并用较长会话重复未保存编辑的六项查询与建议显示，定位超时、旧结果或内存增长。先复用现有 1k/10k/真实 vendor 夹具。
2. **C2 类型与诊断一致性。** [当前文件的 `never` 漏报](reports/c2-ondemand-local-never-2026-09-24.md)已在 `onDemand` 下修复并通过独立宿主；未保存地改成 `void` 再恢复 `never` 时，诊断完成 10 → 7 → 10 往返。[快速编辑的旧诊断发布](reports/c2-rapid-diagnostic-version-2026-09-24.md)已通过带版本接收与编辑时撤下旧集合修复。[同文件参数诊断](reports/c2-ondemand-local-arguments-2026-09-24.md)在默认 `onDemand` 下已通过 PHP 7.2/8.5 的真实 stdio 与 PHP 8.5 隔离宿主；[PHP 8 同文件错误命名参数](reports/c2-ondemand-local-named-arguments-2026-09-24.md)也已在默认模式下通过 stdio 与宿主的未保存修复往返。[跨文件参数类型诊断](reports/c2-cross-file-diagnostics-2026-09-24.md)在完整索引下已有未保存编辑和关闭恢复的往返证据，其它事实仍要求完整证明。继续审计补全、Hover、导航和诊断是否消费同一版本的类型事实，尤其检查索引状态变化、清空等待与长会话。PHPDoc 注释生成已由 Pack 中的 PHP DocBlocker 提供；[生成后未保存类型切换](reports/c2-generated-phpdoc-flow-2026-09-24.md)已在 PHP 7.2/8.5 完整成员宿主验证补全、Hover、Definition、局部标量冲突诊断，以及 `list<A|B>` 只暴露共有成员。下一步按日常代码频率检查数组形状、嵌套泛型及返回值经赋值传播时的同一事实，再处理可证明的缺口；复杂泛型关系和长会话仍开放。
3. **C3 和 C4 顺序验收。** C1/C2 的高频工作流稳定后，逐项检查 Rename、导入、生成和其它工作区编辑的预览/撤销；[私有参数重构的无关同名方法误挡](reports/c3-private-parameter-owner-2026-09-24.md)已修复，源码宿主套件现能执行并撤销该动作。C4 再验证 WSL Remote 的 Extension Host 与工具路径、Windows/macOS、PHP 版本矩阵和长时间真实使用。Pack 成员仅在外部扩展通过独立准入门禁后调整。

C2 的[本轮 PHPDoc 类型反馈](reports/c2-generated-phpdoc-flow-2026-09-24.md)又覆盖嵌套 `list<list<A|B>>` 经过返回、赋值和两层迭代的公共成员，以及联合数组形状的共有键和缺失键。下一步针对常见函数返回值与局部赋值，检查补全、Hover、Definition 和诊断是否同时遵循这些类型事实；先修复用户可见的错误结果，再扩大语法支持域。

联合数组形状的共有键现已在完整 Pack 宿主验证补全、Hover、Definition 与同文件参数类型诊断；缺失键和数组写入后的不确定结果保持保守。下一步把同一编辑链扩至跨文件函数返回、未保存声明变化和默认 `onDemand` 的诊断撤销，继续检查实际等待和结果版本一致性。

[跨文件 PHPDoc 返回编辑链](reports/c2-cross-file-phpdoc-return-2026-09-24.md)现覆盖完整索引和 `onDemand` 中已打开声明的补全、Definition 切换；完整索引下使用方诊断也同步撤销与恢复。当时 11 项 Open Source Pack 的源码组合宿主进一步验证了未保存声明切换后的补全、旧 Definition 撤销，以及未保存使用方改写后的新 Definition 和 Hover。`onDemand` 关闭未保存声明后已能恢复磁盘类型，并响应后续 watcher 更新；跨文件类型诊断仍需完整证明才发布。下一步检查大量关闭文件的缓存上限、跨根依赖与未保存使用方并发编辑的结果版本，再决定哪些跨文件事实能安全扩大按需诊断范围。

使用方连续未保存编辑的版本 3 反馈和关闭后立即重开的诊断保留，已有真实 stdio 回归。C2 接下来优先检查大量关闭文件的缓存上限与跨根依赖，再在独立 Composer 项目的长会话中观察持续编辑的内存、等待与结果版本。

[按需缓存与嵌套根回归](reports/c2-ondemand-root-cache-2026-09-24.md)现证明 257 次关闭后的 256 文件上限及重新打开后的淘汰顺序，并修复了新建子 Composer 项目时父项目残留子项目 PHPDoc 事实的问题。下一步在独立项目中检查较长会话的内存与等待分布，以及路径依赖、符号链接跨根关系在未保存编辑和文件监视事件交错时的结果；随后回到可证明的跨文件诊断范围。

[5,000 轮 C2 编辑序列](reports/c2-session-retained-tree-2026-09-24.md)发现并修复关闭文件时未释放保留语法树造成的 RSS 增长；默认 `onDemand` 的跨文件 PHPDoc 补全、Hover、Definition 及磁盘恢复在修复前后均无旧结果，修复后五段 RSS 均值基本持平。接下来继续处理路径依赖/符号链接和 watcher 交错，并在更大的独立 Composer 项目、完整 Pack 与真实 Extension Host 中检查等待和长时间内存；这些证据不能由小项目 stdio 基准替代。

[路径仓库编辑与监视回归](reports/c2-path-repository-edits-2026-09-24.md)现覆盖真实路径未保存编辑、安装链接路径的磁盘更新、打开缓冲区优先、反向监视与删除清理。[双路径同时打开回归](reports/c2-dual-path-open-2026-09-24.md)进一步让最近编辑的缓冲区拥有跨文件项目事实，冲突时给出一次警告，并在关闭后逐级恢复另一打开缓冲区和磁盘。[按需跨文件参数诊断](reports/c2-ondemand-psr4-literal-diagnostics-2026-09-24.md)现对唯一 PSR-4 类方法、直接或稳定局部标量字面量，以及直接调用或稳定局部赋值的原生标量返回发布可证明错误；调用目标可由 `final class`、`final` 方法或同一代码块内直接 `new` 的精确接收者证明。隔离 VS Code 宿主已观察到未保存编辑的诊断往返与参数提示更新。两个 PSR-4 候选路径、仅 PHPDoc 的跨文件返回及复杂控制流继续保守。下一步验证更多参数来源、较大 Composer 项目和完整 Pack 宿主中的等待与长期稳定性。

[局部值 Hover 与跨文件返回反馈](reports/c2-local-value-hover-2026-09-24.md)已让 Hover 复用当前局部类型事实；未保存地把源返回类型在 `string` 和 `int` 之间切换时，Hover、源方法签名、Definition、目标参数提示和诊断在真实 stdio 中保持一致。隔离 VS Code C2 宿主也验证了 Hover 和诊断往返。赋值与使用之间的纯注释不再中断类型回溯，可能改写变量的语句仍撤销证明。[11 项 Open Source Pack 源码 Profile](reports/open-source-pack-c2-local-feedback-2026-09-24.md)接着完成 10 轮未保存 `string/int` 切换，每轮的 Hover 与参数诊断同时匹配；本机从编辑提交到两个 Provider 结果一致的 P95 为 145 ms，不代表鼠标浮层绘制时间。下一步在较大独立 Composer 项目和更长会话中观察等待与取消，并检查数组、联合类型和动态来源的失败反馈。

[真实 vendor 与 10k 项目 C2 会话](reports/c2-real-vendor-feedback-session-2026-09-24.md)已在独立临时 Composer 项目中完成 500 轮跨文件原生返回 `string/int` 切换，使用方诊断和局部 Hover 每轮匹配；受控取消的旧 Hover 返回 `null`。10,131 个 PHP 文件、约 45 秒的本机 stdio 样本中，诊断更新 P95 为 91.4 ms、其后 Hover 请求 P95 为 3.33 ms，RSS 前段增长后没有观察到后半段持续上升。下一步是较大项目的 VS Code 宿主可见等待，以及更长会话、数组/联合类型和动态来源的反馈；此 stdio 结果不能代替这些门槛。

[完整 Pack 大项目宿主门禁](reports/open-source-pack-c2-real-vendor-host-2026-09-24.md)已把同一真实 vendor 与约 10k 文件的场景带进 11 项扩展的隔离 VS Code 宿主；50 轮未保存切换的 Hover 与诊断一致等待修复后 P95 为 131–132 ms。编辑后 Definition 偶发空结果已定位为嵌套项目 PHP 版本探测触发 Language Client 重启；动态版本更新后，连续两轮组合宿主的六次 Definition 均首次命中，门禁已改成首次失败即报错。下一步继续把数组、联合类型和动态来源纳入同一编辑反馈链，并以更长宿主会话复核等待与内存；工作区文件夹增减带来的重启单独验收。

[跨文件联合数组形状返回](reports/c2-cross-file-union-shape-return-2026-09-24.md)现覆盖原生 `array` 与所有分支均为数组的 PHPDoc 联合返回值：局部赋值后的共有成员补全、双声明导航、调用后 Hover 与诊断已在完整 Pack 宿主贯通，未保存地换成不兼容分支会撤回旧结果。单层、固定两层、可选或缺失的中间形状经确定键写入后会逐分支保留无关字段；可选形状中新建与原有字段的可能性同时保留，不把原有的其它键误判为必有。动态键、两级引用别名和未知调用均撤销无法证明的类型事实。完整 Pack 宿主已核对未保存 PHPDoc 切换后的参数诊断撤回与恢复。下一步在更长编辑序列和较大项目中复核跨文件诊断、等待及内存，再评估哪些有明确副作用契约的调用可安全保留类型事实；无法证明的分支继续保持未知。

[完整 Pack 大项目联合形状会话](reports/open-source-pack-c2-real-vendor-host-2026-09-24.md)已把同一未保存 PHPDoc 切换带入约 10,131 个 PHP 文件：两轮各 30 次，Definition、Hover 与参数诊断逐轮一致，从编辑到三项一致的 P95 为 201/202 ms；第二轮扩展宿主 RSS 采样未持续上升。下一步扩大长会话和缓存/取消交错，单独采样 Language Server 内存，并在 WSL Remote 与跨平台完成真正的组合验收；这些本机源码 Profile 数据不等于用户安装候选或 R4 通过。

[联合形状真实 stdio 长序列](reports/c2-real-vendor-union-shape-session-2026-09-24.md)进一步在同一 10,131 文件项目完成 500 轮未保存 PHPDoc 切换：每轮诊断、Definition 与 Hover 匹配，受控取消的旧 Hover 返回 `null`；诊断匹配 P95 98.3 ms，独立 Language Server RSS 后半段未持续上升。下一步仍需更长的编辑器会话、缓存和取消交错、WSL Remote 与跨平台的独立验收；约 52 秒 stdio 不能替代这些证据。

同一[stdio 基准](reports/c2-real-vendor-union-shape-session-2026-09-24.md)再完成 500 轮后的关闭恢复、磁盘 watcher 往返与同版本立即重开，诊断、Definition、Hover 每步与最新事实一致；最终 150 ms 观察窗内未出现旧诊断回闪。下一步针对真正重叠的请求、watcher 和关闭事件建立可控时序，并在更长 VS Code 宿主会话中核对等待和内存；WSL Remote 与跨平台仍按 C4 门槛验收。

[受控重叠回归](reports/c2-real-vendor-union-shape-session-2026-09-24.md)现让旧 Completion 暂停并取消，同时交错关闭/同版本重开与 watcher 通知；严格 500 轮大项目门禁确认旧请求空结果，新请求与打开缓冲区一致，恢复后补全、Definition、Hover 和诊断重新一致。另一次 1000 轮序列的 RSS 前段峰值后趋于平台；不同运行的瞬时内存台阶仍只作观察，不作为长期稳定性结论。接下来在 VS Code 源码宿主复核这组重叠操作，再扩展到 Remote 与其它事件排列。

[完整 Pack 宿主 watcher 复核](reports/open-source-pack-c2-real-vendor-host-2026-09-24.md)已在同一 10,131 文件项目观察到两次 VS Code 文件变化事件：磁盘与未保存缓冲区分别呈相反联合类型时，Definition、Hover、参数诊断始终按打开缓冲区返回。源码宿主并未控制单个 Provider 请求停顿，因此真正重叠的取消和关闭仍以 stdio 门禁为证据；接下来应在可安装候选或 Remote 宿主中复核运行位置与缓冲区优先级，再继续 C3 的用户可见编辑操作。

[C3 导入命令版本保护](reports/c3-import-command-version-2026-09-24.md)已在 Core 的 `Import Class`、`Resolve Pasted Imports` 和 `Optimize Imports` 异步链路加入文档关闭/版本检查；完整 Pack 源码宿主的正常应用及 Undo/Redo 已通过。[旧计划宿主门禁](reports/c3-import-stale-plan-host-2026-09-24.md)进一步在三条命令的服务器计划返回后插入文档编辑，均拒绝应用旧结果。[请求处理中编辑门禁](reports/c3-import-inflight-editor-2026-09-24.md)现让服务器保留三种已计算响应，等待收到新缓冲区版本后再释放，宿主均拒绝旧编辑。[Safe Move 预览与应用快照](reports/c3-safe-move-preview-snapshot-2026-09-24.md)现使用同一份计划，并在确认后复核参与文件；受控宿主已证明中途编辑会拒绝移动。[可查看的预览与确认](reports/c3-preview-review-flow-2026-09-24.md)已让差异标签保持打开，取消及预览后应用在宿主通过。下一步在真实编辑器中验收非模态通知的点击、取消及 Remote 可见性，并继续覆盖其它 C3 重构命令；不能仅凭这些子集宣称 C3 关闭。

[局部字面量变量来源](reports/c2-ondemand-local-literal-source-2026-09-24.md)现纳入同一按需跨文件参数诊断证明链；隔离编辑器宿主已验证未保存编辑后的诊断出现、撤销和恢复，函数改写保持保守。[双路径局部查询](reports/c2-dual-path-open-2026-09-24.md)现让非事实所有者标签页继续读取自己的未保存内容，同时保持跨文件项目事实归属；隔离宿主已验证项目补全与局部 Hover、补全、Definition、Signature Help 分别使用正确的版本。[规模基准](reports/c2-alias-query-scale-2026-09-24.md)发现并消除了重复解析项目源码及空移除误触发重建造成的等待；1,024 文件、20 轮隔离 stdio 的所有者编辑后 Hover P95 约 1.7 ms，隔离宿主 10 轮本机样本 P95 为 5 ms，两边均核对项目所有者与局部结果。下一步检查完整 Pack 与 WSL Remote 的连续编辑，并在真实长期使用中测量等待分布与取消响应；条件赋值和跨文件返回传播须分别建立可靠来源证明后才能扩展。

1. 在 SoPHP 仓库建立独立 Composer 示例项目和可重复的编辑序列：打开 PHP 文件 → 成员补全 → 参数提示 → Hover → Definition → Implementation → References → 修改未保存内容后重复查询。记录候选、落点、等待时间和错误反馈，作为 C1 基线。先用真实 stdio 自动化完成可重复部分，不等待人工试用。
2. 为这条序列补齐 F04 编号输入，覆盖有类型接收者、文件顶层变量、跨文件类、同名无关符号、Trait/继承、namespace/use、未完成输入及未保存版本；断言精确候选、位置和失效后的新结果。现有 F04-REF 夹具直接复用，不重复造一套。
3. 按用户可见影响排序：错误结果或旧结果 → 缺失的高频结果 → 明显延迟与缺少进度反馈。对每个问题追溯 parser/index 事实、作用域、完整性、失效条件与 schema；一次只修复可证明的场景，同时验证合法反例。
4. 每个修复先跑语义与真实 LSP 定向回归；受影响的能力再做隔离 VS Code Extension Host 操作验证。阶段冻结时才检查完整组合、跨平台和 Remote；业务项目只用于只读对照与性能观测，不修改其代码。

C1 首个交付物是上述操作序列及缺口清单；清单形成后按实测问题推进 C1 修复，再进入 C2 的类型和诊断闭环。R3 重构与 R4 最终验收目标保持不变。

日常增量只运行相关包测试、类型检查、Lint 和定向 stdio；影响 parser、索引或缓存时追加相应完整回归及性能基准。**不为每个增量打包三份 VSIX**；真实 Extension Host 门禁只构建所需的 Core 候选，组合或发布门禁再构建相应扩展。

## 完成判定与排期

每个阶段的完成证据包含真实操作、精确结果、合法反例、未完成输入、缓存/增量一致性和用户可理解的失败反馈。C1–C4 与[最终验收](acceptance.md)中的核心条目都关闭后，才能称 SoPHP 核心开发完成。Symfony/Doctrine/Twig 与辅助工具的组合验收继续按 P8、F09–F12 完成；公开发布另行确认。

此前按技术分层给出的 C1–C4 工期不直接适用于本体验顺序。先完成 C1 的真实操作基线并统计缺口，再用实测的问题规模重估余下阶段；估算仍应分别列开发工作量、平台验证等待及框架扩展范围。
