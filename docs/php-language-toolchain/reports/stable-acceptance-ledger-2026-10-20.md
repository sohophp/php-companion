# 稳定版原范围验收账本

新增[当前编号语义执行绑定](current-numbered-execution-2026-10-20.md)：13个唯一编号／14条已通过语义断言，1619包输入与当前源码变换核对；复用已实际执行结果，不声称本轮重跑或整个工作流通过。

当前候选为cb14ce44/Core4a71f296，常规CI20/20、三系统普通矩阵9/9及Alpha正式隔离实装通过。复杂诊断/补全1666.93/818.87ms超过500/150ms，当前候选长期、规模和真人验收仍未齐。原范围未完成。此前3b/44及私有原型记录按历史资产理解。

2026-10-20。逐项整理原roadmap的26个未勾选大项、F01–F14与六项最终检查；没有缩减范围或修改原勾选状态。机器账本保存每项完整原文、来源行号及整理时源码文档摘要。

**整体尚未完成。** 证据按源码/资产和场景绑定。基线CI通过不等于所有文档要求已满足；历史8219报告不自动授予当前5095cf15资格。当前Windows普通矩阵已取得原运行器及独立审计通过，见[终态报告](stable-windows-version-matrix-2026-10-20.md)。

## 一次性现有证据盘点

已逐条核对机器账本46项原要求（26工程项、14家族、6最终项）与原文行号，原文摘要和勾选未改；未启动新测试或性能尝试。具体要求、逐条结论与原因见机器账本`currentRequirementAssessment`。

| 范围 | 当前结论 |
| --- | --- |
| 26工程项、14家族 | 整项证据不足，不能用CI绿灯或普通矩阵代替；不等于40项测试实际失败 |
| FINAL-1、FINAL-2、FINAL-4 | 缺少整个原范围的最终逐项完成证明 |
| FINAL-3 | 不通过：复杂性能实际超预算 |
| FINAL-5 | 部分通过：Alpha交付齐备；稳定候选及最终验收未齐 |
| FINAL-6 | 本次文档核对通过：本地交付、CI与公开发布清楚区分；未执行项未标完成 |

原勾选保留历史状态，以上是当前盘点结论。稳定版整体不通过。执行上限见[固定标准](../stability-first-delivery.md#固定验收标准与停止规则)；本次盘点结束，不自动增加报告、样例或试验方向。

## F01–F14逐项状态

下表每个家族均为“部分证据，整体验收未完成”，不是将该家族全部判为失败。

| 家族 | 必须达成的结果 | 已有证据 | 剩余条件 |
| --- | --- | --- | --- |
| F01 | 无其他通用 PHP LS 的干净 Profile 可正常启动与持续编码 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[current-profile](current-alpha-profile-2026-10-20.md) | 当前最终VSIX安装与持续编码证据需逐场景对齐；真人WSL仍待验 |
| F02 | PHP 各版本语法边界与未完成输入正确处理 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[linux-ordinary](stable-linux-full-matrix-2026-10-20.md) | 九目标加载和真实CLI不证明所有语法/未完成输入；需对齐编号案例与完整平台矩阵 |
| F03 | Composer/vendor/内建符号导航、多根隔离与热缓存正确 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[historical-scale](8219-server-scale-2026-10-14.md)、[historical-persistence](8219-persistence-matrix-2026-10-14.md) | 当前多根/删除/移动/失效与真实项目基准、规模和缓存资格需完整对齐 |
| F04 | 成员补全、Hover、参数提示、定义和引用符合真实类型 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[linux-ordinary](stable-linux-full-matrix-2026-10-20.md)、[controller-failure](stable-candidate-1f096ff1-2026-10-20.md) | 完整编号语义/编辑器场景需映射；复杂查询性能失败 |
| F05 | 泛型、数组形状、Callable、控制流与动态边界正确 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md) | 高级类型家族已有大量实现，26大项中P5仍未勾选；逐项对齐支持边界与正反例 |
| F06 | 诊断不会因未完成索引或未知类型产生级联伪错误 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[linux-ordinary](stable-linux-full-matrix-2026-10-20.md) | 逐项核对未完成输入、索引受限和unknown抑制；P6诊断大项未完成 |
| F07 | Interface/Override/构造函数生成、import 工作流可用 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md) | 生成与import的既有回归存在；须核对所有声明场景、选区及撤销矩阵 |
| F08 | P7 两批重构在声明支持场景中保持语义 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md) | P7四个原大项仍开放；预览/应用/取消/UndoRedo与拒绝范围逐项核对，旧平台限制不抹去 |
| F09 | Symfony/Doctrine 类型及导航支持清单通过 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[current-profile](current-alpha-profile-2026-10-20.md) | 当前完整框架版本/场景清单仍需逐项资格，组合内单个上下文场景不代替全框架矩阵 |
| F10 | twig-plus 获得准确上下文、导航与受限跨语言 Rename | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[current-profile](current-alpha-profile-2026-10-20.md) | 当前组合证明Controller上下文刷新；双仓契约、正式VSIX跨语言导航/Rename完整场景待逐项对齐 |
| F11 | PHP CS Fixer 与 Twig formatter 各自唯一负责对应文档 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[current-profile](current-alpha-profile-2026-10-20.md) | 当前Linux组合的唯一formatter、保存/失败/UndoRedo通过；其它平台/配置与精确版本组合待验 |
| F12 | 调试/测试执行入口和运行时配置无冲突 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[current-profile](current-alpha-profile-2026-10-20.md) | 当前Linux实际Xdebug和PHPUnit任务通过；其它平台/运行时/Remote剩余场景保留 |
| F13 | 长时间编辑、取消、重启、缓存损坏恢复达到预算 | [linux-ordinary](stable-linux-full-matrix-2026-10-20.md)、[controller-failure](stable-candidate-1f096ff1-2026-10-20.md)、[current-long-session](mixed-guard-long-session-2026-10-20.md)、[historical-long-session](8219-long-session-2026-10-14.md)、[historical-scale](8219-server-scale-2026-10-14.md)、[historical-persistence](8219-persistence-matrix-2026-10-14.md) | 当前8439合成7200.725秒、两恢复、原资源预算、重建字节及清理审计通过；Linux8.5/progressive三规模服务器补验通过。复杂性能失败，真实项目及Remote范围仍需对应资格 |
| F14 | 既有工作流、命令、配置迁移和本地化保持兼容 | [baseline-ci](stable-candidate-1f096ff1-2026-10-20.md)、[current-profile](current-alpha-profile-2026-10-20.md) | 打包/质量CI通过；原基线、迁移、命令配置及本地化完整核对仍需逐项证据 |

## 原26个未完成大项

以下只显示每条原文第一句便于阅读，完整说明和既有进度保留在[机器账本](stable-acceptance-ledger-2026-10-20.json)及原roadmap中；不把“已有实现”写成整体通过。

| 来源 | 原条目摘要 | 状态 |
| --- | --- | --- |
| [P0 第359行](../roadmap.md) | 保存当前功能回归基线，审计现有 parser/index 的可复用范围 | 原大项未完成 |
| [P0 第361行](../roadmap.md) | 将验收文档中的场景落实为编号 fixtures，包含合法反例和未完成输入 | 原大项未完成 |
| [P0 第362行](../roadmap.md) | 固定数据契约、包依赖检查、缓存版本、ADR 和模式迁移方案 | 原大项未完成 |
| [P0 第363行](../roadmap.md) | 固定基准机器、公开合成项目、真实项目脱敏副本和测量脚本 | 原大项未完成 |
| [P2 第380行](../roadmap.md) | 函数/方法/属性/常量/参数/变量、namespace、全部 use 类别及作用域 | 原大项未完成 |
| [P2 第381行](../roadmap.md) | 继承、接口、Trait alias/insteadof、匿名类、闭包、箭头函数、枚举和 Attribute | 原大项未完成 |
| [P2 第382行](../roadmap.md) | 混合 PHP/HTML 区域、错误恢复、增量 Tree 编辑与无损编辑范围 | 原大项未完成 |
| [P2 第383行](../roadmap.md) | PHP 8.4/8.5 新语法逐项审计，旧版本语法边界按矩阵验证 | 原大项未完成 |
| [P3 第394行](../roadmap.md) | 目标 PHP 版本与扩展签名选择 | 原大项未完成 |
| [P4 第404行](../roadmap.md) | 名称绑定、成员查找、继承、可见性、静态性、self/parent/static | 原大项未完成 |
| [P4 第405行](../roadmap.md) | 原生签名、赋值/调用/链式调用传播、基础数组与闭包类型 | 原大项未完成 |
| [P5 第421行](../roadmap.md) | P5a：条件分支、instanceof、空值、提前返回、循环、异常路径及合流 | 原大项未完成 |
| [P5 第422行](../roadmap.md) | P5b：泛型约束和继承替换、class-string、list、array shape、Callable | 原大项未完成 |
| [P5 第423行](../roadmap.md) | P5c：模板推断、条件类型、断言、闭包上下文、Generator、引用与副作用 | 原大项未完成 |
| [P5 第424行](../roadmap.md) | 魔术属性/方法、动态调用的保守模型与插件接口 | 原大项未完成 |
| [P5 第425行](../roadmap.md) | 原生类型/PHPDoc 冲突规则、递归终止、类型展开预算与派生失效 | 原大项未完成 |
| [P6 第442行](../roadmap.md) | 未解析符号、未定义局部变量、参数/返回值/赋值类型、命名参数、权限与静态调用诊断 | 原大项未完成 |
| [P6 第443行](../roadmap.md) | 继承/接口不兼容、重复声明、未使用 import、版本规则、可证明不可达代码 | 原大项未完成 |
| [P6 第447行](../roadmap.md) | 稳定诊断代码、严重性/关闭设置、未知和索引未完成时抑制策略 | 原大项未完成 |
| [P7 第453行](../roadmap.md) | 第一批：类型、函数、常量、局部变量/参数、方法、属性 Rename | 原大项未完成 |
| [P7 第454行](../roadmap.md) | 第一批：迁移 PSR-4 Move、文件 Rename、PHPDoc 与 import 编辑 | 原大项未完成 |
| [P7 第455行](../roadmap.md) | 第二批：提取变量/方法、修改签名及调用点、内联局部变量 | 原大项未完成 |
| [P7 第456行](../roadmap.md) | 第二批：限定可证明场景的提取接口、移动成员 | 原大项未完成 |
| [P9 第481行](../roadmap.md) | 全量版本矩阵、系统矩阵、真实 VSIX 和真实项目基准通过 | 原大项未完成 |
| [P9 第483行](../roadmap.md) | 执行 acceptance.md 全部最终检查，记录原始报告与已知限制 | 原大项未完成 |
| [P9 第484行](../roadmap.md) | 形成最终交付报告：已完成、证据、支持范围、限制、安装和回退方法 | 原大项未完成 |

## 六项最终检查

| 要求 | 当前证据结论 |
| --- | --- |
| P0–P9完成并链接证据 | 原26大项未勾选，不能关闭 |
| F01–F14通过且无阻断性缺陷 | 各家族仍部分证据；复杂性能阻断保持 |
| 性能、版本和系统矩阵完成 | 当前44源码三系统/九版本/三模式普通编辑矩阵通过；复杂性能及其余声明场景资格未完成 |
| 限制公开且范围与约定一致 | 本账本保留原范围；不能将已有缺陷改写为不支持 |
| VSIX、源码、迁移/回退和最终报告齐备 | 可追溯Alpha三包已备，稳定版最终交付材料待完成 |
| 区分本地交付、CI和公开发布 | 3b本地产品、44源码CI和矩阵、Alpha交付分别记录；分支推送与跟踪CI已获持续授权，没有本次公开发布 |

下一步按账本中真实缺口执行；有源码或资产变化时，按影响重新验证。不能靠重复增加历史通过记录关闭最终检查。

证据：[完整机器账本](stable-acceptance-ledger-2026-10-20.json)、[统一执行计划](../stability-first-delivery.md#稳定版评估与收口清单)。

当前补充：44dbe64f的[CI39363787201](current-source-ci-terminal-2026-10-20.md)20作业及[矩阵39363787111](current-remote-version-matrix-2026-10-20.md)九作业/81组合均取得终态和独立审计通过；[原53矩阵](matrix-failure-diagnostics-2026-10-20.md)8成功/1失败保留。[原8439两小时](mixed-guard-long-session-2026-10-20.md)7200.725秒、117630结果/陈旧0及独立终态审计通过。26原大项、14家族、6最终项未关闭，原roadmap/acceptance摘要保持。
