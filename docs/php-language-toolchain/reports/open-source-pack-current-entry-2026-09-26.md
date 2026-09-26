# Open Source Pack 当前入口与 SoPHP 下一步

日期：2026-09-26。此页是当前执行摘要；此前的[详细过程记录](open-source-pack-next-core-2026-09-25.md)保留各阶段证据，遇到旧候选号或旧“下一步”时以本页为准。没有修改业务项目。

## 当前可执行清单

| 顺序 | 交付动作 | 完成依据 |
| --- | --- | --- |
| 1. 固定 Open Source Pack | 保持 [manifest](../../../packages/php-companion-extension-pack/package.json) 中 Core、Symfony 和 8 个外部扩展共 10 项；PHPDoc 生成、PHP 格式化、调试、Twig、YAML/XML 各有一个所有者，PHPUnit/Pest 由项目 CLI 执行 | manifest 与[外部版本清单](../../../test/extension/open-source-profile.extensions.json)一致；不把可选测试视图或第二个 PHP Language Server 加进默认包 |
| 2. 从 SoPHP 的可见缺口开工 | [路由数据不完整反馈](symfony-route-incomplete-feedback-2026-09-26.md)已在源码中接入并通过隔离 VS Code Workbench；接着核对 Symfony Controller→Twig 与路由操作链，继续修 C1/C2 的实际错误 | 路由状态的 stdio 与双 Composer 项目状态栏恢复用例已通过；安装候选、未保存编辑链和真实 WSL Remote 仍待验收 |
| 3. 收口安全编辑 | 对 Import、Rename、Safe Move、Extract、Inline、类型生成按实际使用频率验证预览、取消、应用结果及一次 Undo/Redo | 完整应用才报成功，未应用或部分应用有清楚反馈；最终 `createFile` 兜底 Redo 继续单列 |
| 4. 冻结下一候选 | 先决定当前 0.4.5 增量与独立 0.4.6 发布分支的来源及版本，再一次性构建 Core、Symfony、Pack | 固定三份 VSIX 和外部扩展摘要，隔离安装与真实 WSL Remote 操作链通过；不因每个源码修复重复打包 |

当前可安装试用的 `15a5254` 候选使用 TwigPlus 1.3.7；已发布的 1.3.8 只进入下一组合的源码 Profile。当前共享工作树有未冻结改动，且与独立 0.4.6 发布分支存在重叠。2026-09-26 重新构建后，完整 `pnpm test` 退出码 0；这只验证当前源码，以上新增源码能力均不能按旧候选的已安装功能宣传。R4 的目标仍是完整、稳定的 PhpStorm 式 PHP 开发体验。

## 本次决策与执行起点

- Open Source Pack 保持 10 个直接成员：Core、Symfony 和 8 个外部扩展。`extensionPack` 与冻结 Profile 一致，manifest 定向检查 4/4 通过。它们分别负责 PHP 语义、Symfony、Twig、YAML、XML、调试、格式化、编辑约定、Apache 配置片段和 PHPDoc 注释生成；测试默认用项目 PHPUnit/Pest CLI。当前没有需要加入默认清单的扩展。
- 私有 `15a5254` 是已经核对内容的安装试用候选；此后 C1/C2/C3 的源码增量没有进入该候选。公开 Marketplace 的 Pack 页面仍显示旧组合，不能作为这份 10 项清单的安装证据。只有下一次交付冻结时才同批重新打包 Core、Symfony、Pack。
- [Symfony 路由数据不完整时的反馈](symfony-route-incomplete-feedback-2026-09-26.md)已在源码中接入：服务端拒绝不完整路由图，并让客户端对当前项目的 PHP 文件显示可撤销的状态栏提示；stdio 恢复与隔离 Workbench 的双项目切换、恢复用例通过。安装候选与 WSL Remote 仍待验收。接下来继续 C1/C2 的实际错误、Symfony 跨语言操作链和 C3 安全编辑闭环。最终 `createFile` 兜底的 Redo 是已知未通过项，只有找到新的资源撤销栈线索才重开该路径。
- [Controller 的 `compact()` 模板变量](symfony-controller-compact-context-2026-09-26.md)现将 `render()` 参数和 `#[Template]` 直接返回中可证明的 PHP 方法参数传给 TwigPlus；独立 Core＋Symfony＋TwigPlus 1.3.8 源码宿主中的模板补全与跳转通过。动态与未知变量保持不完整，安装候选仍待验收。
- [Controller 局部 `compact()` 来源](symfony-controller-compact-local-context-2026-09-26.md)现覆盖紧邻模板调用的同层直接赋值，TwigPlus 定向宿主的局部变量补全、Definition 与 `#[Template]` 跳转通过；分支与中途改写继续保守。[最新完整 10 项源码组合](open-source-pack-compact-local-composition-2026-09-26.md)已复跑通过。
- [连续直接赋值的 `compact()` 来源](symfony-controller-consecutive-compact-context-2026-09-26.md)进一步覆盖同层连续准备多个模板变量，包括 `#[Template]` 直接返回；较晚赋值可能改写旧变量时停止向前追溯。框架 67/67、Provider 8/8，完整 10 项源码 Profile 中 TwigPlus 对第二个变量的补全和 PHP 跳转通过；增量尚未进入冻结候选。
- [未保存 `compact()` 变量改名反馈](symfony-controller-compact-unsaved-rename-2026-09-26.md)已在同一 Twig 模板验证旧名称撤销、新名称补全与跳转，以及 Controller Revert 恢复；隔离三扩展宿主和完整 10 项源码 Profile 均退出码 0。测试宿主还隔离了单独 Symfony 上下文运行的用户数据目录。
- 首项已处理 [Safe Move 确认后关闭预览的时序缺口](c3-safe-move-preview-final-check-2026-09-26.md)：应用前再次核对差异标签，关闭即拒绝移动；VS Code 1.139.1 Linux x64 的完整 C3 源码宿主退出码 0。该增量尚未进入冻结候选。
- 同类检查现已扩至 [Rename 与多文件 Extract](c3-rename-extract-preview-final-check-2026-09-26.md)：确认后关闭任一预览会取消应用，并保留相关文件。完整 C3 源码宿主在最终逻辑下复跑通过；Optimize Imports 在确认预览后会先关闭预览再进入最终源文件核对，不属于仍可关闭预览的窗口。
- [重叠 PSR-4 目录的类型生成](c3-ambiguous-psr4-type-generation-2026-09-26.md)现要求选择命名空间；取消不会创建文件，完整 C3 源码宿主退出码 0。该增量尚未进入冻结候选。
- [多工作区类型生成](c3-multiroot-type-generation-stage-2026-09-26.md)现从活动文件选择所属工作区，让备用暂存文件位于正确项目旁边；独立双 Composer 项目宿主覆盖首次移动失败，完整 C3 源码宿主退出码 0。
- [资源移动后的类型生成结果](c3-type-generation-post-apply-outcome-2026-09-26.md)现按暂存文件消失和目标内容一致确认成功，避免 API 在移动后返回失败或抛错时误报；两种注入场景的一次 Undo/Redo 和完整 C3 源码宿主通过。普通 C3 宿主也改用独立用户数据目录，防止多工作区用例污染下一轮运行。
- [Safe Rename 应用后结果](c3-safe-rename-post-apply-outcome-2026-09-26.md)现处理 `applyEdit` 在全部修改完成后返回失败或抛错：完整文本与文件移动核对通过才报告成功；未应用仍报告失败。本地变量及 PSR-4 文件改名的一次 Undo/Redo 和完整 C3 源码宿主通过；增量尚未进入冻结候选。
- [Safe Move 应用后结果](c3-safe-move-post-apply-outcome-2026-09-26.md)也按旧路径、目标路径和所有参与文件的完整文本核对实际结果：完整移动后返回失败或抛错不再误报；未应用仍拒绝。普通与全局 PSR-4 移动、跨文件引用及一次 Undo/Redo 在完整 C3 源码宿主通过；增量尚未进入冻结候选。
- [导入命令应用后结果](c3-import-post-apply-outcome-2026-09-26.md)现让 Import Class、粘贴导入和 Optimize Imports 核对完整文档结果：编辑完成后 API 返回失败或抛错时不再误报，未应用仍拒绝；六种注入场景的 Undo/Redo 与完整 C3 源码宿主通过，未进入冻结候选。
- [预览式 Extract 应用后结果](c3-extract-post-apply-outcome-2026-09-26.md)现逐个核对多文件预期文本：完整应用后 API 返回失败或抛错不再误报，未应用和部分应用仍拒绝；完整 C3 源码宿主与一次 Undo/Redo 通过，未进入冻结候选。
- [粘贴导入计划的新鲜度](c2-paste-import-plan-freshness-2026-09-26.md)现检查目标文档版本和磁盘快照；真实导入计划请求暂停期间编辑 PHP 文件后，Provider 会丢弃旧建议，完整 10 项 Pack 源码宿主通过，未进入冻结候选。
- [嵌套 Composer 版本状态栏](c1-nested-composer-version-status-2026-09-26.md)现跟随活动文件的项目状态；内层 PHP 8.5 与外层 PHP 7.2 来回切换已在完整 C1 源码宿主通过，避免状态提示与实际诊断版本不一致。
- [版本选择与工作区移除](c1-nested-composer-version-status-2026-09-26.md)现标记活动项目版本、提示设置影响整个工作区，并清理已移除 Composer 根的版本状态与监听；完整 C1 源码宿主通过。
- [PSR-0 补全归属](c1-psr0-completion-ownership-2026-09-26.md)已复现“打开错误路径 PHP 文件后建议不可加载类名”的双来源问题：SoPHP 校验 PSR-0 候选来源路径。[后续同文件作用域复现](c1-scoped-variable-completion-2026-09-26.md)发现通用单词建议仍会跨函数串出局部变量，因此 Core 和 Pack 改为关闭 PHP 通用单词建议，由 SoPHP 提供作用域内变量补全；合法类、本函数变量和箭头函数外层变量的完整 10 项源码 Profile C1 宿主已通过。
- [作用域变量补全扩展](c1-scoped-foreach-and-this-completion-2026-09-26.md)现覆盖 `foreach` 键变量、实例闭包与属性钩子的 `$this`，并排除静态闭包／箭头函数的 `$this`；parser 85/85、semantic 406/406，最终完整 10 项 Pack 的 C1 源码宿主通过。该增量尚未进入冻结候选。
- [变量名中间接受补全](c1-variable-middle-token-replacement-2026-09-26.md)现在替换整个变量 token，避免 `$cust|OldTail` 接受 `$customerName` 后留下旧后缀；定向语义测试和完整 10 项 Pack 的 C1 源码宿主通过，未进入冻结候选。
- [解构赋值后的变量建议](c1-destructured-variable-completion-2026-09-26.md)现覆盖短数组、`list()`、嵌套和引用绑定，排除键表达式；parser 86/86、semantic 406/406，完整 10 项 Pack 的 C1 源码宿主通过。该增量尚未进入冻结候选。
- [函数内 `global` / `static` 变量建议](c1-global-static-local-completion-2026-09-26.md)现从直接声明提取作用域候选；parser 87/87、semantic 406/406，完整 10 项 Pack 的 C1 源码宿主通过。该增量尚未进入冻结候选。
- [冒号后的局部变量补全](c1-colon-local-variable-completion-2026-09-26.md)修复命名实参 `value:$user` 与三元表达式 `:$user` 被误当作静态属性上下文的问题；`Class::$user` 继续排除。语义 408/408、隔离 Core 与完整 10 项 Pack 的 C1 源码宿主通过，未进入冻结候选。
- C4 在下一候选冻结后核对真实 WSL Remote 的 Extension Host 归属、唯一 PHP Provider、项目工具路径及持续操作；R4 仍以完整 PHP 开发体验为验收目标。自动化 Core 开发不等待人工试用反馈，也不修改业务项目代码。
- [当前 WSL Profile 的只读核查](c4-current-wsl-profile-readonly-audit-2026-09-26.md)确认产品和八个外部成员已安装，但 PHP Debug 1.40.2 与候选固定的 1.40.1 不同，排除清单中的 PHPUnit Test Explorer 也已安装；预检现在列出排除成员供核对启用状态。由于本次不是 WSL 集成终端且未核对安装内容，严格 C4 门禁仍未通过。
- [TwigPlus 1.3.8 已发布版本](open-source-pack-twigplus-138-release-2026-09-26.md)现进入新组合的固定外部清单；已发布 VSIX 的摘要、隔离宿主实际加载路径和完整 10 项源码 Profile 均已核对。旧私有候选仍固定 1.3.7；当前 WSL 安装列表也已恢复为 1.3.7。
- [下一候选冻结前门禁](open-source-pack-freeze-readiness-2026-09-26.md)发现仓库已有独立的 0.4.6 发布分支，Core/Symfony 与 Pack 版本并不同步；当前源码的类型检查、Lint 通过。此前完整 `pnpm test` 因旧的 `$` 补全能力断言失败；修正后一次运行又因源码与 `dist` 不同步出现四项 stdio 失败。重新构建语义包和语言服务后四项定向回归通过，随后完整 `pnpm test` 退出码 0：语义包 407/407、语言服务 380 通过和 1 跳过、Symfony 扩展 10/10、根扩展 69/69。未另建候选或重复打包。

## 可用组合

唯一维护的安装入口是 [Open Source Pack manifest](../../../packages/php-companion-extension-pack/package.json)，直接成员恰好 10 项：SoPHP Core、SoPHP Symfony、TwigPlus、Red Hat YAML、Red Hat XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets、PHP DocBlocker。Apache 片段的语法依赖由该扩展自身声明。SoPHP Core 负责通用 PHP 语义；Symfony 负责框架事实；Twig/YAML/XML、调试、格式化、PHPDoc 注释生成分别由上述成熟扩展负责。测试默认由项目 PHPUnit/Pest CLI 执行。

Recommended Pack 已停止新候选交付。原版 PHPUnit & Pest Test Explorer 3.9.40 在完整组合的测试文件 Rename 后读取旧路径，故不自动安装；[PHPUnit Runner 0.2.0](open-source-pack-test-provider-candidates-2026-09-25.md)只供单独评估。也不自动安装第二个通用 PHP Language Server、第三方 Symfony Language Tools、数据库客户端或项目级 PHPStan。一个编辑能力只由一个明确的 Provider 负责。

当前[私有候选 `15a5254`](alpha-15a5254-packaged-profile-2026-09-26.md)包含同批 Core、Symfony、Pack 三份 VSIX，三份 SHA-256 已核对，10 项组合的实际 VSIX 内容在隔离 Linux 宿主通过。[2026-09-25 的公开 Marketplace 核查](open-source-pack-marketplace-audit-2026-09-25.md)发现公开 0.4.5 Pack 仍是旧成员，当时 Symfony 也未公开上架；不能用该公开包替代已验证的私有候选。Pack 的 manifest 只固定扩展 ID，外部成员实际版本以候选 `candidate.json` 为准。

实际起步顺序：在独立 Profile 中安装该候选的 Core、Symfony、Open Source Pack；按候选清单核对八个外部成员的版本与唯一 PHP 语言服务。项目 PHP、PHP CS Fixer、Xdebug 和 PHPUnit/Pest CLI 使用各自的可执行路径；PHPDoc 输入交给 PHP DocBlocker，PHP 类型消费交给 Core。真实 WSL Remote Extension Host 归属、完整操作链和长会话还没有验收，因此候选状态是“可安装试用”，不是 R4 完成。

这份清单已经固定职责，不因 Core 日常修复再次增加通用 PHP Language Server、Symfony Provider、测试视图或数据库客户端。只有新候选冻结时才同批打包三份 VSIX；日常开发使用定向源码与宿主测试。

### 当前交付状态

| 层次 | 现在能确认什么 | 仍需完成什么 |
| --- | --- | --- |
| `15a5254` 私有安装候选 | Core、Symfony、Pack 三份 VSIX 与冻结的外部成员通过隔离 Linux 安装宿主；可用于受限试用 | 真实 VS Code WSL Remote 的 Extension Host、项目工具路径和连续操作验收 |
| 当前 10 项源码组合 | Core、Symfony、Pack、当前 TwigPlus 源码与其余七项外部成员通过[完整 Profile](open-source-pack-symfony-context-source-profile-2026-09-26.md)；新增 Symfony→Twig 上下文及未保存编辑往返已覆盖 | 这些新代码尚未进入上述 VSIX；交付时重新冻结，并核对安装后的内容和行为 |
| 公开 Marketplace | 2026-09-25 核查时 Pack 仍是旧成员清单 | 新组合公开发布需要单独的发布决定与发布后核验 |

Pack 只安装扩展，不能代替项目的 PHP、Composer、PHP CS Fixer、Xdebug 或 PHPUnit/Pest 配置。默认测试入口继续使用项目 CLI；PHPStan 与测试视图按项目单独选择。当前没有需要再加入默认清单的扩展。

### 下一轮执行顺序

1. **固定组合基线。** 保持 10 个直接成员和现有能力所有者；用 manifest 检查防止成员或默认 formatter 意外变化。新组合 Profile 将 TwigPlus 固定为已发布的 1.3.8；旧 `15a5254` 候选仍按其原始清单固定 1.3.7。
2. **从 SoPHP 的真实编码动作开始。** 在独立 Composer 项目用默认 `onDemand` 连续执行输入类名、自动导入、修改未保存声明、参数提示、Hover、Definition、References 和诊断；同时记录输入到建议可见的等待。先修错误或过期结果，再修有证据的慢阶段。PHPDoc 注释继续由 PHP DocBlocker 生成，Core 只消费其类型。
3. **完成跨语言任务链。** 继续用同一 Profile 检查 Symfony Controller→Twig、服务/路由配置、格式化、调试和项目 CLI 测试，重点核对未保存编辑、关闭与重新打开后是否撤销旧结果。当前源码宿主已通过这一链，后续更改只重跑受影响的门禁。
4. **收口安全编辑。** C1/C2 的常用动作稳定后，对 Import、Rename、Safe Move、Extract、Inline 和类型生成逐项检查预览、取消、失败提示和一次 Undo/Redo；`createFile` 最终兜底的 Redo 仍是明确缺口。超出可证明范围的重构保持关闭。
5. **到交付点再冻结候选。** 将上述源码增量作为一批，记录 Core、Symfony、Pack 和 TwigPlus 的准确来源及摘要，做隔离安装与真实 WSL Remote 验收。日常源码改动不重复打包；R4 仍以完整日常体验、版本/系统矩阵和长时间使用为最终门槛。

## 本轮补充门禁

[冻结候选九个目标 PHP 版本的 C1 宿主报告](f02-alpha-nine-target-host-2026-09-26.md)已完成 7.2–8.5 各一次：六项编辑查询、未保存类型切换、vendor、多根隔离和有限版本语法诊断全部通过。九个目标设置不等于九个实际 PHP CLI 或 F02 完整语法矩阵。

通过 `PHP_COMPANION_TEST_PHP_BINARIES` 对本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 六个独立 CLI 运行时探针：6/6 通过。这只证明 CLI 探测和版本识别，不是九版本完整语义矩阵；PHP 7.3、8.0、8.3 的本机 CLI 尚缺。

新增测试宿主选项 `PHP_COMPANION_TEST_C1_PRODUCTS_DIR`，从候选三份 VSIX 解包目录加载 Core、Symfony、Pack，并核对三者 manifest ID；八个冻结外部成员来自隔离扩展目录。VS Code 1.139.0 Linux x64 中，C1 按九个目标版本各跑一次完整六项编辑查询、未保存接收者类型切换、Composer vendor 与多根工作区链，均退出码 0。7.2/8.5 的首次补全为 174/173 ms；12 次温态 References 命令中位数为 30/29 ms。逐版本日志见上方报告。

这九次是**目标版本设置**下的候选内容编辑器测试；宿主测试未调用相应 PHP CLI 编译每个用例。隔离 Linux Extension Host 也不能证明真实 WSL Remote 的安装位置、输入到建议列表可见时间、Windows/macOS 或持续两小时使用。

## SoPHP 从哪里继续

1. **C1：先保证常用候选找得到，再查可见等待。** 默认 `onDemand` 的[未打开 PSR-4 类补全](c1-ondemand-unopened-type-completion-2026-09-26.md)覆盖同命名空间、已导入别名和跨命名空间自动导入；[Composer classmap/files](c1-ondemand-classmap-type-completion-2026-09-26.md)的不同名文件已通过真实 stdio 与 VS Code Core 源码宿主。[PSR-0 与便携搜索](c1-psr0-portable-type-completion-2026-09-26.md)也已通过独立 Composer 项目的 stdio 与隔离 VS Code 1.139.1 Core 源码宿主；错误 PSR-0 路径中的声明被排除，强制无 `rg` 分支补出 PSR-4、classmap 和 PSR-0 类型。PSR-4 约 1k/10k/50k 文件的首次 LSP 请求中位数为 38/34/47 ms，classmap 为 51/61/108 ms，PSR-0 为 55/66/109 ms；六轮跨命名空间 PSR-4 类建议在输入后 246–275 ms 可见，中位数 255 ms。锁定的本地 Composer PSR-0 包经 `vendor/` 安装后，Core 宿主补全、导入及未先补全时的冷启动定义跳转通过；一次建议弹窗在输入后 237 ms 可见。当前源码尚未进入 `15a5254` 候选。下一项是长会话与安装后的 Remote 验收。[已加载类型遍历优化](c1-type-completion-scale-2026-09-26.md)的 50k 内存热查询 P95 约 80 ms，只证明语义层。

   本轮补上[原生联合与交集类型的后续补全](c1-composite-native-type-completion-2026-09-26.md)：`string|Inv` 等参数、返回和属性位置会继续走未打开 Composer 类型候选；表达式位置不误触发。语义 347/347、真实 stdio 定向用例及 VS Code 1.139.1 Core 源码宿主均通过；本次改动尚未做安装候选和真实 WSL Remote 验收。

   随后补上[参数 Attribute 后的类型补全](c1-attributed-parameter-type-completion-2026-09-26.md)：`#[MapRequestPayload(validationGroups: ['create', 'write'])]` 等含嵌套数组的 Attribute 与 `#[Autowire(...)]` 后的类型建议和导入，已在明确 PHP 8.5 目标、默认 `onDemand` 的 VS Code Core 源码宿主通过。默认 `auto` 在本机解析到 PHP 7.2，测试现不会把该模式误判为 PHP 8 Attribute 场景；当前冻结候选仍不含增量。

   [手写限定类导入补全](c1-manual-qualified-use-completion-2026-09-26.md)现在覆盖 `use Domain\\Billing\\Inv`：仅建议该路径下的类，建议项为最后的类名段，不额外插入 `use`。语义、真实 stdio 与 PHP 8.5/`onDemand` 的 Core 源码宿主通过；宿主接受建议后，缓冲区只完成现有导入行。未保存切换路径、Revert 与关闭重开恢复已分别在 LSP 和隔离 VS Code 宿主通过。[组导入类成员](c1-group-use-class-completion-2026-09-26.md)也已通过实际建议接受：单成员与已有前一成员的 `{...}` 均保留花括号并补齐类名。[只输入 `use Dom` 的命名空间建议](c1-use-namespace-completion-2026-09-26.md)现可从 Composer PSR-4 映射开始，沿子目录继续补全，并在已写出命名空间后加载直接类。[PSR-0 命名空间映射](c1-psr0-namespace-import-completion-2026-09-26.md)也已接入相同的路径输入链。[classmap/files 声明命名空间](c1-classmap-namespace-import-completion-2026-09-26.md)现从真实声明推导候选，独立 stdio 回归与 VS Code Core 源码宿主接受建议通过。[规模基准](c1-classmap-namespace-scale-2026-09-26.md)在约 5 万文件的独立 Composer 夹具中把首次 `use Dom` LSP 请求中位数降到 142 ms、重复请求降到 3 ms；真实 UI 可见等待和已安装候选仍待验收。
2. **C2：统一同一版本的编辑反馈。** 用独立 Composer 项目检验补全、签名、Hover、定义和诊断在未保存编辑、文件事件、关闭重开及 PHP 版本变化后是否一致；优先修用户可见的错误或旧结果。[classmap 未保存声明链](c2-classmap-unsaved-feedback-2026-09-26.md)已修复合法不同名文件的错误改名警告，补全、Hover、定义跟随未保存的方法变更。[Composer 生成类映射证据](c2-generated-classmap-diagnostic-proof-2026-09-26.md)现在让精确映射的 classmap 方法参与 `onDemand` 跨文件实参诊断；映射缺失、无效或路径不符时保持静默。VS Code 隔离 Core 源码宿主已验收该诊断出现、未保存编辑后撤销，以及补全、定义和 Hover 更新；安装候选仍待 C4。PHPDoc 生成继续由 Pack 扩展负责，Core 只消费类型事实。
3. **C3：收高频编辑闭环。** Import、Rename、Safe Move、Extract、Inline、类型生成逐项核对预览、取消、应用失败和一次 Undo/Redo。Linux 主路径及首次移动失败后的[同文件系统备用移动](c3-type-generation-fallback-redo-2026-09-26.md)已通过；最终 `createFile` 兜底的一次 Redo 仍有缺口。只针对可证明的常用编辑场景扩展支持。
4. **C4：安装候选与日常使用。** [隔离 WSL Server CLI 安装](c4-isolated-wsl-server-install-2026-09-26.md)已使用冻结三份 VSIX 核对八个外部成员和产品安装内容；自动安装的 PHP Debug 1.40.2 已在隔离目录固定为候选的 1.40.1。严格预检的内容、版本和竞争扩展检查通过，整体结果因本次不是 VS Code WSL 集成终端而仍未通过。下一步在独立真实 WSL Remote Profile 核对 Extension Host 归属、工具路径和 PHP→Symfony/Twig/YAML/XML→格式化→调试→CLI 测试链；随后扩充 PHP 7.3/8.0/8.3 可执行环境、跨平台、规模、缓存损坏及长会话。当前[PHP 7 `mixed` / `never` 类名](f02-legacy-mixed-never-grammar-2026-09-26.md)只在源码门禁通过，尚未进入冻结候选。R4 的 PhpStorm 式日常体验仍是最终目标。

只有新产品增量或组合成员变化形成下一次交付冻结点，才重新打包三份 VSIX；日常 Core 改动运行定向源码与宿主门禁。

## Symfony 组合增量

[Controller 模板上下文](symfony-render-named-context-2026-09-26.md)现识别 `render()` 的 PHP 命名参数和 `renderView()`，包括未保存控制器的模板变量来源。独立框架分析器、Symfony Provider 和 VS Code 1.139.1 源码宿主的 SoPHP Twig 桥回归通过；TwigPlus 已安装候选中的可见结果仍待下一次组合验收。

[Controller `compact()` 上下文](symfony-controller-compact-context-2026-09-26.md)补齐 `render('template.html.twig', compact('user'))` 及 `#[Template]` 直接返回 `compact('user')` 的已知方法参数，TwigPlus 1.3.8 隔离源码宿主验证补全与 Definition；动态参数保守标为不完整。框架 65/65、Provider 6/6 回归通过。[完整 10 项源码组合复核](open-source-pack-compact-composition-2026-09-26.md)也已退出码 0，增量尚未进入冻结候选。

[紧邻直接赋值的局部变量](symfony-controller-compact-local-context-2026-09-26.md)随后进入 `compact()` 模板上下文，框架 66/66、Provider 7/7 和 Core＋Symfony＋TwigPlus 定向宿主通过；[增量后的完整 10 项组合](open-source-pack-compact-local-composition-2026-09-26.md)也已退出码 0。先前的完整组合报告保留原源码快照证据。

[连续赋值的局部变量](symfony-controller-consecutive-compact-context-2026-09-26.md)现可同时进入同一个 `compact()` 上下文；框架 67/67、Provider 8/8 与包含 TwigPlus 的完整 10 项源码 Profile 通过第二个变量的实际补全和跳转。分支、调用改写和安装候选仍分别受证明边界与 C4 门禁约束。

[未保存变量改名与 Revert](symfony-controller-compact-unsaved-rename-2026-09-26.md)也已覆盖连续赋值的 `compact()` 链：完整源码 Profile 中旧 Twig 变量不再跳回 PHP，新变量获得补全和跳转；磁盘上下文可恢复。安装候选仍待下一次冻结。

[TwigPlus 消费端](twigplus-unsaved-controller-context-2026-09-26.md)已在源码中补齐 Controller 变量的根补全和未保存 PHP 编辑触发的上下文刷新。三扩展隔离源码宿主的补全、Definition 与旧上下文撤销通过；TwigPlus 1.3.8 现已单独发布，新组合 Profile 固定该版本，旧 `15a5254` 候选仍使用 1.3.7。

[Symfony `#[Template]`](symfony-template-attribute-context-2026-09-26.md)的字面量模板和直接返回参数数组也已进入同一上下文链，框架/Provider 定向回归与三扩展源码宿主的 Twig→PHP 跳转通过；复杂返回保持保守，安装候选仍待冻结。

默认 `onDemand` 模式已额外用不含 `render()` 的独立 `#[Template]` 控制器复现并修复候选扫描漏报；同一三扩展源码宿主红绿通过。冻结候选不含这些增量。

[完整 10 项源码 Profile](open-source-pack-symfony-context-source-profile-2026-09-26.md)现把 Core、Symfony、Pack 和当前 TwigPlus 源码与其余七项外部成员同时加载，并跑完原有 PHP/格式化/调试/CLI 测试链及新增 Symfony→Twig 编辑链，隔离 VS Code 1.139.1 Extension Host 退出码 0。安装候选、真实 WSL Remote 与长会话仍是 C4 门槛。

[路由通配扫描预算](symfony-route-glob-unmatched-budget-2026-09-26.md)现跳过确定不匹配的普通文件，避免混合目录里的 `.txt` 消耗 `**/*.php` 的路由额度并隐藏真正的 Controller。独立反例红绿、Provider 12/12 与真实 stdio 路由补全/重试回归通过；源码增量未进入冻结候选。
