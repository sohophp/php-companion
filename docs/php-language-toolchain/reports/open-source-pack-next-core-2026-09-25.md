# Open Source Pack 整理与 SoPHP 下一步

日期：2026-09-25。依据本仓库的 Pack manifest、冻结 Profile 清单及隔离宿主报告；未修改业务项目。**当前执行入口已移至[2026-09-26 摘要](open-source-pack-current-entry-2026-09-26.md)**；本页保留阶段记录。后续已冻结并验证[同批三份私有 VSIX 候选 15a5254](alpha-15a5254-packaged-profile-2026-09-26.md)；原 [21977ee1 候选](alpha-21977ee1-packaged-profile-2026-09-25.md)作为历史记录保留。

> **2026-09-26 当前入口：**Pack 保持 Core、Symfony 和 8 个外部扩展共 10 项；原版 PHPUnit 测试视图不默认安装，项目 CLI 负责测试。Core 的 [C2 Attribute 箭头函数输入](c2-attributed-arrow-named-arguments-2026-09-26.md)已通过语义、真实 stdio、Core 与完整 Pack 源码宿主；[C3 新文件生成](c3-type-generation-staged-redo-2026-09-25.md)在本机 Linux 主路径已通过一次 Undo/Redo。下一步先针对独立 Composer 项目中可复现的错误或可见等待修 C1/C2，再审计 C3 高频编辑结果；冻结交付时才打包 Core、Symfony、Pack 三份 VSIX，进入 C4 的安装、WSL Remote、跨平台和持续使用验收。下文保留阶段记录，其中旧的“Redo 尚未恢复”与旧“下一步”以此处当前状态为准。

**候选更新：**源码增量已在 `15a5254` 冻结，并通过三份实际 VSIX 的隔离 Pack 宿主。下一项交付工作是该候选在真实隔离 WSL Remote Profile 的安装、扩展宿主和完整操作链；不再为冻结前的每个小改动单独打包。

同日的 [PHP 语法诊断归属对照](open-source-pack-syntax-diagnostic-ownership-2026-09-26.md)发现保存后的明确语法错误由 SoPHP 与内建 PHP 校验重复报告，而匿名缺失 token 目前只有内建校验报告。现保留 CLI 校验；Core 先补齐缺失 token 的受限实时诊断和合法输入反例，再决定 Pack 的去重默认值。

后续已补齐受限的缺失分隔符实时诊断，并通过完整语言服务回归及 10 项 Pack 的未保存编辑宿主。[C1 可见补全阶段计时](c1-visible-suggestion-delay-attribution-2026-09-26.md)进一步将本次等待分到 Provider 前约 89 ms、Provider 本身约 4 ms、Provider 返回后到列表可见约 108 ms；服务端计算不足 1 ms。现阶段保持 Core 补全算法与 Pack 建议延迟默认值；出现新的可复现慢样本时，优先检查 VS Code 建议触发和列表呈现条件。

[C3 标量拼接 echo 的 Extract Method](c3-extract-method-scalar-concatenation-2026-09-26.md)现通过语义与当前 10 项 Pack 源码宿主的取消、应用及一次 Undo/Redo；对象操作数仍拒绝。下一项 C3 工作继续以可证明的真实编辑场景和完整操作链为准。

[C4 安装内容预检](c4-installed-content-extra-files-2026-09-26.md)现同时拒绝缺失、内容不同和额外残留的产品文件；现有 WSL Remote 安装目录与旧候选内容不一致，不能用其版本号代替 Alpha 安装验收。真实 WSL Remote 仍需隔离 Profile、扩展宿主归属和完整编辑链。

## 当前决定：先形成可用组合，再补 SoPHP 缺口

### 接下来的执行入口

1. **以 10 项 Pack 为组合基线。** `extensionPack` 已列出 Core、Symfony 和 8 个外部成员，Recommended Pack 不再交付；项目 PHPUnit/Pest CLI 负责测试。私有候选 `21977ee1` 包含这套清单，并已通过隔离 Linux 安装宿主；公开 Marketplace Pack 仍是旧成员，不能作为安装入口。下一次交付前核对外部成员实际版本，尤其是已验证的 PHP Debug 1.40.1 与 Marketplace 快照 1.40.2 的差异。
2. **先完成独立项目的日常开发闭环。** 在不涉及业务仓库的 Composer 项目中，核对实际 PHP、fixer、PHPUnit/Pest 和 Xdebug 路径，再连续执行 PHP 未保存编辑的补全、参数提示、Hover、Definition、References、诊断，以及 Symfony/Twig/YAML/XML、格式化、调试和 CLI 测试。记录操作结果、等待、重复 Provider、错误归属及撤销结果。[独立 Composer 工具组合宿主](open-source-pack-independent-tools-2026-09-25.md)已用 PHP 8.5、PHPUnit 12 和 PHP CS Fixer 3 通过源码 Profile；真实 WSL Remote 的扩展运行位置和长期使用仍需单独验收。
3. **Core 从可见错误和等待开始。** 优先处理上述流程中可复现的错误结果、旧诊断、缺失导航或明显等待；[独立工具的完整 Pack 大项目复测](open-source-pack-independent-tools-2026-09-25.md)显示首轮等待也可能落在诊断就绪之前，因此按具体慢阶段定位，不预设 Hover Provider 有问题。继续核对取消、关闭、监视事件与未保存编辑交错后的结果。当前[双路径同时打开](c2-dual-path-open-2026-09-24.md)已通过真实 LSP 四项局部查询和隔离宿主四项局部查询，无须将它继续列为本机 C2 缺口；Remote 路径行为仍归 C4。每个新问题先用独立 Composer 夹具复现，再做定向源码和宿主回归。没有这类证据时，按高频完整任务补 C3 的预览、应用与撤销；[新文件生成](c3-type-generation-staged-redo-2026-09-25.md)在本机 Linux 源码宿主已通过一次 Undo/Redo，回退路径、Remote 与跨平台仍开放，不继续按零散 Extract Method 语法逐项扩张。
4. **到交付点再冻结候选。** 只在有可交付的 Core 增量或组合成员变化时，同批生成 Core、Symfony、Pack 三份 VSIX，并在隔离 Profile 与真实 WSL Remote 检查安装内容、唯一 PHP 语言服务、工具路径和完整任务链。Windows/macOS、PHP 版本矩阵与持续使用是后续 C4/R4 门槛；已有 Linux 源码宿主结果不能代替它们。

Open Source Pack 源码清单固定为 10 项：Core、Symfony、TwigPlus、Red Hat YAML/XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets、PHP DocBlocker。各能力的所有者见下表；项目 PHPUnit/Pest CLI 负责测试运行。Recommended Pack 停止新候选交付，原版 PHPUnit 测试视图因已复现的 Rename 旧路径错误不进入默认组合。Pack manifest 的 4 项定向测试本轮通过。

| 用户工作 | 当前所有者 | 组合边界 |
| --- | --- | --- |
| 普通 PHP 编码、导航、诊断及安全重构 | SoPHP Core | 工作区只启用一个通用 PHP 语言服务；不再加第二个 PHP 语义扩展 |
| Symfony 服务、路由、事件及 Controller 上下文 | SoPHP Symfony | 与 Core 使用同批候选，Twig 通用编辑仍归 TwigPlus |
| Twig、YAML、XML | TwigPlus、Red Hat YAML、Red Hat XML | 三种语言分别由现有扩展负责 |
| 注释、格式化、调试 | PHP DocBlocker、PHP CS Fixer、PHP Debug | SoPHP 消费 PHPDoc 类型；项目提供兼容 PHP 的 fixer 与 Xdebug 配置 |
| 编辑约定、Apache 配置 | EditorConfig、Apache Conf Snippets | Apache 语法依赖由片段扩展声明，不重复列入 Pack |
| 测试运行 | 项目 PHPUnit/Pest CLI | 原版测试视图保持可选评估，不自动安装 |

**从这里开始执行：**

1. **确认组合可开始使用。** 10 项源码 Profile 和[候选 21977ee1 的隔离 VSIX 宿主](alpha-21977ee1-packaged-profile-2026-09-25.md)已通过。下一步在独立 Composer 项目、真实 WSL Remote Profile 中核对各成员版本、扩展运行位置、PHP CLI/fixer/Xdebug/测试命令路径，并按 PHP 编码→Symfony/Twig/YAML/XML→格式化→调试→CLI 测试走一遍完整任务。[PHPDoc 的 PHP 7.2/8.5 组合证据](open-source-pack-10-docblocker-2026-09-25.md)可复用；公开 Marketplace 的旧 Pack 不能冒充这套清单。不为日常改动重复打包。
2. **SoPHP Core 先修真实编辑缺口。** 保留 C1/C2 的独立 Composer 项目六项查询及未保存编辑门禁；出现可复现的错结果、旧诊断或明显等待时先修。[`if / elseif / else` 同一局部输出](c3-extract-method-if-else-output-2026-09-25.md)、[完整条件返回](c3-extract-method-conditional-return-2026-09-25.md)、[提前返回加最终返回](c3-extract-method-guard-return-2026-09-25.md)与[静态方法](c3-extract-method-static-2026-09-25.md)的 Extract Method 已完成语义与完整 Pack 源码宿主验证；下一步按实际高频场景扩展尚不能提取的控制流，并保持预览、取消、应用及一次 Undo/Redo 门禁。类型生成的一次 Redo 已在本机 Linux 的预先准备文件移动路径通过；回退路径、临时文件清理、Remote 与跨平台仍需验收。
3. **进入 C4 安装与日常使用验收。** 到交付点冻结一次三份 VSIX 及八个外部成员的版本和摘要，在干净 Profile 验证唯一 Provider、实际安装位置、项目工具路径、WSL Remote、跨平台与持续编辑。源码宿主通过只说明可进入候选验证；这些安装门槛与 R4 最终体验目标仍开放。

全程使用独立 Composer 项目做编辑器门禁，不修改 Winstar 代码。下文各阶段的旧“下一步”是历史记录，若与以上顺序不同，以本节为准。

[双标量变量 echo 的 Extract Method](c3-extract-method-scalar-echo-pair-2026-09-25.md)已作为这条 C3 主线的首项落地：当前 10 项 Pack 源码宿主通过预览、应用及一次 Undo/Redo；含对象类型或其它表达式的多项 echo 继续拒绝。

[末尾 return 与连续语句的 Extract Method](c3-extract-method-return-sequence-2026-09-25.md)随后通过同一完整 Pack 源码宿主：有类型和无类型返回均保留返回语义，预览、应用及一次 Undo/Redo 通过；返回引用和未知输入仍拒绝。

[双输出 Extract Method](c3-extract-method-multiple-outputs-2026-09-25.md)现在能将独立局部赋值提取为数组返回，在调用点解构，并保留已证明的输出类型 Hover；完整 Pack 源码宿主的预览、取消、应用与一次 Undo/Redo 通过。跨分支与复杂输出仍开放。

## 当前执行快照

**Pack：**源码 manifest 与冻结 Profile 对应 10 个唯一 ID：SoPHP Core、SoPHP Symfony，以及 TwigPlus、Red Hat YAML、Red Hat XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets、PHP DocBlocker。Apache Conf Snippets 所需的 `mrmlnc.vscode-apache` 由它自身依赖安装。SoPHP 是唯一通用 PHP Language Server，PHP CS Fixer 是 PHP 默认格式化器；测试由项目 PHPUnit/Pest CLI 执行。Recommended Pack 和原版 PHPUnit 测试视图不进入新候选。Pack 只记录扩展 ID，安装时的外部版本必须在候选冻结时核对。[Marketplace 实包核对](open-source-pack-marketplace-audit-2026-09-25.md)确认公开 Open Source Pack 0.4.5 仍是旧组合，Symfony 也未公开上架，不能当作此清单的安装证据。

本轮重新核对 Alpha 工具链：`prepare-alpha-candidate.mjs` 的 schema 3 产物数组固定为 Core、Symfony、Open Source Pack；预检保留 Recommended Pack 名称仅用于旧 schema 1/2 候选兼容及识别新 Profile 误装。Pack manifest 与 Alpha 预检的定向测试合计 11/11 通过。当前源码没有 Recommended Pack 包目录或新候选第四份构建入口。

**已完成的源码门禁：**10 项 manifest/唯一所有者检查、隔离 Linux 源码宿主的 PHP/Symfony、Twig/YAML/XML、格式化、调试入口与项目 PHPUnit CLI 链；真实 vendor 的 200 轮标量和 30 轮联合类型反馈；49,000 文件冷 References 的有界等待样本；未保存编辑与 watcher 交错的真实 LSP 回归。各报告见下文。它们不证明当前已安装的旧 0.4.5 VSIX、WSL Remote、其它系统或长时间人工使用。

[普通函数参数提示的候选索引](c2-function-signature-candidate-index-2026-09-25.md)已代替逐次扫描所有已解析文件；跨文件导入别名的未保存声明修改、同名隔离和真实 stdio 六项查询通过。该语义层优化未用编辑器端到端样本证明可见等待已消失。

[命名实参后的签名高亮与补全](c2-named-signature-next-unused-2026-09-25.md)现跟随第一个未填写参数或唯一匹配的参数名前缀，且补全不再重荐已通过位置实参填写的参数；语义、真实 stdio、Core C2 宿主及当前 10 项 Open Source Pack 的完整源码 Profile 均通过。安装候选与 Remote 的真实操作仍待 C4。

[同批私有 Alpha 候选 65f683c8](alpha-65f683c8-packaged-profile-2026-09-25.md)现已从干净独立 worktree 一次生成 Core、Symfony、Pack 三份 VSIX，摘要、包内清单、独立 Composer 预检与隔离 Linux 安装宿主均通过。此项把近期源码改动带入可安装候选；真实 WSL Remote、跨平台、持续使用和 C3 生成文件 Redo 仍开放，不据此判定 C4 或 R4 完成。

[当前 WSL Remote 只读清单](alpha-65f683c8-wsl-remote-inventory-2026-09-25.md)显示已安装的三个 SoPHP 0.4.5 均不是本私有候选，PHP Debug 为 1.40.2 而候选固定 1.40.1。预检现在可在指定实际扩展目录后逐文件比较候选与安装内容；当前正在使用的 WSL 环境未被更换，不能直接用于候选 C4 验收。

[C3 Inline Variable 返回表达式最左侧使用](c3-inline-leftmost-return-2026-09-25.md)已通过语义与隔离 C3 源码宿主：紧邻赋值可内联到 `return $sum * 3` 并用括号保留优先级；右操作数等可能改变执行顺序的情形仍拒绝。生成新文件的标准 Redo 与 C4 Remote 验收仍开放。

[C2 函数声明参数提示](c2-declaration-signature-context-2026-09-25.md)修复了在 `function name(` 内错误弹出调用签名的结果；真实调用仍返回提示，语义、stdio 和隔离 C2 源码宿主通过。当前私有 Alpha 候选在此修复之前生成，不能当作安装验收。

[C3 Inline Variable 普通赋值右侧](c3-inline-assignment-rhs-2026-09-25.md)现支持在安全条件下把紧邻赋值内联到 `$result = $sum * 3`，并拒绝可能重排求值的属性目标。语义与隔离 C3 源码宿主通过；C3 新文件 Redo 和 C4 Remote 仍需验收。

生成新文件的 [Redo 版本对照](c3-type-generation-undo-redo-probe-2026-09-24.md)已补 VS Code 1.138.0：与 1.139.0 相同，Undo 删除文件、三次 Redo 均未恢复。此现象不能靠单纯回退一个 VS Code 次版本解决；生成命令继续保留现有安全创建方式，C3 Redo 门槛仍开放。

[C2 动态展开后的命名参数反馈](c2-dynamic-unpack-named-arguments-2026-09-25.md)现避免将 `...$args` 伪装成单个已填位置参数；不确定时不提供可能错误的参数名建议或浮层，完整命名参数和空展开继续工作。语义、stdio 和隔离 C2 源码宿主通过，私有候选和 Remote 仍待新构建验收。

[C2 字面量数组展开后的参数反馈](c2-literal-unpack-named-arguments-2026-09-25.md)现在能按 `...['local', 80]` 与 `...['port' => 80]` 的已知元素占用参数，继续给出剩余参数提示和补全；动态键、显式数字键、嵌套展开及命名键后的非法位置元素仍保持未知。语义、stdio、隔离 C2 宿主及当前 10 项 Pack 的完整源码宿主通过；安装候选与 Remote 未据此判定完成。

[C2 同版本重开后的旧查询防护](c2-same-version-reopen-queries-2026-09-25.md)现以真实 LSP 对 Completion、Hover、Signature Help 和 Definition 逐项验证：暂停旧查询、关闭、以相同版本号重开为另一类型，再释放旧查询；四项旧结果均被丢弃，新结果都归属重开的文档。编辑器标签页关闭与 LSP `didClose` 的关系仍需在实际宿主单独验收。

[C2 字面量展开参数顺序诊断](c2-literal-unpack-order-diagnostic-2026-09-25.md)现能对 PHP 8.1+ 的 `...['port' => 80, 'local']` 精确标出非法位置元素；未保存地修正顺序后诊断撤回。语义、8.0/8.1 真实 stdio 版本门禁和隔离 C2 源码宿主通过；当前私有候选与 Remote 尚未包含本修复。

[C3 全局命名空间 Safe Move](c3-global-namespace-safe-move-2026-09-25.md)现覆盖空 PSR-4 前缀下从项目根到子目录的移动及反向 namespace 编辑；独立语义、真实 stdio 和 VS Code 1.139.0 C3 源码宿主的预览、应用、一次 Undo/Redo 通过。已冻结候选与 Remote 仍待验收。

[Apache 配置片段的完整 Pack 宿主验证](open-source-pack-apache-snippet-host-2026-09-25.md)确认 `.htaccess` 由 Apache 语法依赖识别，`a-force-https` 在当前 10 项源码 Profile 中作为 Snippet 出现，实际插入文本包含预期重写规则与 HSTS 头，并通过一次 Undo/Redo；同一宿主的 C2 查询与诊断编辑链也通过。已安装候选和 WSL Remote 仍需单独验收。

**SoPHP 接下来按此顺序执行：**

[C1 可见补全对照](c1-visible-suggestion-delay-attribution-2026-09-26.md)显示，将 VS Code 建议延迟从默认 10 ms 临时改为 0 ms，或改由 Workbench 输入接口键入，六样本可见等待均无明显改善；这两组短样本不足以定位完整的 UI 长尾。当前不改 Pack 默认值，继续按下列顺序处理有确切结果与等待证据的缺口。

[C2 带 Attribute 的箭头函数实参](c2-attributed-arrow-named-arguments-2026-09-26.md)后丢失外层参数提示与命名补全的错误已修复，语义红绿、真实 stdio、隔离 Core 与当前 10 项 Pack 源码宿主通过。它尚未进入已冻结私有候选；保持 Remote 安装门禁。

1. **C2 日常编辑反馈，保留 C1 导航门槛。** 在独立 Composer 项目和当前 10 项源码 Profile 下，先复核未保存输入的补全、参数提示、Hover、定义与诊断，特别是关闭、取消、文件 watcher 交错后的结果版本；再用同一会话核对 References。先修可复现的旧结果、错误诊断或明显等待；每项保留实际输入、预期与定向回归。C1 的本机 49,000 文件首次 References 五个独立源码宿主均正确，等待中位 1325 ms、五样本 P95 1496 ms；另有 100 轮温态查询结果稳定，命令 P95 为 177 ms。长会话、安装候选与 Remote 门槛仍开放。
2. **C3 编辑闭环。** 对高频 Import、Rename、Safe Move、Extract、Inline、生成命令按预览、取消、应用失败及 Undo/Redo 收口具体缺口。[生成文件的一次 Redo](c3-type-generation-staged-redo-2026-09-25.md)已在本机 Linux 的独立与完整 Pack 源码宿主通过；移动不可用时的原创建路径、安装候选和其它平台还没有同等证据。[缺失父目录的撤销复核](c3-type-generation-undo-redo-probe-2026-09-24.md)确认 Undo 会留下 VS Code 自动创建的空目录，不用删除事件盲目清理用户目录。
3. **C4 候选安装与 R4 验收。** 到交付冻结点才生成同批 Core、Symfony、Pack 三份 VSIX，固定八个外部成员的版本与摘要；在干净 Profile 验证唯一 Provider、实际安装位置、项目 PHP/格式化/调试/测试路径，再做 WSL Remote、跨平台和持续使用。用户在另一个窗口的反馈可并行进入，不阻塞前两项自动验证。

以下是此前按时间累积的调查与阶段决定；如有“下一步”表述与上述快照不同，以本节为准。

**最新组合决定：**[原版 PHPUnit 的 C3 复核](open-source-pack-c3-original-recheck-2026-09-25.md)再次在已配置测试目录的完整组合中失败。源码 Pack 已将 `recca0120.vscode-phpunit` 移为可选项，当前 manifest 为 **10 项：Core、Symfony、8 个外部扩展**；测试默认使用项目 PHPUnit/Pest CLI。下文关于“11 项默认 Pack”的阶段记录仅代表此前的组合与验证，不能描述当前 manifest。10 项源码组合的完整 C3 宿主已通过（`/tmp/sophp-c3-pack-10-configured-20260925.log`，退出码 0）；日常组合宿主也通过 PHP 格式化、Twig/YAML/XML、调试及项目 PHPUnit CLI（`/tmp/sophp-pack-10-source-cli-config-20260925.log`，退出码 0）。两者均为隔离 Linux 源码宿主证据。

## 当前起步顺序

1. **保持当前 10 项 Pack 清单。** Core 负责通用 PHP，独立 Symfony 扩展负责框架事实；TwigPlus、Red Hat YAML/XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets、PHP DocBlocker 各负责其现有能力。测试默认由项目 PHPUnit/Pest CLI 执行。先不增添第二个通用 PHP 语言服务、第二个 PHP 格式化器或原版测试视图。清单是源码决定，外部 Marketplace 版本仍须在下一次候选冻结时固定。
2. **SoPHP 从普通 PHP 的 C1/C2 工作流缺口开始。** 在独立 Composer 项目用当前 Pack 顺序执行“输入未保存代码→补全/参数提示/Hover→定义/引用→查看诊断”，记录错误结果、可见等待、取消与文件事件后的旧结果。已有 10k 文件长链和组合宿主结果作为基线；只对可复现的用户可见缺口修改 Core，不因 Symfony 单个项目或内部覆盖率继续扩张通用 PHP 语义。首轮重点是完整组合中未保存编辑与文件事件交错后的结果一致性。
3. **随后处理 C3 的明确阻断项。** 新建类型文件一次 Undo 后 Redo 未恢复是已复现问题；拿到可验证的资源撤销路径后修复。Import、Rename、Safe Move 等已有预览与失败门禁，继续按实际编辑操作复核，不重复堆砌相同探针。
4. **最后冻结安装候选进入 C4。** 只在交付新组合时生成同批 Core、Symfony、Pack 三份 VSIX，核对成员版本、安装位置、唯一能力所有者和 WSL Remote 实际操作。R4 的完整 PHP 开发体验目标保持开放。

独立 Symfony 扩展的 [`config/routes.php` Controller 导航](symfony-php-route-controller-2026-09-25.md)已通过源码、真实 stdio 和隔离 VS Code Definition 命令；它作为 Pack 的框架能力保留，已安装候选与人工 Ctrl+点击仍按 C4 验收。整个顺序只使用独立 Composer 项目，不修改 Winstar 代码。

随后当前 10 项 Pack 的完整 C3 源码宿主也通过该 PHP 路由类别名与方法名跳转，并继续完成后续 Symfony Rename，退出码 0；首次运行曾在路由通过后遇到 VS Code 首次 YAML Rename 的瞬时 `Canceled`，仅在测试中加入限定重试，见[路由报告](symfony-php-route-controller-2026-09-25.md)。

Core 的首项 C1 冷查询工作已经开始：[独立真实 vendor 冷 References 分段](c1-cold-candidate-scan-2026-09-25.md)显示主要等待在候选遍历。仅调整候选扫描的让出频率后，两次相同夹具的冷查询均正确且本机等待下降；取消、新文件和交替方法的定向回归通过。下一项继续围绕可见冷等待与结果一致性推进，不用该短样本代替长期或 Remote 验收。

## 交付清单与下一步

| 项目 | 当前决定 | 下一项可验收工作 |
| --- | --- | --- |
| 默认安装 | 保持下文的 10 项；Open Source Pack 是唯一组合入口，Recommended Pack 不进入新候选 | 冻结候选时核对 10 项实际安装版本和运行位置；Pack manifest 不锁外部版本 |
| PHP 语义及 Symfony | Core 负责通用 PHP，SoPHP Symfony 负责框架事实；Twig/YAML/XML 各由现有扩展负责 | 在独立 Composer 项目完成 PHP 编辑、模板与配置的组合操作；同一能力只保留一个 Provider |
| PHPDoc、格式化、调试、Apache 配置 | 继续使用 PHP DocBlocker、PHP CS Fixer、PHP Debug、Apache Conf Snippets 等现有工具 | 候选安装后核对项目工具路径、Xdebug 映射及 Apache 语法扩展依赖；不重复自研已有稳定能力 |
| 测试 | 项目 PHPUnit/Pest CLI 为默认入口；原版测试视图仅供单独评估 | 上游修复或独立维护候选通过同一文件 Rename、测试发现/运行和 Remote 门禁后再决定是否加入 |
| SoPHP Core 第一项 | [跨 namespace 方法生成签名](c3-cross-namespace-method-generation-2026-09-25.md)已修复接口、抽象方法和 Override Action 的来源类型解析 | 语义、真实 LSP 与独立 C3 源码宿主通过；下一步审计生成后的可用性与失败反馈，候选安装时复核完整组合 |
| SoPHP Core 后续 | 生成**新文件**的一次 Redo 仍未恢复；C1/C2 长会话和类型反馈继续跟进 | 资源撤销栈出现新线索时再做有界探针；随后以 10 项 Profile 重跑未保存编辑链，最后做安装候选与 WSL Remote |

**执行边界：**第一项代码生成签名问题已修复；继续按 C3 编辑链的用户可见影响审计生成结果及失败反馈。生成新文件 Redo 作为独立阻断项保留，不让重复探针占据日常开发。10 项源码宿主通过说明这套清单可进入候选验证，不等于 Marketplace 旧包或已安装 0.4.5 已更新，也不等于人工长期使用验收完成。

### 下一次从哪里开始

1. **Pack 基线已核对。** 当前 manifest 与 Profile 对应 10 个唯一扩展 ID，并由定向测试守住数量与去重；Core 负责通用 PHP，Symfony/Twig/YAML/XML/调试/格式化/PHPDoc 各有明确所有者。项目 PHPUnit/Pest CLI 是默认测试入口。成员变化时才重新评估完整组合；仅修 Core 时不重复打包三份 VSIX。
2. **C3 限定常量生成已修复。** 跨 namespace 的参数默认值 `namespace\CONST`、相对命名空间常量及导入别名常量现按来源解析，必要时生成完整名称；语义、真实 LSP 与隔离 VS Code 宿主的一次 Undo/Redo 已通过。范围与证据见[限定常量默认值报告](c3-qualified-default-constants-2026-09-25.md)。此项不涉及新文件的资源 Redo。
3. **再检查 C3 编辑闭环与 C1/C2 长会话。** 按 Import、Rename、Safe Move 的预览、应用失败、文件事件和撤销链逐项复核；随后在独立 Composer 项目检查未保存编辑、跨文件类型反馈、可见等待和取消。生成新文件的一次 Redo 单列为开放阻断项，出现新的可观察假设后再调查。
4. **最后冻结 C4 候选。** 需要交付新组合时才固定 Core/Symfony/Pack 三份 VSIX 与 8 个外部成员的实际版本和摘要；在干净 Profile 及 WSL Remote 核对安装位置、项目工具路径和真实编辑器操作。R4 的最终体验验收不因源码宿主通过而提前关闭。

本轮 C3 审计已用[编辑应用失败宿主门禁](c3-import-apply-failure-host-2026-09-25.md)覆盖三条导入命令的 `applyEdit` 返回 `false` 与抛错：命令均返回 `false`，缓冲区与磁盘保持原样。通知弹窗可见性、安装候选和 Remote 仍待验收；下一项继续检查 Rename 与 Safe Move 的文件事件和失败反馈。

Safe Move 的[预览清理失败](c3-safe-move-preview-cleanup-2026-09-25.md)也已收口：移动应用后若关闭预览标签抛错，命令保留成功返回值并释放快照；隔离宿主注入该错误，验证目标文件和一次 Undo/Redo。下一项继续检查 Rename 与 Safe Move 预览期间的独立文件事件。

Safe Move 的[规划结束到预览建立之间的文件变化](c3-safe-move-plan-preview-gap-2026-09-25.md)已用源文件及未打开关联文件两个外部改写场景复现并修复：旧计划不再进入预览，磁盘内容保留；正常移动与一次 Undo/Redo 继续通过。下一项检查 Rename 在同类时间窗口的磁盘变化与预览结果。

Rename 的[规划结束到预览建立之间的关联文件改写](c3-rename-plan-preview-gap-2026-09-25.md)也已在隔离宿主验证：关闭的引用文件外部改写后，旧计划在预览前被拒绝，磁盘与原类型文件保留；正常 Rename 编辑链继续通过。下一项复核未保存关联文件和实际安装候选的文件事件时序。

[未保存关联文件背后的磁盘改写](c3-dirty-related-disk-race-2026-09-25.md)现由 Rename 与 Safe Move 共用规划前磁盘摘要门禁；修复前 Rename 仍会打开旧预览，修复后两条命令均在预览前拒绝，并同时保留未保存缓冲区和外部写盘。下一项继续以独立 Composer 项目复核 C1/C2 的长会话反馈，再在新候选冻结时检查真实安装与 Remote 时序。

[当前 10 项 Pack 的真实 vendor 组合链](open-source-pack-10-real-vendor-c2-2026-09-25.md)已在独立 Composer 项目完成 200 轮标量切换与 30 轮联合形状切换；逐轮结果一致，首次标量 Hover 仍有 448 ms 的合成命令等待，服务端 Hover 最大约 1 ms。接下来的 Core 优先级是定位这段宿主等待，并以受控重叠检查取消、关闭与 watcher 时的旧结果；发现具体错误再修语义或请求生命周期。安装候选、Remote 与人工长会话仍按 C4 单列。

## 本轮执行决定

1. **保持单一能力所有者。** Core 是唯一通用 PHP 语言服务；Symfony、Twig、YAML、XML、调试、格式化、EditorConfig、Apache 片段和 PHPDoc 注释生成各有单一职责。Recommended Pack 不再作为安装入口；PHPStan 留给项目自行选择。
2. **将不稳定的测试视图移出默认安装。** 原版 `recca0120.vscode-phpunit` 3.9.40 在配置测试目录后仍使完整组合的文件操作门禁失败。项目 CLI 负责默认测试执行；内部同 ID 补丁只用于隔离评估，不当作 Marketplace 已交付版本。
3. **下一次交付组合时才冻结候选。** 同批记录 Core、Symfony、Pack 及 8 个默认外部成员的实际版本、来源和摘要，并完成干净 Profile、WSL Remote 及真实编辑器操作验收。日常 Core 变更继续用定向测试，不重复生成整套 VSIX。
4. **SoPHP 继续收口 C3 的编辑链。** 生成文件一次 Undo 已可删除，一次 Redo 仍没有恢复；最小资源操作、多次 Redo、聚焦、同事务插入及关闭自动关标签设置均有反例。下一轮只在出现新的可观察资源栈假设时继续探针；在此期间审计其它 C3 操作，并补 C1/C2 的长期一致性和等待证据。仅在找到一次 Undo/Redo 均可恢复的方案后改变产品生成命令。R4 的整体目标保持不变。

本轮继续审计时修复了 Import Class、Resolve Pasted Imports 与 Optimize Imports 在 `workspace.applyEdit` 返回 `false` 后静默结束的问题；现在显示对应的中英双语失败提示。源码 TypeScript、两处改动文件的 ESLint 和差异检查通过。生成文件的 Redo 门槛仍未通过，不能据此宣布 C3 完成。

后续审计又补齐 `workspace.applyEdit` **抛错**路径：Import Class、Resolve Pasted Imports、Optimize Imports 现在记录原始错误并显示同一条本地化失败提示，成功及返回 `false` 的处理保持一致。根扩展 `tsc --noEmit`、改动文件 ESLint 与差异检查通过；这轮尚未用宿主强制制造 VS Code 应用异常，故抛错时的实际弹窗仍待宿主验证。

Safe Move 后操作协调也收紧了“文件已被反向移动”的判定：只有 VS Code `FileNotFound` 才表示路径不存在；权限或其它 I/O 错误继续失败并进入现有重试/告警，不会误判为用户已撤销移动而跳过协调。定向单测覆盖存在、缺失、权限和普通 I/O 错误（3/3）；根扩展 TypeScript、相关 ESLint、差异检查，以及 VS Code 1.139.0 的独立 C3 扩展宿主均通过。宿主覆盖正常 Safe Move，不代表已经注入权限错误做真实文件系统验收。

Rename 预览期间的文件事件也补了隔离：`safeRename` 从 Provider 取得计划后，立即移除 Provider 为文件重命名钩子预先登记的文本编辑；仅在用户确认预览、且再次验证源码和磁盘快照后登记并应用。新增 C3 宿主场景在预览回调里独立移动同名目标文件、检查未确认的类名编辑没有被附带执行，再移回并取消预览；随后原有正式类型 Rename 及一次 Undo/Redo 继续通过。根扩展 TypeScript、相关 ESLint、差异检查和 VS Code 1.139.0 独立 C3 宿主退出码 0。直接由 VS Code F2 调用 Rename Provider 的暂存时序未在这一场景中改变；真实安装候选仍待验收。

**当前可执行顺序：**先以现有 10 项源码清单作为 Pack 基线，测试通过项目 CLI 执行；下一次候选冻结才核对实际安装版本和生成三份 VSIX。Core 接着复核 Import、Rename、Safe Move 的文件事件、预览、应用失败与撤销链，同时补 C1/C2 的长会话和类型反馈证据。类型生成文件的一次 Redo 仍是 C3 阻断项；已有探针未找到可用的 VS Code 资源撤销栈交互，只在出现新假设时继续调查，成功后再改产品命令。若标准交互无法实现，就调整生成流程的用户承诺与反馈。R4 保持最终目标。

## 当前组合

Open Source Pack 是唯一维护的组合安装入口。当前源码 manifest 有 10 个直接成员：SoPHP Core、SoPHP Symfony 和 8 个外部扩展。Pack 负责安装清单及少量默认设置；它不固定 Marketplace 成员版本，也不替代项目自己的 PHP、Composer、Xdebug、PHPUnit 或 PHP CS Fixer 配置。

| 能力所有者 | 扩展 ID | 使用边界 |
| --- | --- | --- |
| 通用 PHP 语义、导航、诊断和受支持重构 | `sohophp.php-companion` | 工作区只启用一个通用 PHP 语言服务；先看重构预览 |
| Symfony 服务、路由和 Controller 上下文 | `sohophp.php-companion-symfony` | 与 Core 使用同一候选 |
| Twig | `sohophp.twig-plus` | Twig 通用编辑能力由 TwigPlus 负责 |
| YAML、XML | `redhat.vscode-yaml`、`redhat.vscode-xml` | 通用语法、Schema 和格式化由各自扩展负责 |
| PHP 调试 | `xdebug.php-debug` | 项目须提供可用 Xdebug 和路径映射 |
| PHPUnit/Pest 测试 | 项目 CLI；测试视图扩展可选 | 默认 Pack 不安装原版 3.9.40；项目提供测试配置与运行时 |
| PHP 格式化、编辑约定 | `junstyle.php-cs-fixer`、`EditorConfig.EditorConfig` | PHP 只设一个默认 formatter；目标 PHP 须能运行项目级 fixer |
| Apache 配置片段 | `eiminsasete.apacheconf-snippets` | 所需 Apache 语法扩展由它自己声明依赖 |
| PHPDoc 注释生成 | `neilbrayfield.php-docblocker` | 负责写注释；Core 负责解析和使用文档类型 |

JSON、HTML、CSS、JavaScript 和 TypeScript 继续使用 VS Code 内建语言能力。PHPStan 是项目自选分析工具，不自动安装。额外通用 PHP Language Server 会与 Core 的编辑能力重叠；Symfony Language Tools 的普通 PHP Rename 冲突尚未解除，因此不进入默认组合。Recommended Pack 不再维护。

## 证据与交付状态

- [默认组合宿主门禁](open-source-pack-composition-gate-2026-09-24.md)验证了当时 10 项私有候选的基础编辑、格式化、测试与调试；当前源码后来增加了 PHP DocBlocker。已冻结 0.4.5 候选不能当作 11 项组合。
- [PHP DocBlocker 组合门禁](php-docblocker-composition-2026-09-24.md)和[完整成员 C3 宿主](open-source-pack-c3-profile-2026-09-24.md)覆盖了当时 11 项源码 Profile 的相应操作。最近的[四文件参数引用与 Rename](c3-parameter-family-references-2026-09-25.md)也通过当时的完整成员宿主；现行默认成员为 10 项。
- [PHPUnit 旧路径异常隔离](open-source-pack-phpunit-isolation-2026-09-25.md)在原版 3.9.40 的完整外部组合中复现；[隔离补丁评估](phpunit-enoent-patch-evaluation-2026-09-25.md)在当时的完整 11 项源码宿主通过一次相同序列。Marketplace 原版风险尚未解除；当前源码 Pack 已移出该成员。
- [原版成员的最新 C3 复核](open-source-pack-c3-original-recheck-2026-09-25.md)再次在已配置测试目录的原 11 项源码宿主中因 PHPUnit 旧路径 `ENOENT` 失败；内部补丁版第三次对照完整通过，前两次只在 Import 暂停测试前段停止。随后独立复核了现行 10 项组合。
- 现行 10 项组合已独立通过 C3 源码宿主及日常使用源码宿主。前者覆盖导入并发编辑、预览、文件生成与参数重构；后者覆盖独立 Composer 项目的编辑、格式化、Twig/YAML/XML、Xdebug 调试入口与 PHPUnit CLI。C3 日志为 `/tmp/sophp-c3-pack-10-configured-20260925.log`，日常组合日志为 `/tmp/sophp-pack-10-source-cli-config-20260925.log`；两者退出码均为 0。安装 VSIX、WSL Remote 与持续人工使用仍待单独验收。
- [测试提供者候选筛选](open-source-pack-test-provider-candidates-2026-09-25.md)核对了 PHPUnit Runner 与 PHPUnit Test Workbench；目前没有覆盖 PHPUnit/Pest 且通过同一组合门禁的直接替代者。因此现行默认组合采用项目 CLI。
- 2026-09-25 再核对上游：Marketplace 仍提供 PHPUnit & Pest Test Explorer 3.9.40，GitHub `main` 仍是此前补丁基线；补丁对新检出的同一提交可干净应用。[上游修复草稿](../patches/vscode-phpunit-enoent-upstream-draft.md)已备妥，但未对外提交。原版组合风险仍开放。
- [最小补丁的单个 VSIX 隔离验收](phpunit-enoent-installed-vsix-2026-09-25.md)进一步覆盖真实安装、完整 Pack C3、PHPUnit 与 Pest 的单文件/套件运行；同 ID 本地包仅用于内部评估，Marketplace 原版仍有组合风险。
- [已证明函数参数的变量实参重排](c3-reorder-variable-arguments-2026-09-25.md)在独立 C3 宿主及使用同一补丁版 PHPUnit 的完整 11 项源码 Profile 通过预览、取消、应用与一次 Undo/Redo；原版成员和 Remote 仍需单独验收。
- [当前 C3 阶段组合复核](open-source-pack-c3-optional-callable-2026-09-25.md)将默认参数段内重排及同名 callable 归属纳入完整 11 项源码宿主，使用哈希一致的内部 PHPUnit 补丁版退出码 0；默认 Marketplace 原版风险不因此关闭。
- [旧式数组末尾实参的外层调用定位](c3-refactor-outer-call-signature-2026-09-25.md)已修复新增/删除方法参数计划意外为空；定向语义测试及独立 C3 宿主通过，新增场景尚无单独编辑器操作证据。
- [嵌套实参的 C2 调用反馈](c2-nested-call-feedback-2026-09-25.md)让缺参诊断、未知命名参数与参数名提示从外层调用定位；语义、真实 stdio 与隔离 VS Code 宿主的诊断/提示及未保存修正往返通过，安装候选和 Remote 仍待验收。
- 同一 C2 定位修复已覆盖[嵌套实参的原生 `never` 控制流](c2-nested-call-feedback-2026-09-25.md)：语义正反例和隔离宿主的不可达诊断通过。[C3 Extract Method](c3-extract-nested-call-2026-09-25.md)也保留了嵌套实参调用的按值输入及原生输出类型；输出类型的预览、应用与一次 Undo/Redo 在隔离宿主通过。
- [删除方法参数时保留相邻注释](c3-remove-parameter-comments-2026-09-25.md)已修复声明与实参注释被连带删除的问题；语义测试 369/369 和独立 C3 扩展宿主通过预览、取消、应用及一次 Undo/Redo。完整 Pack 和安装候选仍待复核。
- [参数重排同步 PHPStan/Psalm 注释](c3-reorder-dialect-param-doc-2026-09-25.md)已修复这些注释留在旧顺序的问题；语义测试 371/371 和独立 C3 扩展宿主通过三文件预览、取消、应用及一次 Undo/Redo。完整 Pack 和安装候选仍待复核。
- [私有方法新增参数支持单行 PHPDoc](c3-add-private-inline-phpdoc-2026-09-25.md)已修复该格式下返回空计划的问题；语义测试 373/373 和独立 C3 扩展宿主通过取消、应用及一次 Undo/Redo。完整 Pack 和安装候选仍待复核。
- [方法引用查询纳入刚创建的未打开文件](c1-fresh-unopened-references-2026-09-25.md)已覆盖首次查询、无文件事件的重复查询及删除旧调用。独立 10,000 文件夹具在 experimental 模式下第二次 References 从 4,547 ms 降至 406 ms、第一次约 8 秒；在 Pack 默认 onDemand 模式下首次 1,357 ms、第二次 44 ms。最终完整 stdio 文件测试 166 通过、1 跳过；C1 宿主通过，12 次温 References 中位数 28 ms、最大 130 ms。安装候选和真实大项目等待仍待验证。
- [新增参数识别尾部注释中的逗号](c3-add-parameter-trailing-comment-2026-09-25.md)已修复块注释中的逗号被误认为尾随逗号的问题；真实尾随逗号仍拒绝。[新建且未打开的文件参与方法家族重构](c3-method-family-unopened-files-2026-09-25.md)随后修复文件事件与关闭文件语法树缺口：语义测试 377/377、定向 stdio，以及只打开接口的三文件新增和删除参数 C3 扩展宿主均通过取消、应用与一次 Undo/Redo。完整 Pack 和安装候选仍待复核。
- [预览式 Rename 失败反馈本地化](c3-rename-failure-localization-2026-09-25.md)让快照缺失、预览关闭、文件变化和应用失败按 VS Code 界面语言提示；根扩展 TypeScript、相关 ESLint、本地化单测 2/2 及独立 C3 宿主通过。中文真实弹窗和安装候选仍待验收。
- 这些是隔离 Linux Extension Host 的自动证据。公开 Marketplace 页面、用户已安装的 VSIX、WSL Remote、跨平台和持续真实编码需分别验收。下一次交付 10 项组合时，再同批冻结 Core、Symfony、Pack 和外部成员版本及摘要。
- 本轮 Pack manifest 定向测试 4/4 通过。独立 Composer 夹具含约 10,130 个 PHP 文件的冷 References 源码宿主单次查询返回 2 处结果、等待 1,192 ms、候选版本重试 0、退出码 0；日志为 `/tmp/sophp-c1-cold-references-20260925.log`。它仅是一个 Linux 冷启动样本，不代表 P95、Remote 或完整 Pack 的等待表现。

## 当前使用决定

| 项目 | 决定 | 下一道验证 |
| --- | --- | --- |
| Core、Symfony、Twig、YAML/XML、格式化、调试、EditorConfig、Apache、PHPDoc | 保持现有单一能力所有者和 10 项源码清单；不因 Core 日常增量重新打包 | 下一次候选冻结时核对实际安装版本、Remote 运行位置与组合操作 |
| PHPUnit/Pest 测试入口 | 默认使用项目 CLI；原版 `recca0120.vscode-phpunit` 不随 Pack 安装 | 上游修复或有独立 ID、维护责任的候选交付后，重跑文件事件、PHPUnit/Pest 运行与调试、Remote 门禁 |
| PHPStan | 项目自选，不进入默认 Pack | 项目已有配置时单独检查诊断归属、耗时和关闭恢复 |
| Recommended Pack、其它通用 PHP Language Server、Symfony Language Tools | 不进入新候选 | 只有解决已记录的能力冲突并通过相同门禁才重新评估 |

原版 PHPUnit 3.9.40 的旧路径错误在**已配置**测试目录的完整组合中也出现过。配置测试目录是运行测试的前提，不是该错误的修复。补丁单 VSIX 已通过隔离安装及 PHPUnit/Pest 基本运行，但当前 Marketplace 安装仍得到原版；本地同 ID 产物不作为公开发布物。

## Pack 后续处理顺序

1. **先处理测试入口风险。** PHPUnit/Pest CLI 步骤已写进 [Pack 安装说明](../../../packages/php-companion-extension-pack/README.md)。[上游修复说明草稿](../patches/vscode-phpunit-enoent-upstream-draft.md)与可应用补丁已备妥，尚未对外提交；只有上游修复或独立维护的替代者覆盖 PHPUnit 与 Pest 并通过相同文件事件及运行门禁后，才重新纳入默认清单。不能把内部同 ID 补丁当作 Marketplace 已交付版本。
2. **候选冻结时核对实际组合。** 记录 10 项的实际安装版本、来源和摘要，并同批构建 Core、Symfony、Pack；在干净 Profile 中验证 PHP 语言服务唯一归属、PHP/Twig/YAML/XML 编辑、格式化、CLI 测试、调试及文件变动。Pack manifest 的扩展 ID 不固定外部成员版本，旧 0.4.5 候选与当前源码不同。
3. **完成安装环境验收。** 单列 Windows 客户端连接 WSL Remote 的扩展运行位置、PHP CLI/Composer/Xdebug/测试命令路径和真实编辑器操作；将源码宿主、安装候选与人工长期使用分开记录。日常 Core 增量只跑相关测试，不为每项改动重新打包。

## Core 从哪里开始

**先收口 C3 的可靠编辑链，同时维护 C1/C2 的一致性门槛。** 四文件参数家族 Rename、新增与删除参数，以及三文件[参数重排](c3-reorder-method-family-parameters-2026-09-25.md)已在源码宿主通过预览、取消、应用及一次 Undo/Redo；[已证明来自函数参数或调用前直接赋值的裸变量实参](c3-reorder-variable-arguments-2026-09-25.md)、[有明确名称归属的混合实参](c3-reorder-mixed-named-arguments-2026-09-25.md)与[默认参数的段内换位](c3-reorder-optional-parameters-2026-09-25.md)也已纳入相同重排链。接下来按以下顺序继续：

1. **收口 C3 高频编辑链。** 先核对 Import、Rename 与 Safe Move 在文件变动、预览取消和应用失败后的结果与一次 Undo/Redo；现有生成文件资源编辑探针已覆盖常见交互但一次 Redo 仍未恢复，只有出现新的可观察撤销栈假设时才继续探针，不能把生成流程标为完成。已配置测试目录的 PHPUnit 测试文件 Rename 有[一次完整 Pack 通过记录](c3-generation-redo-phpunit-rename-2026-09-25.md)，但后续完整组合也复现过原版扩展的旧路径错误。已定位的外部异常按上节单独处理。
   [测试类目标目录与预览](c3-test-generation-target-2026-09-25.md)已显示最终路径，并在多个 Composer 测试目录时要求选择；新增文件事件与配置过的 PHPUnit Rename 交错仍需单独验证外部扩展稳定性。
   [生成目标的文件系统类型判定](c3-generation-target-file-type-2026-09-25.md)已修正带点的 Composer 映射根目录，并在独立 C3 宿主验证；生成文件的一次 Redo 门槛仍开放。
   [类型生成命令结果](c3-generation-command-outcome-2026-09-25.md)现在只在文件已创建后返回 `true`，取消、过期或创建失败返回 `false`；创建后打开编辑器失败会明确提示“文件已创建”。独立与当前 10 项 Pack 的 C3 源码宿主通过，打开失败异常也已在独立宿主注入并验证文件仍存在；人工通知呈现及安装候选仍待核对，Redo 门槛不因此关闭。
   [PHP 类型名与命名空间保留词校验](c3-generation-php-identifiers-2026-09-25.md)已按目标版本拒绝确定无效的生成输入，并在独立 C3 宿主验证；它不改变文件创建的 Redo 门槛。
   [预览期间目标 PHP 版本变化防护](c3-generation-version-preview-2026-09-25.md)已拒绝旧版本下预览、新版本下应用的无效生成；仍需解决资源 Redo。
   [Composer 映射变化防护](c3-generation-composer-snapshot-2026-09-25.md)在独立 Core/Symfony 宿主通过；同次完整 Pack 宿主再现 PHPUnit 扩展的间歇性旧路径读取异常，因此这次完整组合门禁失败。
   生成目标目录创建或 VS Code 应用文件编辑抛错时，现在向用户显示创建失败原因；源码 TypeScript、改动文件 ESLint 与差异检查通过。这个反馈改进不代表生成文件的一次 Redo 已通过。
2. **审计其余高频编辑。** 保持新增、删除参数仅处理完整工作区中可证明的方法家族、声明、PHPDoc 和调用；删除实参会丢弃有副作用的表达式时拒绝。[同名 first-class callable 归属](c3-method-family-callable-scope-2026-09-25.md)已修正无关固定目标导致的误拒绝，并在独立 C3 宿主通过。用当前 10 项 Pack 源码 Profile 检查其它 C3 操作的结果、等待、冲突、预览与一次 Undo/Redo。[重构动作源文件磁盘快照](c3-refactor-source-disk-snapshot-2026-09-25.md)已在独立和此前完整 Pack 的 C3 源码宿主通过，Remote 仍待复核。

   [参数重构预览命令反馈](c3-preview-command-outcome-2026-09-25.md)已改为仅在编辑真正应用后返回 `true`；取消、过期快照和应用失败返回 `false`，`applyEdit` 抛错有本地化提示。独立 C3 宿主通过，`applyEdit` 抛错注入及该场景的完整 Pack 组合仍待验收。

   [编辑应用后打开结果失败](c3-applied-result-open-failure-2026-09-25.md)现不会把已完成的预览重构或 Safe Rename 误报为失败；独立及当前 10 项 Pack 的 C3 宿主注入打开异常，验证命令仍返回 `true`、文本已改动及一次 Undo/Redo。真实 Remote 打开失败仍待候选验收。

   [Optimize Imports 命令结果](c3-optimize-imports-command-outcome-2026-09-25.md)已改为只在编辑成功应用后返回 `true`；取消或关闭预览返回 `false`，独立及当前 10 项 Pack 的 C3 源码宿主验证了文档不变及成功应用后的一次 Undo/Redo。应用异常注入、安装候选和 Remote 仍待复核。

   [Optimize Imports 磁盘快照](c3-optimize-imports-disk-snapshot-2026-09-25.md)在预览期间外部文件改写而打开文档版本未变时，拒绝旧导入计划并保留磁盘内容；独立及当前 10 项 Pack 的 C3 源码宿主通过，安装与 Remote 环境另行核对。

   [Import Class 与 Resolve Pasted Imports 磁盘快照](c3-import-disk-snapshot-2026-09-25.md)沿用同一守卫；外部写盘而打开文档版本未变时，不再应用旧导入计划。独立及当前 10 项 Pack 的 C3 源码宿主通过，安装与 Remote 环境另行核对。

   [两条导入命令的结果反馈](c3-import-command-outcomes-2026-09-25.md)现仅在编辑实际应用后返回 `true`，取消、过期或失败返回 `false`。独立及当前 10 项 Pack 的 C3 源码宿主覆盖并发编辑、外部磁盘改写、正常应用及一次 Undo/Redo；旧索引模式应用抛错注入、安装候选和 Remote 仍待复核。

   [Safe Move 预览期间的外部源文件改写](c3-safe-move-external-disk-2026-09-25.md)已由独立 C3 宿主验证：计划拒绝移动、保留外部内容，恢复夹具后正常移动及一次 Undo/Redo 继续通过。现有保护未改，安装候选与真实资源管理器操作仍待复核。

   [Safe Move 命令结果](c3-safe-move-command-outcome-2026-09-25.md)现区分取消/失败与实际应用；独立及当前 10 项 Pack 的 C3 源码宿主均覆盖预览取消、关闭预览、外部磁盘改写、成功移动和一次 Undo/Redo。旧索引刷新失败注入、安装候选与 Remote 仍待验证。

   [预览前目标文件被删除](c3-preview-deleted-target-2026-09-25.md)现在按过期计划拒绝，不再让 `FileNotFound` 直接中断命令；独立 C3 宿主验证没有打开预览或改动源文件。其它 I/O 错误及 Remote 仍需单独验证。
3. **补齐 C1/C2 与 C4 证据。** 对独立 Composer 项目复核六项日常查询在未保存编辑、取消与文件事件后的同一版本结果，并继续长会话、跨平台及 Remote 验收。只有冻结可安装候选时才重新打包和执行完整组合门禁；R4 仍是最终目标。

   [10,130 文件、500 轮未保存编辑链](c1-real-composer-500-round-chain-2026-09-25.md)已完成 3,000 次六项查询，结果全部正确，语言服务器内存采样没有持续单向增长；方法 References 中位等待 619 ms、P95 750 ms。下一项 C1 工作是分段定位新增未打开文件新鲜度证明的等待成本，在保留该正确性门槛下优化，再重跑长链。

   后续分段计时定位到交替方法查询的新鲜度证据互相覆盖，已[按方法查询键限量保存](c1-method-reference-keyed-freshness-2026-09-25.md)。相同 10k 夹具修复后 200 轮六项查询全部正确，References 中位等待 125 ms、P95 174 ms；500 轮数据仍是修复前基线。下一步继续压低温态等待，并补修复后的更长会话及安装候选验收。

   修复后同一夹具进一步完成 1,000 轮、6,000 次六项查询，References 中位等待 123 ms、P95 171 ms；内存采样在后半段两次明显回落，末轮 RSS 低于起始。安装候选、WSL Remote、跨平台及真实长期会话仍待验证。

   [当前 10 项 Pack 的真实 vendor C2 宿主](open-source-pack-10-real-vendor-c2-2026-09-25.md)已在约 10,131 个 PHP 文件中完成两次 50 轮未保存标量反馈和 30 轮 PHPDoc 联合形状反馈；逐轮结果一致，P95 分别为 128/200 ms 与 150/199 ms。第二轮唯一超过 500 ms 的标量等待发生在第 1 轮（947 ms），后续轮次未重复；这仍是 Linux 源码 Profile，不能代替安装或 Remote 验收。

   后续隔离测量发现，原先 912/968 ms 的首轮宿主实际加载了旧扩展 bundle，不能用于评价新修正。重建实际加载的 bundle 后，两次 5 轮完整 Pack 宿主的首轮分别为 624/665 ms、诊断计算均为 4 次；旧 bundle 同条件有 68 次。相同 PHP 环境通知引起的重复诊断刷新已过滤，并通过定向 stdio 与完整源码宿主。首次合成 Hover 仍有明显波动；下一步定位命令等待，并用更长序列核对新 bundle 的稳定性，安装候选和 Remote 验收仍单列。

   实际 bundle 的后续 50 轮标量、30 轮联合形状完整宿主退出码 0；标量 P50/P95 为 111/167 ms，联合形状为 163/249 ms。标量唯一超过 500 ms 的仍是首轮 682 ms，其中服务端 Hover 约 1 ms、合成 Hover 命令 576 ms；首轮诊断计算 4 次。下一步用隔离宿主核对首次合成 Hover 的等待是否来自其它扩展或 VS Code 命令调度，避免在服务端做无依据的性能改动。C3 生成文件 Redo 缺口仍并行开放。

   只运行同一真实 vendor C2 探针的隔离宿主对照已通过：Core＋Symfony＋Pack 的首次合成 Hover 6 ms，加入 8 个外部成员为 10 ms。完整组合流程后的约 576 ms 等待未在这组对照中复现，不能归咎于某个默认 Pack 成员。下一步若继续调查等待，应比较完整组合各阶段结束后的命令队列；当前优先回到 C3 高频编辑和生成文件 Redo 的明确缺口。

类型生成文件的 Redo 仍有[独立宿主重现](c3-type-generation-undo-redo-probe-2026-09-24.md)：Undo 可删除新文件，随后一次 Redo 未恢复它。这项问题并行做有界调查，不把尚未通过的生成流程计入 C3 完成。C1/C2 的冷查询、长会话与 Remote 证据继续按阶段门槛补齐；R4 的最终目标和组合验收不变。
