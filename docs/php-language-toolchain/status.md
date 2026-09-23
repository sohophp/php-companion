# 实施状态

2026-09-23 F09 [Winstar 重名路由 Controller 归属](reports/f09-winstar-framework-probe-2026-09-23.md)：`home` 的两个 YAML 声明现在仅凭运行时精确 Controller 唯一匹配到第 15 行，错误或缺失 Controller 仍不猜测。当前 `dev` Router 569 条带模块来源标记的路由均有唯一 YAML 来源；真实 Language Server stdio Definition、Provider 6 项、类型检查与 ESLint 通过。未打包，最终 WSL Remote 验收仍开放。

2026-09-23 P0/F08 [private 参数删除编号夹具](acceptance-fixtures.md)新增 F08-RP-01/02/03：完整直接调用可生成有效编辑，合法间接调用拒绝，未完成调用所在文件拒绝操作。语义包 308 项、类型检查与相关 ESLint 通过；重建 bundle 后 Winstar 冷 References 返回 174 处且完整位置摘要匹配。P0/F08 仍开放，本轮未打包。

2026-09-23 P7/F08 [private 参数删除的间接调用保护](reports/p7-private-parameter-callables-2026-09-23.md)：动态方法、callable 数组、first-class callable 与静态方法字符串若可能保留旧实参，删除操作会安全关闭；注释和普通字符串反例不误挡。语义包 305 项、真实 stdio 定向回归、类型检查和 ESLint 通过；Winstar 冷 References 174 处完整位置摘要匹配。本轮未打包，P7/F08 仍开放。

2026-09-23 P0/F09 [Doctrine Entity 编号夹具](acceptance-fixtures.md)新增 F09-DOC-01/02/03，并修正未闭合类仍发布 Entity 事实的问题；完整同文件类保持可用。Doctrine 包 9 项及真实 Language Server 既有集成回归通过，范围见[报告](reports/f09-doctrine-incomplete-2026-09-23.md)。本轮未打包。

2026-09-23 F09 [Symfony 服务导入完整性](reports/f09-service-import-completeness-2026-09-23.md)：显式缺失、越界、未知 Bundle 及 YAML/XML/PHP Configurator 动态导入不再让 Provider 宣称权威图完整；Winstar 只读探针仍完整。Framework Symfony 59 项、服务 Provider 9 项及两项真实 stdio 定向回归通过；本轮未打包。

2026-09-23 F09 [Symfony Provider 完整性与语言服务器链路](reports/f09-provider-completeness-2026-09-23.md)：服务 Provider 不再把破损 YAML 或导入预算耗尽的结果提交为完整快照；真实 stdio 验证服务 Definition、路由补全及不完整快照时的安全关闭。Winstar 只读 Provider 探针保持完整；本轮未打包，F09 仍待最终矩阵。

2026-09-23 P0/F09 [Symfony 路由 YAML 编号夹具](acceptance-fixtures.md)新增 F09-ROUTE-01/02/03，覆盖精确路由/Controller 范围、合法 Attribute 目录导入和动态路径抑制；与服务组共 6 项定向测试通过。真实 Provider、Language Server 与扩展宿主链路尚待编号验收。

2026-09-23 P0/F09 [Symfony 服务 YAML 编号夹具](acceptance-fixtures.md)新增 F09-SVC-01/02/03，覆盖有效引用、合法的转义/表达式反例及破损配置。框架包 3 项定向测试、类型检查和 ESLint 通过；Provider 与真实扩展工作流尚待编号验收。

2026-09-23 F14 [Symfony 扩展 API 不兼容错误](reports/f14-symfony-api-error-2026-09-23.md)已按 VS Code 语言输出并保留实际版本号；类型检查、定向测试和 ESLint 通过。本轮不打包。

2026-09-23 F14 [Language Server 状态日志](reports/f14-status-output-2026-09-23.md)已接入中英文说明；真实中文 stdio 收到 Composer 快照日志，既有英文项目扫描用例通过。结构化性能记录仍待审计；本轮不打包。

2026-09-23 F14 [Language Server 故障日志](reports/f14-operational-output-2026-09-23.md)已补齐中英文固定文案，并保护底层错误详情中的占位符文本；类型检查、定向测试和 ESLint 通过。下游警告原文及信息级日志仍待审计，继续不打包。

2026-09-23 F14 [Symfony Provider 输出通道警告](reports/f14-provider-output-2026-09-23.md)已按客户端语言显示；真实中文 stdio 注册错误与既有英文路由 Provider 回归通过。Provider ID、错误码、外部错误详情保持原文。索引、缓存、监听器等日志仍待处理；本轮不打包，F14 保持开放。

2026-09-23 F14 组合声明诊断本地化：抽象方法/属性、只读属性、Property Hook 与魔术方法签名的违规原因已分别翻译，再按原有条件和顺序组合；现有英文消息基线保留。证据与未覆盖范围见[组合声明诊断报告](reports/f14-composite-diagnostics-2026-09-23.md)。F14 仍开放。

2026-09-23 F14 语法分析层诊断本地化：常量表达式、控制流、原生类型组合、Enum、重复声明和命名空间等诊断已接入英中文案，代码及修复数据保持稳定。覆盖范围和剩余动态原因见[语法分析诊断报告](reports/f14-parser-diagnostics-2026-09-23.md)。F14 仍开放。

2026-09-23 F14 Language Server 类型与调用诊断本地化：缺参、实参/返回/赋值类型、命名实参顺序、可能为空的成员、动态/只读属性及缺失实现等结构化诊断已使用英中文案；打包简体中文宿主实际收到中文缺参诊断。覆盖范围与剩余术语见[类型与调用诊断报告](reports/f14-language-server-flow-diagnostics-2026-09-23.md)。F14 仍开放。

2026-09-23 F14 Language Server 常见诊断本地化：LSP `initialize.locale` 已驱动语法、目标版本、文件名、import、变量及基础未解析符号诊断的英中文案，诊断代码和数据保持稳定。定向测试与简体中文打包宿主已验证；覆盖范围和其余未迁移文案见[Language Server 诊断报告](reports/f14-language-server-diagnostics-2026-09-23.md)。F14 仍开放。

2026-09-23 F14 旧 Profile 设置兼容：Paste 的 `pasteImports.mode` 与 Rename 的 `rename.syncFileName` 已按旧值映射到当前行为，新键显式值优先；保留原设置以便回退。映射、无法自动迁移的设置及验证边界见[旧 Profile 设置兼容报告](reports/f14-profile-settings-migration-2026-09-23.md)。F14 最终验收仍开放。

2026-09-23 F14 扩展侧运行时界面中文化：Core 的新建、复制、诊断修复、安全移动、导入、优化导入、索引进度和报告等交互及独立 Symfony 状态消息已接入英中文案；`Preview`/`Apply` 的行为比较随语言同步。定向单元测试、TypeScript 与 Lint 已通过，打包宿主与候选证据见[运行时本地化报告](reports/f14-runtime-localization-2026-09-23.md)。Language Server 和 Provider 文案、配置迁移与旧 Profile 升级仍待验。

2026-09-23 F14 Core 设置说明本地化：30 个公开设置、一个嵌套路由缓存选项和一条弃用提示已补齐英中 `package.nls` 文案，英文默认说明由[基线](reports/f14-setting-description-baseline-2026-09-23.json)固定。VS Code 1.138.0 简体中文隔离宿主已逐项确认打包 manifest 的解析结果；完整范围和其余验收边界见[设置本地化报告](reports/f14-setting-localization-2026-09-23.md)。

2026-09-23 F14 Core/Symfony 命令标题简体中文化：22+1 个公开命令改用 manifest 本地化键，英文默认标题、命令 ID/分类/启用条件保持基线；VS Code 1.138.0 隔离中文宿主已逐项确认打包扩展中的 23 个标题及命令注册。范围与剩余设置/运行时文案见[命令本地化报告](reports/f14-command-localization-2026-09-23.md)；F14 仍开放。

2026-09-23 P0/F14 公开 manifest 基线：Core/Symfony 的 23 个命令、30 个设置和激活事件已固定为[机器可读 JSON 与报告](reports/p0-f14-public-manifest-baseline-2026-09-23.md)；`pnpm check` 完整通过，VS Code 1.138.0 隔离宿主确认全部 23 个命令已注册。命令标题简体中文已单独验证；命令运行行为、配置迁移和其余本地化仍待验，P0/F14 保持开放。

2026-09-23 P0 编号验收 fixture 首组：F08-EI-01/02/03 分别覆盖 Extract Interface 的有效公开抽象/具体方法、合法 import 别名冲突及未完成方法声明。三项 fixture 测试、语义包类型检查和相关 ESLint 通过；编号、文件及命令见[验收 fixtures](acceptance-fixtures.md)。P0 全量 F01–F14 映射仍开放。

2026-09-23 P7 Extract Interface 抽象方法支持：抽象类中直接声明的公开抽象方法现在与公开具体方法一同进入接口；生成签名去掉 `abstract`，protected 方法仍排除。语义包 301 项、类型检查及相关 ESLint、打包 VS Code 1.138.0 隔离宿主应用/Undo/Redo 通过；语义计划写出的接口、抽象类和子类已在 PHP 7.2/8.5 下通过语法检查、加载和调用。已纳入下述 `2430bd08` 私有候选。

2026-09-23 P7 Extract Interface `parent` 支持：签名里的 `parent` 仅在类有唯一 `extends` 且同一词法 namespace 的 import 可唯一绑定时改写为父类绝对 FQCN；无父类或歧义继续拒绝。语义包 301 项、language-server 与扩展测试 TypeScript 类型检查、相关 ESLint 通过；用例覆盖跨 namespace 同名别名不串线。语义计划写出的三文件在 PHP 7.2/8.5 下通过语法检查、加载和调用；打包 VS Code 1.138.0 隔离宿主应用、Undo/Redo 退出码 0。已纳入下述 `78215753` 私有候选。

2026-09-23 P7 Extract Interface `self` 支持：签名里经解析器证明的 `self` 类型和 `self::` 常量接收者改写为原类绝对 FQCN，字符串字面量不改；`parent`/`static` 继续拒绝。语义包 301 项、类型检查、ESLint 和 VS Code 1.138.0 打包宿主应用/Undo/Redo 通过；直接生成的双文件在 PHP 7.2/8.5 下通过语法检查、加载与调用。已纳入下述 `b4f5e6f8` 私有候选。

2026-09-23 P7 Extract Interface import 支持：新接口现在原样复制类所在词法 namespace 的 `use` 语句，保留别名与分组 import；不同 namespace 的语句不会混入，别名与新接口名冲突则拒绝。语义包 301 项测试、类型检查、ESLint、带真实别名签名的打包编辑器应用/Undo/Redo，以及 PHP 7.2/8.5 生成代码加载调用均通过；已纳入下述 `0cd78268` 候选。

2026-09-23 P7 新增首个 Extract Interface 支持域：从唯一 PSR-4 类文件提取直接声明的公开非魔术方法原生签名，创建同 namespace 接口文件并更新类 `implements`。语义用例覆盖生成后的双文件语法、已有接口列表、上下文类型/别名冲突拒绝及目标符号冲突；VS Code 1.138.0 打包扩展宿主已验证实际应用与一次 Undo/Redo，PHP 7.2/8.5 语法检查通过。详见[Extract Interface 报告](reports/p7-extract-interface-2026-09-23.md)。P7 提取接口通用范围及移动成员仍开放；已纳入下述 `0cd78268` 私有候选。

2026-09-23 P7 private 参数删除继续收紧：递归检查方法内嵌套 closure/arrow 的参数引用，并拒绝方法体通过 `func_get_args()`、`func_get_arg()` 或 `func_num_args()` 观察原参数列表的场景。语义包 300 项测试、类型检查和相关 ESLint 通过；已纳入下述 `a6ee163b` 私有候选。

2026-09-23 P7 删除未使用 private 参数的安全域收紧：被删实参现在必须是完整且无插值的标量字面量；变量读取可能产生未定义变量提示，类常量访问可能触发自动加载，复合表达式可能执行调用，因此都拒绝自动编辑。聚焦语义用例和类型检查通过；已纳入下述 `35297e85` VSIX 候选。

2026-09-23 当前 0.4.5 私有 Alpha 候选已从干净提交 `ecf15e55` 重新冻结，`pnpm check`、四份 VSIX 的 SHA-256 校验、候选原件的 VS Code 1.138.0 英文完整宿主回归/简体中文诊断专项，以及 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性预检通过。此次加入[成员与属性操作诊断本地化](reports/f14-member-property-diagnostics-2026-09-23.md)，完整结果见[当前候选报告](reports/p9-alpha-candidate-current-2026-09-23.md)。WSL Remote Profile 所属、竞争 Provider 和持续真实编辑仍待人工记录；P9/F01–F14 保持开放。

2026-09-23 继承、Enum 和实例化诊断的中英文输出，以及已知方法/属性 Override 兼容性原因，已完成[本地化实现和定向 stdio 回归](reports/f14-inheritance-diagnostics-2026-09-23.md)。全仓 `pnpm check` 通过；本轮未冻结新 Alpha 候选，后续 F14 增量采用定向测试，集中交付时再运行四包门禁。

2026-09-23 Attribute、弃用和扩展可用性诊断已完成[中文 stdio 回归与英文兼容验证](reports/f14-attribute-diagnostics-2026-09-23.md)。代码操作标题、Provider 文案与部分参数标签仍待 F14 收尾；当前可试用 Alpha 候选仍为 `ecf15e55`。

2026-09-23 Language Server 的 Quick Fix 与重构[代码操作标题已本地化](reports/f14-code-action-titles-2026-09-23.md)，真实中文 stdio 请求和既有英文编辑结果回归通过。Provider 文案与部分诊断参数标签仍待处理；本轮继续不打包。

2026-09-23 [查询错误、References 警告与诊断参数标签](reports/f14-protocol-messages-2026-09-23.md)已完成中英文回归；关闭索引的真实 `zh-CN` stdio 请求确认中文 `RequestFailed` 和警告。内部 Provider/索引日志仍待审计，继续不打包。

2026-09-23 Language Server 的[索引、候选扫描及 Symfony 查询进度文案](reports/f14-progress-messages-2026-09-23.md)已本地化；真实中文 `$/progress` 回归和中英文数字/路径专项测试通过。输出通道日志仍待审计，本轮未冻结新候选。

2026-09-23 P7 公开 API Rename 范围声明完成：产品支持说明与 Alpha 操作步骤均明确 F2 编辑计划只能覆盖当前已索引且语义证明的文件；工作区外下游仓库、客户端调用及未证明动态引用无法验证，公开 API 应用前须另行检查使用方。路线图仅关闭这一项范围声明，P7 两批重构及 F08 最终操作矩阵仍开放。

2026-09-23 P9 / F01–F14 已逐项按[最终验收审计](reports/p9-acceptance-audit-2026-09-23.md)复核：专项 Linux 自动性能、真实项目只读 Oracle、P8 协作和候选打包有证据；P0、P2–P7 与 P9 仍有开放工作，当前候选的跨平台/WSL Remote 人工矩阵尚缺，因此没有把任何 F 项误记为最终通过。后续先推进 P7 支持域和编辑器操作矩阵。

2026-09-23 P9 局部方法体变更基准：10,000 文件完整索引后连续交替编辑单一方法体 200 次，逐次跟踪真实 parser 调用；每次只重解析该文件，`implementation` 层级变化，类型声明变化 0、callable 身份变化 1，更新 P95 0.59 ms。见 [原始 JSON](reports/local-implementation-change-10000-linux-x64-2026-09-23.json)。

2026-09-23 P9 持久缓存体积门禁：基准脚本现统计实际缓存目录字节数，并按 testkit 冻结上限判断。1k/10k/50k 文件热缓存分别为 5.25/52.53/262.59 MiB，预算为 64/512/2,560 MiB；热恢复全部文件且重解析 0，Doctrine/Callable/派生失效及单条损坏恢复均通过。原始结果见 [1k](reports/persistent-cache-1000-linux-x64-2026-09-23.json)、[10k](reports/persistent-cache-10000-linux-x64-2026-09-23.json)、[50k](reports/persistent-cache-50000-linux-x64-2026-09-23.json)。

2026-09-23 P9 热导航协议门禁：编辑基准现在每轮除补全外，还从真实 stdio Language Server 请求 Hover 与 Definition，并校验当前交替类型的方法名和精确声明位置；三项均采样 1,000 次。当前 Linux x64 P95 为补全 1.13 ms、Hover 1.03 ms、Definition 1.15 ms，诊断 2.99 ms，取消 1.19 ms，陈旧结果为 0；损坏缓存重启恢复。见 [原始 JSON](reports/editing-navigation-linux-x64-2026-09-23.json)及[P9 Linux 资格复测](reports/p9-linux-qualification-2026-09-23.md)。

2026-09-23 P9 当前源码真实项目只读 Oracle：Winstar 2,292 个、CoreRepo 1,137 个项目 PHP 文件均完整进入索引；两个项目各 100/100 抽样类型声明解析，References P95 为 29.78/29.09 ms，固定补全和 Definition Oracle 均通过。10,000 文件预算截断了依赖树，`complete=false`，不能视作 vendor 全集验收。原始结果见 [Winstar JSON](reports/real-workspace-winstar-p9-2026-09-23.json) 与 [CoreRepo JSON](reports/real-workspace-corerepo-p9-2026-09-23.json)。

2026-09-23 P9 私有候选 `artifacts/php-companion-alpha-0.4.5-7aadd860/` 已由干净提交 `7aadd860` 生成。四份 VSIX 的 `SHA256SUMS` 通过；Core 与 Symfony 原始候选文件在 VS Code 1.138.0 隔离打包 Extension Host 退出码 0；Winstar PHP 8.5 和 CoreRepo PHP 7.2 确定性 Alpha 预检均通过。普通 WSL shell 预检不是 VS Code WSL Remote 集成终端，Extension Host 归属、竞争 Provider 和两项目各两小时真实编辑仍需人工证据。详见 [P9 私有 Alpha 候选](reports/p9-alpha-candidate-2026-09-23.md)。

2026-09-23 P9 Linux x64 自动资格复测：24 个组件 tarball 隔离消费通过；1k/10k/50k 文件五轮冷索引 P95 分别为 1.70/15.12/72.89 秒，峰值 RSS 分别为 135.9/434.6/829.9 MiB，均低于冻结预算；1,000 次编辑的诊断/热补全 P95 为 2.56/1.32 ms，陈旧结果 0，取消 1.22 ms，损坏缓存重启恢复；10k 文件热缓存恢复 10,000/10,000 且重解析 0。Winstar 提交 `fee022c1` 使既有三处 `get()` 调用移动，旧 `99715603` 与当前干净 `15fef7b7` 的完整位置差异已重建，当前 174 处 References 和 1 处 Definition 门禁通过。证据见 [P9 Linux 资格复测](reports/p9-linux-qualification-2026-09-23.md)和[引用基线重审](reports/winstar-reference-baseline-2026-09-23.md)。当前 Windows/macOS 候选矩阵、真实 WSL Remote 多小时编辑以及 P0–P7/F01–F14 最终范围仍需验收，P9 保持未完成。

2026-09-23 P8 Symfony / Doctrine / Twig 协作完成：独立 SoPHP Symfony VSIX、Symfony 静态服务/事件/路由/Controller 上下文、Doctrine 常用实体/Repository/查询类型，以及 interop v1 与 TwigPlus 的补全、导航和受限跨语言 Rename 已达到阶段退出条件。Doctrine 新增 `getArrayResult()`、`getScalarResult()`、`getSingleScalarResult()` 的稳定宽类型；项目事实升级至 schema 7，缓存封装升级至 schema 12/v64。PHP Companion `pnpm check`、TwigPlus 构建与 14 项跨仓集成测试、VS Code 1.138.0 中 Core + Symfony + TwigPlus 三扩展隔离宿主均通过。动态框架配置、字段级 DQL 推断、Marketplace 发布和真实 WSL 长时人工验收继续保持明确边界。功能提交 `6b8e50a`，完成提交 `9d0c895`，最终候选为 `artifacts/php-companion-alpha-0.4.5-9d0c8952/`；四份 SHA、Winstar PHP 8.5 与 CoreRepo PHP 7.2 的 WSL 确定性预检均通过，原 `81580890` 候选保持不变。见 [P8 完成审计](reports/p8-symfony-doctrine-twig-completion-2026-09-23.md)。

2026-09-23 Doctrine EntityManager 单根 QueryBuilder 工厂：项目方法现在可从已声明 EntityManager/ObjectManager 属性上的 `createQueryBuilder()`、唯一字面量 `from(Entity::class, 'alias')` 以及可选的同别名根 `select()` 保留实体泛型；动态实体/别名、标量或附加选择、多根和写查询保持 unknown。项目事实升级至 schema 6，缓存封装升级至 schema 11/v63。Winstar 1,794 个 `src` PHP 文件只读扫描得到 11 个精准工厂，其中新增真实 `UrlRedirectService::listQuery()` → `QueryBuilder<UrlRedirects>`。`pnpm check` 已通过，其中 Framework Doctrine 6 项、Semantic 300 项、Language Server 261 项通过且 1 项跳过。功能提交 `ebe0dae`，候选为 `artifacts/php-companion-alpha-0.4.5-ebe0dae4/`；四份 VSIX 的内容与 SHA、隔离 VS Code 1.138.0 打包宿主、Winstar PHP 8.5 和 CoreRepo PHP 7.2 确定性预检均通过。现有 `81580890` 人工试用候选保持不变。见 [Doctrine EntityManager 单根 QueryBuilder 工厂](reports/doctrine-entity-manager-root-query-factory-2026-09-23.md)。

2026-09-23 Symfony PHP Configurator 环境链：静态服务图现支持完整 `if/elseif/else` 与嵌套精确 `$container->env() === 'literal'` 分支；服务、导入、参数和引用共享同一活动视图，动态或混合业务条件仍使整图保持不完整。`pnpm check` 已通过，其中 Framework 53 项、Service Provider 6 项、Semantic 300 项、Language Server 261 项通过且 1 项跳过；四份 VSIX 内容及 SHA、隔离 VS Code 1.138.0 打包宿主、Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过。功能提交 `19fe83a`，新候选为 `artifacts/php-companion-alpha-0.4.5-19fe83a3/`；现有 `81580890` 人工试用候选保持不变。见 [Symfony PHP Configurator 环境分支链](reports/symfony-php-configurator-environment-chains-2026-09-23.md)。

2026-09-23 SoPHP 0.4.5 人工验收候选 `artifacts/php-companion-alpha-0.4.5-81580890/` 来自干净提交 `8158089`；四份 VSIX 的内容校验与 `SHA256SUMS` 通过，Winstar PHP 8.5 和 CoreRepo PHP 7.2 的 WSL 确定性预检通过。候选统一使用 SoPHP 显示名称和命令分类，两个 Pack 均加入 Apache Conf Snippets 1.4.0。`pnpm check` 通过，其中 Language Server 261 项通过、1 项跳过。用户已开始在 Winstar2024 实际试用；WSL Extension Host 所属、竞争 Provider、严格编辑器预检和两小时持续编码仍待反馈，不能标记 Alpha 通过。见 [Winstar 人工验收记录](reports/sophp-alpha-winstar-2026-09-23.md)。

2026-09-22 当前 Alpha 候选 `artifacts/php-companion-alpha-0.4.5-f6c4d8bd/` 来自干净提交 `f6c4d8b`，四份 VSIX 内容验证、`SHA256SUMS` 与 Winstar WSL/PHP 8.5 确定性预检通过。Winstar 当前采用实验性源索引；选中符号后，References 预热现可优先于尚未完成的全项目索引运行。最终打包候选在隔离 VS Code 1.138.0、Core + Symfony、独立空 Profile 下，打开后空闲 8 秒首次点击为 **466 ms**，空闲 2.5 秒为 **6,102 ms**；128 处位置（含声明）及完整 SHA-256 均与基线一致。立即点击仍约 **8 秒**，冷计算量尚未降低。Language Server stdio 90 项通过、1 项跳过，Winstar PHP 首查 127 处基线通过；用户实际 WSL Alpha Profile 和持续编码尚未验收，性能 Goal 保持开放。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 Symfony 类引用的正式 bundle 跨进程复测：`AdminSecuritySubscriber` 首次约 2.73 秒并写入 2 处完整结果，重载后仍约 2.81 秒，重新执行候选扫描与 Provider，再写入同一结果。首次恢复缺少预先可验证的框架输入指纹；缓存文件存在不等于可以安全跳过 Provider。基准驱动现要求持久化/输入审计显式指定正式 bundle，防止包内入口缺少引擎身份造成误判。性能 Goal 继续。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 延后候选缓存压缩/提交的两组正反序冷查询只比正式路径快约 0.06–0.19 秒，112 处位置不变；试验已撤回。缓存写盘不是数秒级首查瓶颈，继续解决短名字候选准备与语义判定；当前产品提交仍为 `9c5aaf7`，Goal 保持开放。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 首次 References 的工作区基础事实改在语言服务器初始化时建立，不扫描项目源码。Winstar 两组空缓存交叉对照中，`get` 点击等待由 7.635/7.683 秒降为 6.831/7.075 秒，初始化由约 0.19 秒升至 1.02–1.07 秒；112 处完整位置不变。Symfony Provider 下类引用 3.787→2.866 秒、2 处不变，`get` 8.773→8.092 秒、112 处不变。Language Server 235 项通过、1 项跳过，隔离 VS Code 1.138.0 Core Only 与打包 Core + Symfony 宿主均 exit 0。只缩短了点击后的等待，未减少总计算量；用户 WSL Alpha Profile 尚未安装，本 Goal 继续。详见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 Linux 长名字预筛候选 `artifacts/php-companion-alpha-0.4.5-e55e9c9b/` 已从干净提交 `e55e9c9` 生成，四份 VSIX 通过 `verify:vsix` 与 `SHA256SUMS`；Winstar WSL/PHP 8.5 的 `alpha:preflight` 通过。隔离 VS Code 1.138.0 Core Only 宿主 exit 0。打包核心＋Symfony 宿主第一次在 5 秒等待内未看到 Symfony 自动注入 hover，第二次不重新打包的相同归档测试 exit 0；此初始化波动仍需追查，不能声称打包宿主稳定。候选未安装到用户当前 Alpha Profile；`get` 首查仍约 7.8 秒，Goal 继续。

2026-09-22 Linux 正式路径现对至少 8 个 ASCII 字符的 References 查询尝试可信 `/usr/bin/rg` 源码预筛，异常或超时自动完整扫描；此前已补齐被跳过文件的缓存变化证明。Winstar `AdminSecuritySubscriber` 冷首查 4.162 秒、2 处原位置；磁盘无类名而未保存缓冲区新增引用的 stdio 回归通过。短名字 `get` 仍走原路径，空缓存复测 7.781 秒/112 处原位置。Language Server 235 项通过、1 项跳过；Windows/macOS、新版 VSIX 和用户 WSL Alpha Profile 尚未验证，Goal 继续。详见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 受控长名字预筛已补齐缓存证据：对未读取文件记录扫描时的大小、mtime/ctime，结果快照前后再核对；完整快照仍对全部 Composer PHP 源码哈希。Winstar `shouldRedirect` 首查 2.197 秒/1 处，后台成功存储结果，重启后同位置恢复为 2.380 秒；输入审计 `captured=true`、`engineVerified=true`。带 Symfony Provider 的服务类虽写入结果，重启仍重新扫描，框架事实恢复仍待解决。Language Server 235 项（1 项跳过）、ESLint、构建通过；预筛仍只在测试模式，短名字 `get` 仍约 8 秒，Goal 继续。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 首次 `get` 继续验证：把长名字预筛临时扩至短名字，一组 8.136→7.418 秒，但反向顺序为 7.740/7.768 秒，未复现稳定收益，已撤回。语句边界复用试验保持 112 处位置却使语义阶段升至 5.667 秒，亦已撤回并重建 bundle；恢复后 `get` 为 7.831 秒、原位置摘要。验证脚本现支持 `PHP_COMPANION_BENCHMARK_REVERSE=1` 的反向串行对测。Goal 继续，见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 长名字 References 源码预筛试验：内部测试模式下，Winstar `AdminSecuritySubscriber` 首次查询 5.095→3.811 秒，反向顺序 5.001/3.764 秒；`shouldRedirect` 4.721→3.572 秒，引用位置均与正式路径完全一致。`rg` 缺失时自动回退为 4.842 秒、同样 2 处。Index 36、Language Server 234 项（1 项跳过）通过。短名字 `get` 不适用；预筛目前无法生成完整文件哈希证明，直接默认启用会影响重载后的结果缓存，故仍仅供测试，Goal 继续。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 首次 References 的通用继承闭包试验已限定为内部测试模式：Winstar `get` 独立空缓存约 7.6–8.0 秒，解析 453 个精确候选并补 80 个声明依赖，仍为 112 处且位置摘要不变；默认路径一次为 8,676 ms、解析 1,656 个候选。非 PSR-4 文件中的父类会触发完整扫描回退，已补 stdio 回归测试。该试验尚不能证明任意项目的结果完整，正式路径没有启用，性能 Goal 继续。详见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 首次登记语义表面优化：对新文件直接建立声明与可调用项失效键，已有文件编辑仍做完整比较。Winstar `get` 两轮独立空缓存旧/新为 9,077/8,800 ms、8,798/8,739 ms，完整 112 处位置不变；Semantic 291、Language Server 232 项（1 项跳过）、改动文件 ESLint 和构建通过。收益较小，立即点击仍约 9 秒；Goal 继续。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 新 Alpha 候选 `artifacts/php-companion-alpha-0.4.5-a48b5177` 从干净提交 `a48b5177` 生成；核心、Symfony、开源包、推荐包四个 VSIX 的 `SHA256SUMS` 全部通过，`verify:vsix` 通过。Winstar 的 `alpha:preflight` 确认 WSL2、PHP 8.5 包装器和候选文件完整性；不带 `--check-editor`，因当前远程 CLI 的扩展列表调用未返回。隔离的 VS Code 1.138.0 Core Only、包含 Symfony 的开发模式及从 VSIX 解包的 Extension Host 测试均 exit 0；重新打包后再次核对归档候选四份 SHA-256，仍全部通过。候选尚未安装进用户当前 Alpha Profile；WSL Extension Host 所属、竞争 Provider、真实项目编码与 References 体感仍待人工验收，Goal 保持开放。

2026-09-22 首次 References 最新界限：选中符号后提前静默预热；Winstar 独立空缓存、模拟编辑器 300 ms 光标通知、打开后停留 2.5 秒再点击，`get` 为 6.4–6.9 秒/112 处，服务类为 4.3–4.5 秒/2 处，两者每次只扫描一次且位置 SHA-256 与基线一致。停留 8 秒再点击为 2.36/0.96 秒；立即点击 `get` 仍为 9.46 秒。预取窗口扩至 256、普通符号查询略去命名参数摘要均未带来稳定收益，已撤回。当前产品提交 `d3ff2ce`；隔离的 VS Code 1.138.0 Core Only 与包含 Symfony 的 Extension Host 测试均 exit 0，真实用户 WSL Profile 尚未验收，Goal 继续。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。

2026-09-22 on-demand 语义预热：初始化后后台准备至多两个工作区的内建符号，不启动项目索引。模拟打开后等待两秒，Winstar 首次点击 References 两组旧/新为 9.132/8.219 秒、9.170/8.430 秒，四次完整 112 处位置一致；立即查询新版仍为 9.296 秒，未减少总冷启动计算量。五项相关 stdio 测试、构建/ESLint 通过。未更新安装版，Goal 继续。见 [语义预热](reports/reference-semantic-prewarm-2026-09-22.md)。

2026-09-22 首次 References 预读窗口 128：按需候选扫描仍按文件顺序提交，Winstar 两组交叉冷查询候选阶段从 5.228/5.080 秒降至 4.685/4.615 秒，方法 `get` 首次总耗时旧/新为 10.065/9.018 秒、9.457/9.301 秒，四次完整 112 处位置一致。类引用仍精确两处，单组未见提速。索引 34 项、语言服务器定向 4 项、构建/ESLint 通过；未更新安装版，Goal 继续。见 [预读窗口对照](reports/reference-prefetch-window-128-2026-09-22.md)。

2026-09-22 References 完整容器快照复用：未注册的目标类不再在每次查询重复启动约 0.8 秒的服务 Provider；PHP、配置、Provider 与环境变化使快照失效。Winstar 同进程两次重复查询由 0.867/0.922 秒降至 0.040/0.036 秒，112 处完整位置一致；首次仍约 9–10 秒。六项相关 stdio 测试、构建/ESLint 通过。未更新安装版，Goal 继续。见 [完整容器快照](reports/reference-complete-container-snapshot-2026-09-22.md)。

2026-09-22 首次 References 按目标判定事件 Provider：无已注册服务能贡献该类型或精确方法引用时跳过项目范围事件扫描。Winstar 正式 bundle 两组交叉冷查询旧/新为 11.570/9.330 秒、11.604/9.362 秒，四次均为相同 112 处完整位置；重复查询 0.867/0.922 秒。`AdminSecuritySubscriber` 仍运行事件 Provider 并返回原有两处引用。三项相关 stdio 测试、构建/ESLint 通过。首次仍约 9–10 秒，未更新安装版，Goal 继续。见 [事件相关性门控](reports/reference-event-relevance-gate-2026-09-22.md)。

2026-09-22 首次 References 候选阶段归因：2,289 文件的候选扫描 5.153 秒，主线程来源回调累计 1.647 秒（事实提交 0.939 秒、快照 0.314 秒）；CPU 采样提示 worker 并非持续忙碌。提前启动路由 Provider 的两组交叉冷缓存对照没有稳定收益（旧/新 11.684/11.590 秒、11.766/11.904 秒），试验已撤回；四次仍为相同 112 处完整位置。下一步拆分文件枚举、预读等待和缓存写入，Goal 继续。见 [候选阶段归因](reports/reference-candidate-stage-profile-2026-09-22.md)。

2026-09-22 首次 References 并发 Symfony Provider：服务容器与路由读取重叠，路由变化时重新读取并在返回前校验修订号。Winstar 正式 bundle 两组交叉冷查询旧/新为 12.809/11.193 秒、12.454/11.784 秒，四次均为相同 112 处完整位置；`AdminSecuritySubscriber` 仍准确返回服务/事件两处。四项相关 stdio 测试及 TypeScript/ESLint 通过。首次仍约 11–12 秒，未更新安装版，Goal 继续。见 [并发 Symfony Provider](reports/reference-parallel-symfony-providers-2026-09-22.md)。

2026-09-22 方法 References CPU 采样：撤回无收益的单查询完整成员缓存；保留同一次成员组装中 protected 继承关系的局部复用。两组语义阶段分别减少 103/83 ms，112 处完整位置一致，但首次总耗时仍约 12 秒、未证明稳定整体提速。22 项相关语义测试在 2.64 秒内通过，构建/ESLint 通过。下一步检查候选事实提交和缓存快照传输；未更新安装版，Goal 继续。见 [成员可见性成本](reports/reference-member-visibility-cost-2026-09-22.md)。

2026-09-22 类首次 References 并发准备：类查询接入既有 CandidateWorkers，使源码读取、摘要与匹配文件解析脱离主线程串行路径。Winstar `AdminSecuritySubscriber` 同轮原版/修改版首次为 7.579/5.877 秒，候选扫描 4.230/2.568 秒；两处服务/事件引用完整位置一致。新增 Reload 后未保存消费者优先回归，相关 stdio 4 项在 16.96 秒内通过，构建/ESLint 通过。方法 `get` 仍为正确 112 处、首次 12.623 秒，不宣称其提速；未更新安装版，Goal 继续。见 [类 References 并发准备](reports/class-reference-worker-preparation-2026-09-22.md)。

2026-09-22 Symfony References 缓存和事件 IO：基准接入独立 Symfony 扩展的真实默认注册，修复相同外部事实及后置类型加载反复清空引用缓存。Winstar 同一方法重复查询由约 3.43 秒降至 0.92–1.01 秒；事件文件按每批 8 个读取，两组首次旧/新为 13.617/12.449 秒、13.406/12.519 秒，112 处完整位置摘要一致。`AdminSecuritySubscriber` 返回精确服务注册和事件订阅两处，首次 7.560 秒。语义 3、事件 Provider 3、Symfony stdio 5、正式 bundle 持久化 1 项及构建/ESLint 通过。首次延迟仍待降低，Winstar 默认静态路由快照仍 incomplete；未更新安装版，Goal 继续。见 [Symfony 引用缓存与事件读取](reports/symfony-reference-cache-and-io-2026-09-22.md)。

2026-09-22 References 输入验证继续收口：移除由最终核对覆盖的逐文件重复 stat，并对近期修改文件再次比对内容，处理实际复现的同长度改写、mtime 恢复且 ctime 同时钟粒度不变的情况。两组原版/修改版 Reload 为 2.917/2.504 秒、2.903/2.712 秒，112 处完整位置均一致；空缓存首次仍约 9 秒。21 项底层和正式 stdio 3 项（32.57 秒）、构建/ESLint 通过。候选缓存后台写入实验因收益不明确撤回；基准驱动器退出后多等五秒的问题已修复，减少冷+Reload 循环约十秒空等，最终真实完整对照共 14.39 秒（冷 8.908 秒、Reload 2.676 秒）。未更新安装版，Goal 继续。见 [最终输入核对及验证循环](reports/reference-input-final-validation-2026-09-22.md)。

2026-09-22 References 结果复用已接入核心 on-demand 正式 bundle：后台保存绑定完整候选、依赖/缺失查找、Composer、文档、外部事实、工作区映射和引擎身份的查询结果；重启后核对通过才返回。最终 Winstar 空缓存首次 9.275 秒、Reload 首次 3.053 秒（同轮样本约 2.9–3.1 秒），两轮均为 112 处且完整位置摘要一致；已有重复查询样本 5 ms。底层 19 项和最终跨进程失效用例（24.82 秒）、相关构建/ESLint 通过，新增单命令冷/Reload 位置与实际复用检查。框架 Provider 配置仍回退原流程，空缓存首次和完整 Symfony Profile 尚未达标；Goal 继续，未更新安装版。证据及短验证命令见 [持久化结果复用](reports/reference-result-reuse-2026-09-22.md)。

2026-09-22 References 构建身份：从实际服务器/worker 输出与两份 WASM 生成确定性 ID，启动和审计前后核对运行时及资产；真实 bundle 审计返回 `engineVerified: true`。构建与运行时单元测试、未打包/正式 bundle 冷启动及 Reload 用例、资产变化拒绝、TypeScript/ESLint、watch 初次构建及两次生产构建字节一致性验证通过。基准命令已由包级编译输出改为默认 VSIX bundle，并更正两处旧报告的入口说明；实际冷 References 8.945 秒、112 处完整位置一致，输入审计 2.198 秒。查询结果绑定及框架输入尚未闭合，缓存结果返回未启用；Goal 继续，未更新安装版。证据见 [引擎身份与实际 bundle 验证](reports/reference-engine-identity-2026-09-22.md)。

2026-09-22 References 全候选读取证据：记录全部已扫描/恢复文件摘要，包括被名称筛选跳过的文件；审计按 Composer 排除规则核对完整源码集合，拒绝无通知的新增调用、移动、新建和删除。显式输入及目录核对改为最多 32 项并行，Winstar 审计从原版 3.584/3.590 秒降至最终单次 2.107 秒，完整 2,288 个扫描来源与 112 处引用均保持一致。17 项聚焦测试 8.38 秒、相关构建/ESLint、正式首次位置基线通过；最终冷 References 仍为 9.386 秒，缓存结果返回尚未启用。下一步补齐构建身份、查询结果绑定和框架输入后接入安全复用；未更新 WSL VSIX，Goal 继续。证据见 [全候选读取证据及并行核对](reports/reference-candidate-evidence-2026-09-22.md)。

2026-09-21 精确方法查询提前筛选实验已撤回：同输入两组冷 References 对照为旧/新 9.698/8.314 秒与 8.614/8.979 秒，收益未稳定复现；四次 112 处完整引用和输入指纹均一致。实验的 291 项 Semantic 与 2 项首次 References stdio 验证通过，直接回归约 23 秒；实现/专用测试已撤回，产品保持 `c11784c`。首次耗时仍开放，不以单次较快宣布完成。证据见 [方法名筛选实验](reports/reference-method-name-experiment-2026-09-21.md)。

2026-09-21 References Composer 输入核对：首次加载时记录实际元数据字节摘要和缺失路径，审计不再重复加载 Composer 项目；相同配置语义但不同字节也能拒绝旧证据。Project 11 项、首次 References stdio 2 项、扩展 LSP 回归 128 项及相关构建/ESLint 通过；真实冷查询 9.938 秒、112 处完整位置摘要一致。旧/新审计单次 3.798/3.424 秒，但项目文件数变化，不宣称性能收益。日常循环收窄到直接相关用例，广回归仅阶段收口；接下来补齐候选扫描中跳过文件的读取与文件集合证据。持久化结果返回尚未启用，未更新 WSL VSIX，Goal 继续。证据见 [Composer 读取证据](reports/reference-composer-evidence-2026-09-21.md)。

2026-09-21 References 实际依赖证据：规范类型读取记录成功来源摘要及 ENOENT 路径，截断/错误/超限拒绝；测试审计自动核对工作区来源、Composer 元数据和未保存文档。真实 Winstar 自动取得 2 个依赖、1 个缺失查找、共 2,535 文件，审计 3.866 秒；63 项 LSP 定向回归及 TypeScript/ESLint/正式构建通过，真实首次基线 9.044 秒、112 处摘要一致。仍未启用旧结果返回，Provider 和引擎身份尚需闭合；下一步消除重复 Composer 配置读取。证据见 [依赖读取证据](reports/reference-dependency-evidence-2026-09-21.md)。

2026-09-21 持久化 References 复用的输入校验基础：新增有界文件集合/内容/未保存文档指纹捕获，拒绝扫描中变更、取消、超限和不完整符号链接遍历；7 项定向回归、TypeScript/ESLint 通过。真实 Composer 全依赖达 54,907 PHP 文件、约 247 MB，超过默认校验上限；项目源码加手工指定依赖样本 2,290 文件校验约 1.694 秒，但依赖覆盖尚未证明。模块及基准工具尚未接入查询结果返回，不宣称首次 References 已加速。下一步自动收集实际依赖、失败查找及 Provider 证据。详见 [输入校验基础](reports/reference-input-snapshot-2026-09-21.md)。

2026-09-21 References 按声明恢复缓存：method candidate 使用既有声明恢复路径，方法体按需加载；已经加载的 callable 不再重复合并和失效引用缓存。正式 bundle 的 Reload 首次查询从同轮原版 7.567 / 7.470 秒降至 7.195 秒，112 处完整位置摘要一致，导航后重复 14 ms。语义包 290 项、LSP 定向 52 项（54.84 秒）、相关 TypeScript/ESLint 和正式构建通过。仅改善 Reload 恢复成本，空缓存首次与持久化查询结果复用仍未解决，未更新 WSL VSIX。证据见 [References 声明恢复](reports/reference-deferred-restore-2026-09-21.md)。

2026-09-21 首次路径三项实验：PHPDoc 范围索引、仅有声明的成员候选筛选、内建 stub 声明延迟加载均保持 112 处完整位置摘要，但相对 8.993 秒基线未得到明确总延迟收益（9.066 / 9.286 / 8.936 秒），全部撤回，产品仍以 `8a82269` 为基线。下一步检查可验证输入下的持久化查询结果复用，分别处理 Reload 首次与空缓存首次，不放宽准确性。证据与失效边界见 [首次路径实验](reports/reference-first-query-experiments-2026-09-21.md)。

2026-09-21 普通导航保留 References 缓存：先用语法判断是否处于字面量方法参数内，再执行原有容器服务身份解析，避免普通 Definition/Hover/Completion 加载无关容器接口。正式 bundle 的 References → References → Definition → References 序列保持完整 112 处引用，最后一次查询从 2.679 秒变为 13 ms（语义日志 0 ms）；首次耗时仍待优化。语义包 289 项、LSP 定向 54 项（57.22 秒）、相关 TypeScript/ESLint 和正式构建通过。未更新 WSL VSIX。证据见 [普通导航与引用缓存](reports/reference-navigation-cache-2026-09-21.md)。

2026-09-21 真正首次 References 修复与基准纠正：旧基准先做 Definition，掩盖了未加载 vendor 接收者时 References 全项目扫描后返回空结果的问题。现在先按需解析目标类型链；同一 Winstar 查询从旧版直接首次 27.975 秒、错误 0 处，变为正式 bundle 9.138 秒、正确 112 处。新基线强制 References-first，9.041 秒通过完整位置摘要；Reload 首次 7.483 秒、直接重复 16 ms，但 Definition 后重复仍需 2.679 秒，继续定位。新增冷启动/Reload 属性链与返回链回归，LSP 定向 50 项通过（48.36 秒）、TypeScript/ESLint/正式构建通过。以下历史耗时凡先做 Definition 者仅代表预热路径。未更新用户 WSL VSIX，Goal 保持开放。证据见 [首次 References 接收者加载](reports/first-reference-owner-hydration-2026-09-21.md)。

2026-09-21 References 调用声明查找：优先按签名 URI/位置精确定位，缺失或歧义保留原回退；两处函数返回推断使用已有声明索引并保留文件顺序。冷查询同轮对照 8.132→7.709 秒，完整 112 处位置一致；正式 bundle 冷查询 7.942 秒、Reload 首次 6.166 秒。语义包 288 项、LSP 定向 48 项（43.94 秒，156 项未重跑）、相关 TypeScript/ESLint、正式构建和默认基线命令通过。缓存压缩 JSON 传输实验因变慢未保留；Goal 继续。证据见 [调用声明查找](reports/reference-callable-lookup-2026-09-21.md)。

2026-09-21 References 候选流水线与传输：候选预读窗口改为已有上限 64，语法事实由 worker JSON 序列化后传输，单文件更新复用 PHPDoc，并将 worker 上限降为 4。同轮实验冷查询 9.289→8.004 秒、峰值 RSS 894,400→729,928 KiB；正式 bundle 冷查询 8.249 秒、Reload 首次 6.481 秒，两次仍为相同 112 处完整引用。语义包 287、Language Server 204 项、相关 TypeScript/ESLint、正式构建和默认基线命令通过。基准支持可选峰值 RSS 输出；未冻结新 VSIX，首次查询仍须优化。证据见 [候选流水线与语法事实传输](reports/reference-preparation-transport-2026-09-21.md)。

2026-09-21 References 局部语法查找范围裁剪：跳过范围外子树、无 yield 候选的函数跳过生成器分析。Winstar 冷查询语义阶段同机对照 3.326→2.874 秒，保持相同 112 处完整引用；正式 bundle 冷查询 9.203 秒、Reload 首次 6.332 秒。语义包 286、Language Server 200 项、相关 TypeScript/ESLint、正式构建和真实项目摘要基线命令通过；首次交互仍慢，Goal 继续。证据见 [限制局部语法查找范围](reports/ranged-reference-syntax-2026-09-21.md)。

2026-09-21 首次 References 有界连续预读：移除每批 32 文件的整批等待，保持语义提交顺序与候选范围。Winstar 同文件数冷对照 11.518→9.826 秒，完整 112 处引用摘要一致；正式 bundle 冷查询 9.731 秒、Reload 首次 7.263 秒，结果仍一致。Index 34、Language Server 200 项、相关 TypeScript/ESLint 和正式构建通过。验证按聚焦迭代加一次 LSP 全量回归执行，未重新冻结 VSIX；交互耗时目标仍未达成。证据见 [有界连续预读](reports/rolling-reference-prefetch-2026-09-21.md)。

2026-09-21 首次 References 缓存压缩改为 worker 延迟完成：语义事实仍按文件顺序提交，全部缓存负载完成后才写盘。Winstar 两轮空缓存成对测试中首次 References 13.241→11.451 秒、13.078→11.615 秒，四轮均为相同 112 处引用；正式扩展 bundle 冷查询 11.621 秒、Reload 6.875 秒，位置仍一致。Index 32、Language Server 200 项、改动 lint 和正式构建通过；仍未达到最终交互目标。证据见 [缓存压缩与语义提交重叠](reports/deferred-reference-cache-compression-2026-09-21.md)。

2026-09-21 References 持久缓存预恢复：缓存条目由最多 8 个工作线程并行解压和校验，主线程仍按文件顺序提交，失败回退同步恢复。Winstar 两轮成对 Reload 对照中候选阶段 4.586→3.985 秒、4.430→4.111 秒，四次均为相同 112 处引用；Index 31、Language Server 全套 200 项通过，正式扩展 bundle 再次得到相同 112 处引用。冷查询仍约 13–14 秒。证据见 [并行准备缓存恢复](reports/parallel-reference-cache-restore-2026-09-21.md)。

2026-09-21 References 精确匹配去除无关断言调用：Winstar `get()` 单轮冷 References 14.770→13.826 秒，Reload 首次 7.826→7.142 秒；四次均为相同 112 处完整引用。语义全套 285 项通过；首次响应仍慢，未冻结新 Alpha 候选。证据见 [断言调用预筛选](reports/reference-assertion-pruning-2026-09-21.md)。

2026-09-21 首次 References 有界并行语法准备：冷缓存候选由至多四个工作线程解析，再按路径顺序提交语义事实；热缓存跳过线程，失败时回退原解析。Winstar 同轮旧/新冷 References 为 21.427/15.256 秒，Reload 首次为 8.682/8.532 秒，四轮均返回相同 112 处完整位置；2,280 文件中 1,648 个候选通过线程准备。Parser 75、Index 30、Semantic 284、Language Server 全套 200 项、独立 24 tarball、构建/ESLint、核心 VSIX 内容校验均通过；正式打包服务器单独冷查询 15.145 秒且位置相同。尚未冻结新 Alpha 候选或完成用户 WSL Profile 持续编辑验收，速度仍待降低。证据见 [并行准备候选语法](reports/parallel-reference-preparation-2026-09-21.md)。

2026-09-21 首次 References 节点筛选与声明索引：减少完整解析的 JavaScript 节点访问、候选名称重复归一化和类型查找的全工作区声明汇总。Winstar 2,278 文件全部解析事实及候选摘要与基线零差异；同配置旧/新冷 References 为 22.519/20.380 秒，Reload 首次为 9.287/8.704 秒，均为相同 112 处完整位置。Parser 74、Index 29、Semantic 283、缓存 4 项、关键 LSP 7 项、构建/ESLint 和 24 个独立 tarball 通过。未冻结新 VSIX，延迟尚未达标。证据见 [语法节点筛选与声明索引查找](reports/selected-syntax-reference-lookups-2026-09-21.md)。

2026-09-21 首次 References 延迟方法体：保留完整候选和继承声明，只为需要的文件构建方法体事实，并保存经过校验的独立声明缓存。Winstar 2,278 文件声明与完整解析零差异；同机旧/新冷 References 为 27.944/23.151 秒，当前 Reload 首次为 9.333 秒，均为相同 112 处完整位置。Parser 73、Semantic 282、缓存 4 项、关键 LSP 7 项、改动 ESLint、受影响包构建及 24 个独立 tarball 消费通过。本轮沿用短验证循环、未重新冻结 VSIX；冷查询及 Reload 延迟仍待降低。证据见 [声明提取与延迟方法体](reports/deferred-reference-declarations-2026-09-21.md)。

2026-09-21 首次 References 避免重复事实提取：Parser 新增只创建语法树的 `parseTree()`，Semantic 中 23 处只需语法树的查询不再重复构造完整声明/作用域/控制流事实；完整解析复用遍历父节点、按根错误状态选择错误检查，并按顺序处理名称排除范围。Winstar 2,278 个项目 PHP 文件的全部解析数据与旧版逐一比较为零差异；同机旧/新冷 References 为 36.330/29.257 秒，新进程复用缓存后首次 References 为 11.811 秒，均保持相同 112 处完整位置。Parser 70、Semantic 279、10 项关键 LSP 回归、受影响包构建/ESLint 和 24 个独立 tarball 消费通过。本轮采用短验证循环，未重新冻结 VSIX；首次延迟与真实 WSL Profile 验收仍待继续。证据见 [首次 References：避免重复语义提取](reports/tree-only-reference-queries-2026-09-21.md)。

2026-09-21 Parser 节点访问优化：主遍历每个节点只读一次 Tree-sitter 类型，成员/调用种类集合每个文档只建一次，作用域查找改用保持原先同长度次序的单次循环。真实 Winstar `attributes->get()` 独立冷缓存首次 References 从上一候选 44.472 秒降至 37.350 秒，均为相同 112 处完整位置；候选阶段 33.123→27.665 秒。Parser 67、Semantic 279、Language Server 199 项、根 TypeScript/ESLint 与 24 个独立 tarball 通过。功能提交 `f25a34f`，候选 `artifacts/php-companion-alpha-0.4.5-76e99553/`；四份 VSIX SHA、Winstar 确定性 WSL/PHP 8.5 preflight 及 VS Code 1.138.0 打包双扩展宿主通过。首次查询仍约 37 秒，不能视为交互性能问题结束。证据见 [PHP Parser 节点访问成本与首次 References](reports/parser-node-access-references-2026-09-21.md)。

2026-09-21 Parser 完整遍历合并：合法 PHP 从顶层取得 namespace，类型引用并入现有语义遍历；语法错误文件保留完整 namespace 恢复。真实 Winstar `attributes->get()` 两组独立冷缓存首次 References 从旧版 46.570/46.769 秒变为 44.532/42.742 秒，每次均返回相同的 112 个精确位置；候选文件数未缩小。Parser 67、Semantic 279、Language Server 199 项、根 TypeScript/ESLint 及 24 个隔离组件 tarball 通过。功能提交 `0ee94ad`，候选 `artifacts/php-companion-alpha-0.4.5-e634b421/`；四份 VSIX SHA、Winstar 确定性 WSL/PHP 8.5 preflight 和 VS Code 1.138.0 打包双扩展宿主均通过。约 43–45 秒的首次查询及真实 Profile 验收仍须继续。证据见 [PHP 语法树单次完整遍历与首次 References](reports/parser-single-walk-references-2026-09-21.md)。

2026-09-21 工作区内重复 References 结果缓存：语义工作区只缓存至多 32 项、每项至多 2,048 个精确位置，并在源码、快照、延迟实现、外部 Provider 或 Callable 构造事实变化时失效。真实 Winstar 的同位置第二次 `attributes->get()` References 从冻结旧候选的 11.311 秒降至当前 0.017 秒；首次仍约 48 秒，两版每次均为 112 处且完整位置 SHA-256 一致。专项测试覆盖候选编辑、快照恢复及外部事实替换；语义包 279 项、Language Server 199 项、TypeScript/ESLint 和 24 个组件独立消费验证通过。功能提交 `d291400`，候选 `artifacts/php-companion-alpha-0.4.5-bd5e4126/`；四份 VSIX 校验和、Winstar 确定性 WSL/PHP 8.5 preflight 与 VS Code 1.138.0 打包双扩展宿主均通过。真实 Profile 持续编辑和首次约 48 秒查询仍未解决。证据见 [工作区内重复 References 查询缓存](reports/repeated-reference-query-cache-2026-09-21.md)。

2026-09-21 高频成员候选缩小审计：真实 Winstar `get()` 查询若只解析独立 token 文件，References 从 112 降到 66；补入三层 Controller 声明后该样本恢复 112，但 1,248 个 `get` 访问中仍有 524 个无法唯一解析，不能证明通用缩小规则安全。实验代码已撤回，保留原保守候选。语义更新中跨文件 `value-of<Enum>` 改用已有声明倒排索引；Winstar 完整 112 处摘要不变，语义包 279 项、Language Server 199 项、TypeScript/ESLint、24 个组件独立消费、四份 VSIX SHA、Winstar 确定性 WSL preflight，以及 VS Code 1.138.0 打包双扩展宿主退出码 0 均通过，单次时间不足以证明显著提速。功能提交 `cc874e3`，候选 `artifacts/php-companion-alpha-0.4.5-7df60a26/`。证据见 [高频成员引用候选缩小审计](reports/member-candidate-narrowing-audit-2026-09-21.md)。

2026-09-21 按需语义快照缓存：保留保守候选范围，将已解析 PHP 文件的 checksum 校验语义快照持久化并有界压缩；热进程恢复快照，打开或变化文件重读，损坏/过大回退源码。真实 Winstar `attributes->get()` 冷/热独立 LSP 进程分别 112/112 处 References、48.866/18.251 秒，完整位置摘要与前一候选一致；热进程 1,646 个候选从快照恢复，缓存文件约 30 MiB。冷查询因写缓存变慢，热查询仍需约 18 秒。语言服务器 199 项、TypeScript/ESLint、24 个组件独立消费、四份 VSIX SHA、Winstar PHP 8.5 确定性 WSL preflight，以及 VS Code 1.138.0 打包双扩展宿主退出码 0 均通过。功能提交 `9e95517`，候选 `artifacts/php-companion-alpha-0.4.5-9e955173/`；真实 Profile 验收仍未完成。证据见 [按需引用候选的持久语义快照](reports/on-demand-semantic-snapshot-cache-2026-09-21.md)。

2026-09-21 高频成员 References 语法树复用：成员与继承声明查找改用已有倒排索引，同一候选文件在一次引用查询中仅临时保留一棵语法树并逐文件释放。真实 Winstar 的 `attributes->get()` 从冻结旧 VSIX 的 93.555 秒降至当前 41.804 秒；旧/新同为 112 处且**全部引用位置 SHA-256 一致**。新代码冷/热进程 112/112 处、41.804/40.822 秒，位置摘要一致；约 29 秒候选扫描仍待优化。语义包 279 项、Language Server 199 项、全仓 TypeScript/ESLint、24 个独立 tarball、四份 VSIX SHA、Winstar 确定性 WSL preflight，以及 VS Code 1.138.0 打包双扩展宿主退出码 0 均通过。功能提交 `e3875c6`，候选 `artifacts/php-companion-alpha-0.4.5-e3875c60/`；真实 Profile 验收仍未完成。证据见 [高频成员 References 的语法树复用](reports/common-member-reference-query-2026-09-21.md)。

2026-09-21 按需 References 候选缓存修复：冷扫描与热缓存恢复现在对原有子串候选使用相同判断，超长标识符标为不完整并升级共享摘要缓存版本；完整标识符模式保持独立。索引包 28 项、Language Server 199 项、全仓 TypeScript/ESLint、24 个隔离组件 tarball 及 VS Code 1.138.0 打包双扩展宿主验证通过。真实 Winstar 的 `attributes->get()` 在两个独立 LSP 进程中均返回 112 处 References、相同的 43 个文件 URI；冷/热用时约 95/99 秒，仍须优化，结果未核对全部行列坐标。功能提交 `8922119`，候选 `artifacts/php-companion-alpha-0.4.5-89221196/`，四份 VSIX SHA 与 Winstar 确定性 WSL preflight 通过。证据见 [按需 References 候选缓存与冷/热一致性](reports/on-demand-substring-candidate-cache-2026-09-21.md)。

2026-09-21 Winstar 按需导航复核：真实 Language Server stdio 冷/热进程在独立 Symfony service/event Provider 启用时，从 `AdminSecuritySubscriber` 类声明得到精确 2 处 References 和声明 Definition；`$urlGenerator` 得到 3 处 References 及 3 处 F2 编辑。冷/热类查询约 9.2/5.0 秒，两轮全量索引进度和启动日志均为零。此为只读进程审计，实际 VS Code WSL Alpha Profile 的长时间交互仍待验收。证据见 [Winstar 按需导航与引用复核](reports/on-demand-navigation-winstar-2026-09-21.md)。

2026-09-21 真实 LSP 索引进度复核：新增只读协议审计，Winstar PHP 8.5 与 CoreRepo PHP 7.2 在 `experimental` 完整索引模式下，冷/热两轮均发出 “Indexing PHP symbols” begin、100% 和 end；热缓存各为 9,999/9,999，最终 `pending=0`。冷启动分别约 122/79 秒，热启动约 19/14 秒。依赖预算截断的 `complete=false` 不会使进度悬挂；默认 `onDemand` 不会在 Reload 时主动全量索引。结果只证明独立 LSP 进程，不代表用户 Alpha Profile 的实际设置或持续编辑验收。证据见 [真实 LSP 索引进度报告](reports/real-lsp-progress-2026-09-21.md)。

2026-09-21 主索引元数据有界预取：Language Server 改用索引器已有的并发 32 元数据预取，语义提交顺序、缓存格式和类型结果不变。真实 Winstar 9,999 文件热索引单次测量 19.9→17.1 秒，CoreRepo 14.9→12.6 秒；两项目均 9,999/9,999 缓存命中、零重解析，20 个抽样类型的 References 分别 180/113 个位置一致。索引包 27 项、语言服务器 198 项、根扩展 45 项、TypeScript、ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 打包宿主与双项目确定性 WSL preflight 通过；功能提交 `a557e43`，候选 `artifacts/php-companion-alpha-0.4.5-a557e434/`。真实 WSL 手工验收边界见 [有界索引预取报告](reports/bounded-index-prefetch-2026-09-21.md)。

2026-09-21 条件同名声明的 `@mixin` 缓存恢复：Gedmo ORM 2/3 兼容文件的同名条件 Trait 原先产生重复 mixin 关系，Winstar v61 热启动每次重解析 3 个文件；现对无法静态唯一确定的 owner 不发布 mixin，语义快照升 schema 81、索引缓存升 v62。真实 Winstar 和 CoreRepo 各 9,999 文件的冷/热审计均达到 9,999/9,999 热缓存命中、零重解析，20 个抽样类型的 References 分别 180/113 个位置全部一致；全仓 822 项测试、TypeScript、ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 打包宿主和双项目确定性 WSL preflight 通过。功能提交 `fc19158`，候选 `artifacts/php-companion-alpha-0.4.5-fc191583/`；真实 WSL 手工验收边界见 [条件 mixin 缓存恢复报告](reports/conditional-mixin-cache-2026-09-21.md)。

2026-09-21 PHPDoc 可空模板属性：`@template T of object` 下的 `@var T|null` 现在能精确细化原生 `?object` 属性，泛型 mixin 的空安全成员链得到具体实参类型；非空 `object` 不接受可空文档类型。语义快照升至 schema 80、索引缓存升至 v61，避免旧缓存回放宽泛类型。全仓 821 项测试、TypeScript、ESLint、24 个隔离 tarball、四份 VSIX 校验和、VS Code 1.138.0 打包宿主及 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过；功能提交 `4647ef9`，候选 `artifacts/php-companion-alpha-0.4.5-4647ef97/`。真实 WSL Remote 持续编辑仍待人工验收。证据见 [可空模板属性验收](reports/phpdoc-nullable-template-properties-2026-09-21.md)。

2026-09-21 PHP 核心泛型 `@mixin`：`@mixin Delegate<Result>` 现按目标模板约束特化公开实例方法和属性的返回链，`@var T` 与原生 `object` 的精确约束可保留模板类型；实参数量错误、违反 bound 或目标缺失保持 unknown。语义快照升级 schema 79，索引缓存升级 v60。全仓 821 项测试、TypeScript、ESLint、24 个隔离 tarball、VS Code 1.138.0 打包宿主，以及 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过；功能提交 `b268269`，候选 `artifacts/php-companion-alpha-0.4.5-b268269e/`。真实 WSL Remote 持续编辑仍待人工验收。证据见 [PHPDoc 泛型 mixin 精准成员验收](reports/phpdoc-generic-mixin-members-2026-09-21.md)。

2026-09-21 PHP 核心 `@mixin` 精准成员：类级 PHPDoc 的唯一名称目标现作为声明事实和类型依赖保存；只代理唯一已索引目标的公开实例方法/属性，真实声明、继承和 Trait 优先；两个 mixin 同名、缺失/重复目标、静态或不可见成员以及循环保持 unknown。成员补全、Signature Help、返回链、Definition 与热恢复共享同一身份，语义快照升级 schema 78、索引缓存升级 v59。全仓 820 项测试、TypeScript、ESLint、24 个隔离 tarball、VS Code 1.138.0 打包双扩展宿主及 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过。功能提交 `9a6ec12a`，候选 `artifacts/php-companion-alpha-0.4.5-9a6ec12a/`；四份 VSIX 校验和通过。真实 WSL Remote 持续编辑仍待人工验收。证据见 [PHPDoc mixin 精准成员验收](reports/phpdoc-mixin-members-2026-09-21.md)。

2026-09-21 Symfony PHP 数组服务环境配置：独立 `sohophp.php-companion-symfony` 现可静态读取 `PhpFileLoader` 的数组返回配置，并按每个工作区根的 `phpCompanion.symfony.environment` 合并无条件 imports/parameters/services 与精确 `when@environment`。服务/别名、参数、规范 `service()`/`param()` 及安全 `'@service'`、`'%parameter%'` 字符串进入 Definition、References、Completion 与原子 Rename；动态键、非数组环境、factory/parent 和无法保持源码范围的值整体拒绝。全仓 818 项自动测试、TypeScript、ESLint、24 个隔离 tarball、VS Code 1.138.0 最终打包双扩展宿主及双项目确定性 WSL preflight 通过。功能提交 `6fa3421c`，候选 `artifacts/php-companion-alpha-0.4.5-6fa3421c/`；四份 VSIX 校验和通过。真实 WSL Remote 持续编辑仍待人工验收。证据见 [Symfony PHP 数组服务环境配置验收](reports/symfony-php-array-service-environments-2026-09-21.md)。

2026-09-21 Symfony PHP Configurator 环境专属服务：独立 `sohophp.php-companion-symfony` 现按每个工作区根的 `phpCompanion.symfony.environment` 合并闭包无条件语句与精确顶层 `$container->env() === 'literal'` 分支，当前环境的服务、别名、参数和引用进入 Definition、References、Completion 与原子 Rename，运行时环境切换无需 Reload Window。未选环境只保留无条件语句；非活动环境、else/elseif、复合或嵌套条件、动态环境及 PHP 数组返回式 `when@env` 保持排除或不完整。全仓 816 项自动测试、TypeScript、ESLint、24 个隔离 tarball、VS Code 1.138.0 最终打包双扩展宿主及双项目确定性 WSL preflight 通过。功能提交 `685de866`，候选 `artifacts/php-companion-alpha-0.4.5-685de866/`；四份 VSIX 校验和通过。真实 WSL Remote 持续编辑仍待人工验收。证据见 [Symfony PHP Configurator 环境专属服务配置验收](reports/symfony-php-service-environments-2026-09-21.md)。

2026-09-21 Symfony XML 环境专属服务：独立 `sohophp.php-companion-symfony` 现按每个工作区根的 `phpCompanion.symfony.environment` 合并 `<container>` 无条件配置与精确 `<when env="…">`，当前环境的 imports、parameters、services 和引用进入 Definition、References、Completion 与原子 Rename，运行时环境切换无需 Reload Window。解析器同时修复无属性自闭合 XML 元素漏识别，非活动环境、缺失/动态环境、嵌套 when、重复活动根和损坏 XML 保持拒绝。全仓测试、TypeScript、ESLint、24 个隔离 tarball、VS Code 1.138.0 最终打包双扩展宿主及双项目确定性 WSL preflight 通过，共 814 项自动测试。功能提交 `2f736dc7`，候选 `artifacts/php-companion-alpha-0.4.5-2f736dc7/`；四份 VSIX 校验和通过。Winstar 当前没有 XML `when` 正样本，实际 WSL Remote 持续编辑仍待人工验收。证据见 [Symfony XML 环境专属服务配置验收](reports/symfony-xml-service-environments-2026-09-21.md)。

2026-09-21 Symfony YAML 环境专属服务：独立 `sohophp.php-companion-symfony` 现按每个工作区根的 `phpCompanion.symfony.environment` 合并基础配置与精确 `when@env`，并将当前环境的 import、service、alias、parameter 和引用纳入 Definition、References、Completion 与原子 Rename；运行时切换环境会精确刷新容器和事件事实，无需 Reload Window。非活动环境、损坏活动区块及错误环境的 dev 编译容器保持排除。全仓测试、TypeScript、ESLint、24 个隔离 tarball、VS Code 1.138.0 打包双扩展宿主及双项目确定性 WSL preflight 通过，共 812 项自动测试。功能提交 `76aaebc9`，候选 `artifacts/php-companion-alpha-0.4.5-76aaebc9/`；四份 VSIX 校验和通过。Winstar 当前没有服务 YAML `when@env` 正样本，实际 WSL Remote 持续编辑仍待人工验收。证据见 [Symfony YAML 环境专属服务配置验收](reports/symfony-yaml-service-environments-2026-09-21.md)。

2026-09-21 Symfony PHP 参数导航：PHP Configurator 的 `parameters()->set()` 声明和官方 `param()` 引用已进入 YAML/XML/PHP 共用参数图，普通业务 `$this->param()`、错误 import、动态 ID 和重赋值 DSL 变量保持排除。Definition、References、Completion 与原子 Rename 已覆盖独立扩展请求及核心 PHP `textDocument/rename` 路径；framework-symfony 48 项、provider 2 项、独立扩展 4 项、Language Server 198 项、全仓 TypeScript 与 ESLint 通过。首次打包宿主准确暴露 PHP F2 接线缺口，修复后 VS Code 1.138.0 隔离双 VSIX 宿主以状态码 0 退出。功能提交 `30444313`，候选 `artifacts/php-companion-alpha-0.4.5-30444313/`；四份 VSIX 校验和及 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过。证据见 [Symfony PHP Configurator 参数导航与重命名验收](reports/symfony-php-parameter-navigation-2026-09-21.md)。

2026-09-21 Symfony XML 参数导航：独立 Symfony 扩展已把标准 XML `<parameters><parameter key="…">` 声明及原始文本/属性中的 `%parameter.id%` 纳入与 YAML 共用的参数身份图，提供跨格式 Definition、References、Completion 与原子 F2 Rename。Provider 仍只发布 ID 与源码范围，不读取或序列化值；DOCTYPE、环境 `<when>`、Entity、CDATA、注释、转义、env 表达式、歧义声明和不完整扫描均保持拒绝。framework-symfony 47 项、provider-symfony-services 2 项、php-companion-symfony 4 项、Language Server 198 项、全仓 TypeScript 与 ESLint 通过；VS Code 1.138.0 隔离打包双扩展宿主验证跨格式导航、补全和标准 F2，并以状态码 0 退出。功能提交 `ff4bdf81`，候选 `artifacts/php-companion-alpha-0.4.5-ff4bdf81/`；四份 VSIX 校验和及 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过。Winstar 当前没有 XML 参数样本，因此保留真实项目人工验收边界。证据见 [Symfony XML 参数导航与重命名验收](reports/symfony-xml-parameter-navigation-2026-09-21.md)。

2026-09-21 Symfony YAML 参数导航：独立 `sohophp.php-companion-symfony` 扩展现在从权威配置图发布顶层 YAML `parameters` 身份，并为精确 `%parameter.id%` 占位符提供 Definition、References、Completion 和原子 F2 Rename；Provider 只传递 ID 与源码范围，不读取或发布参数值。声明不唯一、配置图不完整、不可读或超限文件、转义 `%%...%%`、`%env(...)%`、需要 YAML 解码的字符串、非法名称和损坏文档均保持无结果。framework-symfony 46 项、semantic-provider 8 项、provider-symfony-services 2 项、php-companion-symfony 4 项、Language Server 198 项、全仓 TypeScript 与 ESLint 通过；VS Code 1.138.0 隔离打包双扩展宿主验证 Definition、References、Completion 和标准 F2 两处原子编辑，并以状态码 0 退出。功能提交 `8b03597a`，候选 `artifacts/php-companion-alpha-0.4.5-8b03597a/`；四份 VSIX 校验和及 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过。Winstar `config/` 只读样本包含 3 个参数区块和 5 个不同静态占位符。证据见 [Symfony YAML 参数导航与重命名验收](reports/symfony-yaml-parameter-navigation-2026-09-21.md)。

2026-09-21 Symfony 容器服务引用：独立 Symfony 扩展的权威服务目录现在可驱动 PSR/Symfony `ContainerInterface::get('service.id')` 的 Definition、References、Completion 和原子 Rename；核心语义层必须先把接收者精确解析到允许的方法族，普通业务对象的同名 `get()`、动态/具名/展开/多参数及转义字符串保持无结果。真实 Winstar `src/` 有大量其它对象的字面量 `get()`，但没有 ContainerInterface 接收者，均作为负样本保持排除。semantic 275 项、Language Server 198 项、全仓 TypeScript 与 ESLint 通过；VS Code 1.138.0 隔离打包双扩展宿主进一步验证 Definition、References、Completion、三种 F2 起点、Undo 和业务 `get()` 反例，并以状态码 0 退出。功能提交 `462b3d4`，候选 `artifacts/php-companion-alpha-0.4.5-f26297c0/`；四份 VSIX 校验和及 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过。独立 Symfony 插件结构已完成；按当前范围估算，Symfony 日常核心工作流收口还需 5–8 个工作日，PHP Companion Beta 主路径约 4–6 周，完成当前“接近 PhpStorm”路线图及最终资格验收约 8–12 周。证据见 [Symfony 容器 get 服务引用验收](reports/symfony-container-get-service-references-2026-09-21.md)。

2026-09-21 onDemand Reload 索引修复：独立 Symfony 扩展动态注册 Provider 时不再启动全项目索引；TwigPlus 首次请求 Controller 上下文时，Language Server 只扫描 Composer 项目源码摘要、解析含精确 `render` 标识符的候选文件，并按 PSR-4 定点加载上下文变量类型。首次源码扫描也使用相同标识符筛选，避免 `surrender` 等子串误命中超过 Provider 的 128 文档协议上限。真实 Winstar 2,277 个 PHP 文件冷扫描 12.918 秒、热扫描 9.669 秒，均返回 9 个模板上下文，解析 111 个候选且 `[index:]` 日志为 0；Reload/Provider 注册回归也确认 onDemand 不启动全量索引。Language Server 198 项、全仓 806 项、TypeScript、ESLint及 VS Code 1.138.0 隔离打包双扩展宿主通过；功能提交 `85c9a4f`，候选 `artifacts/php-companion-alpha-0.4.5-85c9a4fc/`，五份本地 VSIX 校验和及 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过。证据见 [onDemand Controller 上下文索引验收](reports/on-demand-controller-context-indexing-2026-09-21.md)。

2026-09-21 Symfony Autowire 服务引用：独立 Symfony 扩展现在把项目 PHP 中可证明属于 Symfony 的 `#[Autowire(service: '...')]` 字面量纳入 YAML/XML/PHP Configurator 权威服务图，提供 Definition、References、Completion 及双向原子 Rename；配置图或有界项目扫描不完整时整体拒绝。注释、字符串、无关同名 Attribute、错误 import、多 namespace 歧义和转义值保持无结果。framework-symfony 45 项、Language Server 198 项、全仓 806 项、TypeScript、ESLint及 VS Code 1.138.0 隔离打包双扩展宿主通过；宿主已验证五处编辑、一次 Apply/Undo 及从 Attribute 发起标准 F2。真实 Winstar 当前有 24 处可用于 WSL 人工验收的 service Attribute。功能提交 `2dbd300`，候选 `artifacts/php-companion-alpha-0.4.5-2dbd300f/`；五份 VSIX 校验和与 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过。证据见 [Symfony Autowire 服务引用与重命名验收](reports/symfony-autowire-service-references-2026-09-21.md)。

2026-09-21 Symfony 路由缓存精确失效：普通 PHP 文档打开、输入与关闭不再清空静态路由 Provider 缓存；Route Attribute、Kernel/Configurator、约定 PHP 路由配置、YAML/XML、Provider 配置及不确定删除仍保守失效。Provider 打开文档快照也排除不可能声明路由的 PHP 文件，运行时独有路由补全改为显示 `runtime route`。回归测试证明普通修改前后 Provider 调用保持 1 次，YAML 路由变化后为 2 次，打开 Route Attribute 后为 3 次；Language Server 198 项、全仓 805 项、TypeScript、ESLint、24 个隔离 tarball、VS Code 1.138.0 开发/打包双扩展宿主及双项目确定性 WSL preflight 通过。功能提交 `8ff6a81`，候选 `artifacts/php-companion-alpha-0.4.5-8ff6a817/`，四份 VSIX 校验和通过。证据见 [Symfony 路由缓存失效范围验收](reports/route-cache-invalidation-scope-2026-09-21.md)。

2026-09-21 Symfony 运行时权威路由目录：启用 Winstar Provider 时，实际 Router 输出现在拥有完整路由名称/路径集合，静态 Provider 只为同名同路径结果补充唯一源码位置；运行时独有路由仍可补全和查找 PHP 引用，但不再伪造 Definition。权威 Provider 失败、不完整、冲突或快照溢出时整次查询安全关闭；无运行时所有者时也只接受完整静态图。真实 Winstar 运行时得到 704 条路由，其中 362 条有唯一来源、342 条仅运行时确认；静态分析因自定义 loader 正确报告 `complete: false` 和 17 条来源。Language Server 198 项、全仓 805 项、TypeScript、ESLint、24 个隔离 tarball、VS Code 1.138.0 开发/打包双扩展宿主及双项目确定性 WSL preflight 通过。功能提交 `e29a89b`，候选 `artifacts/php-companion-alpha-0.4.5-e29a89b0/`，四份 VSIX 校验和通过。证据见 [Symfony 运行时权威路由目录验收](reports/authoritative-runtime-route-catalog-2026-09-21.md)。

2026-09-21 Symfony 编辑器能力独立所有权：YAML/XML/PHP Configurator 的 Definition、References、Completion 及 YAML/XML Rename 注册已从核心扩展迁入 `sohophp.php-companion-symfony`；plugin API v1 通过可选且限定 `phpCompanion/` 命名空间的请求桥复用核心 Language Server 生命周期。core-only VS Code 1.138.0 宿主确认 Symfony Definition/References/Completion/Rename 均无结果，双扩展开发与打包宿主继续通过全部功能并报告 `languageFeaturesRegistered: true`。全仓 804 项、TypeScript、ESLint、24 个隔离 tarball及双项目确定性 WSL preflight 通过。功能提交 `762f7a1`，候选 `artifacts/php-companion-alpha-0.4.5-762f7a1e/`，四份 VSIX 校验和通过。证据见 [Symfony 编辑器能力独立扩展所有权验收](reports/standalone-symfony-editor-features-2026-09-21.md)。

2026-09-21 Symfony 服务 ID 原子重命名：唯一显式字符串注册现在可从 Provider 确认的 YAML/XML/PHP Configurator 配置发起 Rename，并在一个 WorkspaceEdit 中修改完整三格式配置图；注册歧义、resource 派生、编码/动态值、不可读配置和非法新 ID 整体拒绝。真实宿主发现并修复 Provider 发布不存在传统候选 URI 导致安全 Rename 拒绝的问题，同时保留 Bundle 类失效输入。Language Server 198 项、全仓 803 项、TypeScript、ESLint、24 个隔离 tarball及 VS Code 1.138.0 开发/打包双扩展宿主通过，跨四处编辑和单步 Undo 已验证。功能提交 `bd748be`，候选 `artifacts/php-companion-alpha-0.4.5-bd748be1/`；四份 VSIX 校验和与 Winstar PHP 8.5/CoreRepo PHP 7.2 确定性 WSL preflight 通过。证据见 [Symfony 服务 ID 原子重命名验收](reports/symfony-service-id-rename-2026-09-21.md)。

2026-09-21 Symfony PHP Configurator 服务引用导航与补全：独立容器 Provider 确认的 `services.php` 现在精确识别导入的 `service()`、服务集合 `get()`/`remove()`、alias 目标、parent 与 decorator；Definition、References 和字符串服务 ID 补全跨 YAML/XML/PHP 权威配置图工作。从 PHP 类声明执行 References 时，也会合并该类唯一服务 ID 的三格式配置用法。`set()` 首参保持声明语义，类常量不提供会破坏语法的字符串补全，动态表达式、错误闭包、变量重赋值、普通 PHP 和歧义注册保持无结果。framework-symfony 45 项、Language Server 198 项、全仓 803 项、TypeScript、ESLint、24 个隔离 tarball及 VS Code 1.138.0 开发/隔离打包双扩展宿主通过。真实 Winstar `AdminSecuritySubscriber` 类 References 首次 8.173 秒，精确返回 resource 注册和事件订阅两处，全量索引信号为 0。功能提交 `3156c8a`、`c965290`，候选 `artifacts/php-companion-alpha-0.4.5-c965290e/`；四份 VSIX 校验和及双项目确定性 WSL preflight 通过。打包宿主首次在既有动态属性诊断固定等待点超时，原样重跑通过。证据见 [Symfony PHP Configurator 服务引用导航与补全](reports/symfony-php-service-navigation-2026-09-21.md)。

2026-09-21 Symfony XML 服务 ID 补全：独立容器 Provider 确认的传统 XML 服务引用属性现在按当前前缀补全唯一权威服务；空的成对引号可列出目录，替换范围只覆盖属性值，保留属性名、引号与外围 XML。声明 ID、普通标量、参数表达式、编码实体、DOCTYPE、环境 `<when>`、损坏 XML 和歧义注册保持无结果；Red Hat XML 继续拥有通用 Schema、语法补全与格式化。framework-symfony 44 项、Language Server 198 项、全仓 802 项、TypeScript、ESLint、24 个隔离 tarball 及 VS Code 1.138.0 开发/隔离打包双扩展宿主通过。功能提交 `bc5014b`，候选 `artifacts/php-companion-alpha-0.4.5-bc5014bf/`；四份 VSIX 校验和及双项目确定性 WSL preflight 通过。证据见 [Symfony XML 服务 ID 补全](reports/symfony-xml-service-completion-2026-09-21.md)。

2026-09-21 Symfony XML 服务引用导航：独立容器 Provider 确认的传统 XML 配置现在识别明确 service/service_closure 参数、属性与 bind，以及 alias、parent、decorates、factory/configurator 服务属性；Definition 只跳到唯一权威注册，References 可从 YAML/XML 任一入口跨格式返回全部精确用法。声明 ID、普通标量、参数表达式、注释、DOCTYPE、环境 `<when>`、损坏 XML 和歧义注册保持无结果；Red Hat XML 继续拥有通用 XML 能力。framework-symfony 44 项、Language Server 198 项、全仓 802 项、TypeScript、ESLint、24 个隔离 tarball 及 VS Code 1.138.0 开发/隔离打包双扩展宿主通过。功能提交 `0b7bbf7`，候选 `artifacts/php-companion-alpha-0.4.5-0b7bbf7f/`；四份 VSIX 校验和及双项目确定性 WSL preflight 通过。后台 shell 的严格编辑器探针因不是 VS Code WSL 集成终端且 `code` 超时而明确失败，须在 Alpha Profile 内人工完成。证据见 [Symfony XML 服务引用导航](reports/symfony-xml-service-navigation-2026-09-21.md)。

2026-09-21 Symfony YAML 服务 ID 补全：独立容器 Provider 确认的配置 YAML 现在对精确 `@service`/`@?service` 值按当前 ID 前缀补全唯一权威服务；替换范围只覆盖 ID，保留 marker、引号和外围 YAML。补全项显示 class、来源和可见性，超过 200 项时继续按 incomplete 列表收窄。声明键、普通 YAML、转义值、表达式、参数化值、损坏 YAML 与歧义注册保持无结果；Red Hat YAML 继续拥有通用 Schema/语法补全和格式化。framework-symfony 43 项、Language Server 198 项、全仓 801 项、TypeScript、ESLint、24 个隔离消费 tarball 及 VS Code 1.138.0 开发/隔离打包双扩展宿主通过。真实 Winstar `@app.current_language_entity` 的三种输入前缀均精确定位同一 ID 范围。功能提交 `ea3aaaa`，候选 `artifacts/php-companion-alpha-0.4.5-ea3aaaa2/`；四份 VSIX 校验和及双项目确定性 WSL preflight 通过。证据见 [Symfony YAML 服务 ID 补全](reports/symfony-yaml-service-completion-2026-09-21.md)。

2026-09-20 Symfony YAML 服务 References：在独立容器 Provider 确认的配置图内，现在可从精确 `@service`/`@?service` 值或唯一权威注册位置查找全部 YAML 引用；请求包含声明时同时返回注册位置。Definition 也改用完整注册集合判定歧义，不再由注入目录去重隐藏不同注册位置。普通 YAML、声明键、转义值、表达式、参数化值、损坏 YAML 与歧义注册保持无结果。framework-symfony 43 项、Language Server 198 项、全仓 801 项、TypeScript、ESLint、24 个隔离消费 tarball 及 VS Code 1.138.0 开发/隔离打包双扩展宿主通过。真实 Winstar 39 个配置 YAML 得到 54 个精确引用、34 个唯一 ID，其中 `app.current_language_entity` 有 13 处。功能提交 `36cabd5`，候选 `artifacts/php-companion-alpha-0.4.5-36cabd56/`；四份 VSIX 校验和及双项目确定性 WSL preflight 通过。证据见 [Symfony YAML 服务引用查找](reports/symfony-yaml-service-references-2026-09-20.md)。

2026-09-20 Symfony YAML 服务引用导航：现有 YAML Definition Provider 现在对独立容器 Provider 已确认的服务配置文件识别精确 `@service`/`@?service` 标量，并跳到唯一权威静态或编译注册位置；静态配置优先于同 ID 编译快照。声明键、`@@` 转义、`@=` 表达式、参数值、损坏 YAML、非服务配置及歧义注册保持无结果。未保存的当前/目标 YAML 快照用于位置换算，通用 YAML 语法、Schema、补全和格式化仍由 Red Hat YAML 拥有。framework-symfony 43 项、Language Server 完整 198 项及全仓 801 项通过，TypeScript 与 ESLint 通过；真实 Winstar `@app.current_language_entity` 精确解析并唯一对应到同文件的实体服务注册。功能提交 `d5db8aa`，候选 `artifacts/php-companion-alpha-0.4.5-d5db8aab/`；四份 VSIX 校验和、VS Code 1.138.0 隔离打包宿主及双项目确定性 WSL preflight 通过。证据见 [Symfony YAML 服务引用导航](reports/symfony-yaml-service-definition-2026-09-20.md)。

2026-09-20 Symfony Controller 上下文触发收窄：Language Server 对打开文档和 watcher 批次先使用与独立 Provider 相同的保守 `render` 预筛选；不可能产生 Controller → Twig 上下文的普通 PHP 编辑不再启动外部进程。文件删除 `render()` 时会立即移除旧上下文，并通过逐 URI revision 阻止较早的全量或局部请求把旧结果写回。Language Server 完整 198 项、全仓 TypeScript 与 ESLint 通过。当前 WSL 日志显示此前一次 2,265 文件全索引在 71.348 秒结束，并非无终点；本修复针对索引完成后普通编辑仍反复启动 Symfony Provider 的额外负担。功能提交 `65c6d1f`，候选 `artifacts/php-companion-alpha-0.4.5-65c6d1f0/`；四份 VSIX 校验和及 Winstar PHP 8.5/CoreRepo PHP 7.2 的确定性 WSL preflight 通过。证据见 [Symfony Controller 上下文触发收窄](reports/symfony-controller-context-prefilter-2026-09-20.md)。

2026-09-20 Doctrine 项目 QueryBuilder 工厂实体泛型：原生返回 `QueryBuilder` 的项目方法在从已声明 `EntityManagerInterface`/`ObjectManager` 属性取得字面量 Entity repository，使用字面量 alias 创建 builder，并直接返回或首条语句赋给唯一未逃逸局部后原样返回时，现在保留 `QueryBuilder<TEntity>`。动态类/alias、条件初始化、重赋值、别名与未知调用逃逸、动态方法及 `select/from/delete/update` 保持 unknown。真实 Winstar 精确识别 News/Solutions 四个工厂；framework-doctrine 6 项、Language Server 197 项、全仓 TypeScript/ESLint、24 个独立 tarball、10,000 文件冷/热缓存、双真实项目各 9,999 文件审计、四份 VSIX、双项目 WSL 预检及 VS Code 1.138.0 打包宿主通过。项目事实升至 schema 5，wrapper/cache 升至 schema 10/v58。功能提交 `8f3ed0c`，候选 `artifacts/php-companion-alpha-0.4.5-8f3ed0cd/`；后台 WSL Remote CLI 的核心安装在 150 秒后无输出超时，磁盘哈希未变化，须从 Alpha Profile 集成终端安装并 Reload Window。证据见 [Doctrine 项目 QueryBuilder 工厂实体泛型验收](reports/doctrine-project-query-factories-2026-09-20.md)。

2026-09-20 泛型父类断言到具体子类收窄：真实 Winstar 中 `EntityRepository<BlogPosts>` 经 `assert($repo instanceof BlogPostsEntityRepository)` 后不再丢失具体 Repository，`createQueryBuilder()` 补全与 Definition 恢复；可证明冲突、未知继承与否定断言保持保守。semantic 274 项、Language Server 196 项、全仓 TypeScript/ESLint、双真实项目各 9,999 文件审计、四份 VSIX 与确定性 WSL 预检通过；打包宿主最终退出码 0，另有两次固定 5 秒诊断等待的时序超时已如实保留。功能提交 `108c1e9`，审计提交 `0e50a54`，候选 `artifacts/php-companion-alpha-0.4.5-0e50a54a/`。磁盘上的核心与 Symfony bundle 后续均核对为候选哈希；当前语言服务器进程启动时间早于核心安装时间，仍须 Reload Window 才能视为加载本修复。证据见 [泛型父类断言到具体子类的收窄验收](reports/asserted-generic-subclass-narrowing-2026-09-20.md)。

2026-09-20 Doctrine 自定义 Repository lookup：实体明确声明字面量 `repositoryClass` 时，`EntityManagerInterface`/`ObjectManager::getRepository(Entity::class)` 现在精确返回该自定义 Repository，直接成员链与局部赋值都可访问自定义方法；动态类参数继续使用通用泛型结果，没有映射的实体保持原 on-demand 路径。持久项目事实升级为 schema 4，wrapper/cache 升级为 schema 9/v57。TypeScript、ESLint、parser 66 项、framework-doctrine 4 项、semantic 273 项和 Language Server 196 项通过；10,000 文件冷/热为 18.326/6.237 秒，热恢复 10,000/10,000，单记录损坏只重建 1 文件。功能提交 `e54250e`，候选 `artifacts/php-companion-alpha-0.4.5-e54250ea/`；四份 VSIX、打包宿主和双项目预检通过，候选已覆盖到 WSL 并自动重启。证据见 [Doctrine 自定义 Repository lookup 验收](reports/doctrine-custom-repository-lookups-2026-09-20.md)。

2026-09-20 Doctrine 对象水合终端：默认 `Query<TEntity>::getSingleResult()` 现在返回 `TEntity`，默认 `toIterable()` 返回 `iterable<int, TEntity>`；显式 hydration 参数继续撤销外部实体返回事实。parser 为局部赋值的成员链和直接成员调用记录实参数量，semantic 因此在直接调用、复合链和局部赋值三条路径执行同一默认参数门禁。持久项目事实升级为 schema 8/v56。TypeScript、ESLint、parser 65 项、framework-doctrine 4 项、semantic 272 项、Language Server 196 项、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 确定性 WSL 预检通过；10,000 文件冷/热为 19.131/6.130 秒，热恢复 10,000/10,000，单记录损坏只重建 1 文件。功能提交 `751d457`，候选 `artifacts/php-companion-alpha-0.4.5-751d457a/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `606b2e8c919467ea3f3b9d4a54b564a8fb9f3b20fca019f3e89f51f4818c24b4`、`a00584fa248d7f8ec1354a46e3b1f7333d50bec56560ddae08b2d2c0b9095760`、`6ab948fc1fbd0ae8e1d8887932685e398f9de2744a27af10c52f02b23f5d6b2a`、`3ad8d29723e707318e803fd19e26b955a42bc98800bf048281ef53f1f62b6983`。核心与独立 Symfony 候选已原子覆盖到 WSL，bundle 哈希一致并自动重启。证据见 [Doctrine 对象水合终端验收](reports/doctrine-object-hydration-terminals-2026-09-20.md)。

2026-09-20 Doctrine 默认查询链泛型：`@php-companion/framework-doctrine` 现在把已证明的 Repository 实体类型传入 `QueryBuilder<TEntity>` 和 `Query<TEntity>`，无参数对象水合 `getResult()`/`getOneOrNullResult()` 可在赋值或直接 foreach 后继续实体成员补全；`EntityManagerInterface::getRepository(Entity::class)` 的直接成员链同步支持方法级泛型实参。`select/from/delete/update`、`getArrayResult()` 和显式 hydration 参数保持 unknown，不解析 DQL 猜测结果。持久项目事实升级为 schema 7/v55。全仓 TypeScript、ESLint 与 24 个组件共 746 项测试、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 确定性 WSL 预检通过；10,000 文件冷索引 20.602 秒、热恢复 6.327 秒，10,000/10,000 命中且损坏单记录只重建 1 文件。功能提交 `d6d9598`，候选 `artifacts/php-companion-alpha-0.4.5-d6d9598b/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `e89b91838b9cf72899a3283bdd3ed9ba96248e4cc1555889f03e6cc7fef6a4cd`、`9a9f372465bdffd2644daca55aa22b643aaa1ad639e1a4b978c7bce0fced8220`、`460c5ac4fdb25d3e31894f4c95dbc7e7b8e926be04bb1b169a5d119eebe23502`、`1930f9eeb4be4c719c8b72a8fb14e8023d9c3c2a72d0cfacdf428f63dade7c61`。核心候选 bundle 已原子覆盖到 WSL 并自动重启；Symfony bundle 原已一致。证据见 [Doctrine 默认查询链泛型验收](reports/doctrine-query-chain-generics-2026-09-20.md)。

2026-09-20 Doctrine Repository PHPDoc 泛型绑定：`@php-companion/framework-doctrine` 现在静态识别直接继承 `ServiceEntityRepository` 的精确 `@extends`、`@phpstan-extends` 或 `@psalm-extends ServiceEntityRepository<Entity>`，支持 import alias，并把已证明实体送入既有 find/findOneBy/findAll/findBy 类型链。PHPDoc 与标准构造器中的实体分歧、无关泛型基类和动态类型保持 unknown。包级正反例、Language Server 196 项、真实 stdio 索引及 `$repo->find()` 后实体成员补全、全仓 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及双项目 WSL 预检已通过。功能提交 `76c5318`，候选 `artifacts/php-companion-alpha-0.4.5-76c53183/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `2882859e396592e6621e1f225a5032ecc05286c74ecb60d62c008d004bd48c2b`、`c10d237da1637fdab30370a8f6346b23579b2b99e13eb1568bfb9c9ac033d047`、`a2ddb288465ed82f3d34f4abda1301e3881c6283ceb2a1f9f20de73bbceb1afc`、`36f027bfabef818d2386165e49b2c176d68f017da42b254a429cd4797645480a`。核心候选 bundle 已原子覆盖到 WSL 并由扩展客户端自动重启；Symfony bundle 哈希原已一致。不启动 Symfony Kernel、Doctrine ORM 或数据库。证据见 [Doctrine Repository PHPDoc 泛型绑定验收](reports/doctrine-repository-phpdoc-binding-2026-09-20.md)。

2026-09-20 索引源码校验和复用：`@php-companion/index` 现在把已计算的原始源码 SHA-256 传给消费者和缓存恢复适配器；Language Server 冷写入不再对相同源码再次 JSON 编码/哈希，热恢复仍重新校验内嵌源码及全部分层记录。持久 wrapper 升至 schema 6/v54，旧 v53/schema 5 保守重建。真实 Winstar 两次冷索引均为 46.816 秒，较上一候选 47.172 秒减少 0.356 秒（0.75%）；热恢复为 6.386/5.531 秒且均恢复 2,275/2,275。10,000 文件门禁冷/热为 18.343/6.011 秒，19,999 条 callable、3 个定向水合文件和两类单层损坏只重建 1 文件不变。index 27 项、Language Server 196 项及缓存专项测试、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及双项目预检通过。功能提交 `875ae43`，候选 `artifacts/php-companion-alpha-0.4.5-875ae43d/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `6eda8ba10c031d5dc134ea4ec038d4abcc5c54a9ad64ef637719c0c478895c7b`、`a9af0dd2d3c7d65f8c89586cf00797b9f6d94ae3c4b8f5d602600f9c33940f9d`、`2a94909121b0b9ecad12bada835ee00813a8fe314042e45546b39c98e509e79d`、`910ab64813a0ce6f347d6e1a2d4a422984c1d5c9ea7be861c2485aed4c7c8456`。核心与独立 Symfony 候选已覆盖安装到 WSL，bundle 哈希一致并自动重启。证据见[索引源码校验和复用](reports/index-source-checksum-reuse-2026-09-20.md)。

2026-09-20 索引热路径微优化：真实 Winstar 冷索引 V8 profile 中 `DocumentKeyIndex.replace()` 与 `node:path.relative()` 自耗时分别为 452.6/283.1 ms。倒排表和依赖图现复用已有 posting 容器；Composer 排除规则在执行相对路径/正则前先按严格包根边界拒绝无关作用域。真实 2,275 文件 posting 构造 30 轮平均下降 4.14%；61 个排除作用域的 30 轮平均每轮从 388.54 降至 39.65 ms，2,275 个结果全部一致。完整冷/热索引为 47.172/6.025 秒、热恢复 2,275/2,275；因冷时间与上一候选 47.171 秒相当，不宣称整体冷索引提升。project 8 项、index 27 项、Language Server 196 项、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `7932ee1`/`c91880f`，候选 `artifacts/php-companion-alpha-0.4.5-c91880f2/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `10220f3e468fca047cde3573fe5b842aec847bd39a0e7b10850dba499facfb42`、`51f7c30d93f9b8a9a8cfd429850e9996bb97473e2f6022dffff68ecefee10014`、`cc0b10ec63c5075aaea24674c86c7e5bd17b86cffa62bf4d12e7eb6925526b1f`、`8b2b69a3ecab608da5634560aa9ba03f4b04d953e6ed9aefde913a0c4e2cd2ca`。核心与独立 Symfony 候选已覆盖安装到 WSL，bundle 哈希一致并自动重启。证据见[索引热路径微优化](reports/index-hot-paths-2026-09-20.md)。

2026-09-20 持久缓存校验和去重：缓存 schema 5/v53 继续逐层验证源码、声明、文件实现、每个 callable、派生层和 Doctrine 事实，并改为对完整分层校验和清单计算 envelope SHA-256，不再第二次序列化全部语义载荷。10,000 文件冷索引从 19.188 降至 18.251 秒（-4.9%），热恢复仍为 10,000/10,000，19,999 个 callable、3 个定向水合文件和单层损坏只重建 1 文件均不变。真实 Winstar 2,275 文件两次为 46.649/44.764 秒，平均较上一提交再降 4.3%，相对最初脱离快照累计下降约 7.0%；每次均得到 2,289 个类型和 117 个抽样引用。Language Server 完整 196 项、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `597be76`，候选 `artifacts/php-companion-alpha-0.4.5-597be764/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `8e4c669ef784025e3986dece8a6dba7ed10a1543e1d50ec07ee320b266a39b05`、`44941860c9a6001a26ebbe9982e7427f02aca05f61ba5c55dadf24d3b6af16c7`、`10d58976e7c033ddda6a6b4b1a6cc2c014f9fb65b986be52d6c364f9c8d334d6`、`89dc6dc8bc15f2950b4d45e12d6db3d99de361a8ddaf0dfc1978b613d1bb1c0a`。核心与独立 Symfony 候选已覆盖安装到 WSL，语言服务器哈希一致并自动重启。证据见 [持久缓存校验和去重](reports/cache-checksum-deduplication-2026-09-20.md)。

2026-09-20 冷索引持久快照去重：公共 `snapshot()` 继续返回完全脱离对象；Language Server 缓存写入改用不可变生命周期的 `snapshotForPersistence()`，跳过每文件一次重复 JSON 序列化/解析，最终缓存仍执行完整分层 SHA-256 和统一序列化。真实 Winstar 2,275 文件反向顺序 A/B 中，两轮耗时分别从 48.349 降至 46.791 秒、从 49.936 降至 48.741 秒，平均下降 2.80%；四次均得到 2,289 个类型和 117 个抽样引用。deferred 冷驻留设想经 9,999 文件探针证明会增加 RSS 后已撤回。Semantic 271 项、Language Server 196 项、10,000 文件持久缓存精确性、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `11bd458`，候选 `artifacts/php-companion-alpha-0.4.5-11bd4582/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `5dde52d4ee7c66a9f6d5b6d5e39737f9e3d3301f478fb051722a8ebb940eb7bf`、`072c9d67c36a48424cd2bc61b4746d89931a1487f2a79ba51fd616015bae0383`、`97eb553fadde4e5b8472fcec9e8bad3c304694b33d48d1528a079f0862d6ea78`、`2ebf0407c576ce329f6897c1c48d7715513403eaba72090bb4a99405ec7f341d`。核心与独立 Symfony 候选已覆盖安装到 WSL，语言服务器哈希一致并自动重启。证据见 [冷索引持久快照去重](reports/cold-persistence-snapshot-2026-09-20.md)。

2026-09-20 依赖索引进度准确性：索引器在 Composer 依赖阶段改用项目文件与预算内依赖文件的累计总数，Language Server 把项目阶段映射到 10%–60%、依赖阶段映射到 60%–95%，阶段切换保持单调。真实 Winstar 9,999 文件只读探针中，`files > total` 事件从 7,724 降为 0；项目末值为 `2275/2275`，依赖末值从错误的 `9999/2275` 修正为 `9999/10000`。该修复只校正可观察进度，不改变索引预算、语义结果或冷启动性能。index 27 项、Language Server 196 项、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `07cb587`，候选 `artifacts/php-companion-alpha-0.4.5-07cb587e/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `6e445f764847e2523217b0f8b0a92cbf70cfd9f9b00f414110987378b7676a95`、`12c0721aed08a8b2fbd3374064854e54a3e9a40d05152bb23f175e1c7573ca9a`、`2ccb97143d7ded65cc64ae0d76028b918cc9adf0cf8cc59be146917c550f05a9`、`cb311b9994f337b8316ec99e238f6a558419b444f2d9e01b8883860402262c95`。核心与独立 Symfony 候选已覆盖安装到 WSL，语言服务器哈希一致并自动重启。证据见 [依赖索引进度准确性](reports/dependency-index-progress-2026-09-20.md)。

2026-09-20 Controller 上下文完整/局部刷新合并：完整 Symfony Controller Provider 请求运行期间若部分 PHP 文档又产生较新的局部刷新，完整结果不再整体丢弃；Language Server 按文件过滤已过期上下文，保留这些文件的较新结果，同时原子提交其余未变化 Controller 的完整刷新结果。失败或无效完整结果也只清理仍属于该请求的文件。真实 stdio 回归以两个 Controller 验证：300ms 完整刷新期间第一个文件完成 10ms 局部刷新，最终同时得到 `fast-first.html.twig` 与第二个文件的 `full-second.html.twig`。Language Server 196 项、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `d76c25f`，候选 `artifacts/php-companion-alpha-0.4.5-d76c25ff/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `0e2e9356cea2f5d70440454a673fe34797844fccb3043418b193e8e1410d5c37`、`bb1886d3ca9537fad3f0b7ab47a16d90f7c25a8d9ea299c0c5cacaec24fde6fb`、`0edc38c7d8edb862b105974559cbc68aecafefe941abe437af52c64297418d2f`、`59ac8ffd57eb064d11a7ca5b77efe60490b03d9417d62bb0d173ea23df443b1b`。核心与独立 Symfony 候选已覆盖安装到 WSL，语言服务器哈希一致并自动重启。证据见 [Controller 上下文完整/局部刷新合并](reports/controller-context-refresh-merge-2026-09-20.md)。

2026-09-20 通用语义 Provider 乱序提交防护：除独立 Symfony 权威通道外，按 Composer 根和 Provider 身份加载的第三方语义组件现在也使用单调请求版本；较慢的旧进程不能覆盖较新的方法、属性或字面量返回事实，Provider 注册更新会使全部在途旧请求失效。真实 stdio 回归通过两次 YAML 快照刷新制造 300ms 旧请求与 10ms 新请求的逆序完成，最终成员补全只包含 `methodFast`。Language Server 195 项、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `9335a83`，候选 `artifacts/php-companion-alpha-0.4.5-9335a83c/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `6d443b006feef6437ce71dae7b7cc73db44b9001c3962804bf2cacfbca1a8201`、`0007c26202ffa83b73e8b1ac27d35f34e41fc45975b50bd1fc113d64b1b23a45`、`638dafd0e0d19a95f4c83f82e85cfebafa7adfd47f39e932b974eed38cf2d0e4`、`2cd670a22d959f177b9f199ca69c0ccc16d81775daa22e8c6663c40716cf9cb3`。核心与独立 Symfony 候选已覆盖安装到 WSL，已安装语言服务器哈希与构建输出一致并自动重启。证据见 [通用语义 Provider 乱序提交防护](reports/generic-semantic-provider-ordering-2026-09-20.md)。

2026-09-20 Symfony 语义 Provider 乱序提交防护：容器、事件和 Controller/Twig 上下文的独立 Provider 请求现在携带工作区内版本票据，较慢的旧进程返回后不能再提交或清除较新的事实。Controller 上下文按 PHP 文档独立追踪，同一文件只接受最新结果，不同文件并发刷新仍可分别提交，批量请求也只跳过其中已过期的文件。新增真实 stdio 子进程回归，先启动延迟 300ms 的 `slow.html.twig` 请求，再发送 10ms 的 `fast.html.twig` 请求，旧请求最后完成后查询结果仍唯一为 `fast.html.twig`。Language Server 194 项、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `11c3f79`，候选 `artifacts/php-companion-alpha-0.4.5-11c3f798/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `b59ef528fb296560310bfdfa7b31086f715943db3195006534463d6a5e9301db`、`33a4409979e58ca0ac592a92df7d856701b6e70e443cdb0f6361f93545b9d706`、`ef81edb5d92907531f3b164c1a899a0099ef0f6930949b252eb2b0236204ff40`、`2dddc021aeeb20e81445c68cec99b55be1ce6d5e481fba4c704ea45b5dc03949`。核心与独立 Symfony 候选已覆盖安装到 WSL，已安装 bundle 哈希与构建输出一致，语言服务器已自动重启。证据见 [Symfony 语义 Provider 乱序提交防护](reports/semantic-provider-result-ordering-2026-09-20.md)。

2026-09-20 Symfony resource 服务声明刷新：PHP watcher 确认声明变化或文件删除后，现在按 Composer 根刷新一次独立容器 Provider；方法体变化保持现有服务快照，配置与多个 PHP 声明同批变化也不会重复执行。新建/编辑的打开文档使用 debounce 和未保存源码快照，delta 完成日志在新服务目录提交后发布。专项 stdio 回归把 resource 展开的 `App\\Service` 改名为 `App\\RenamedService`，Provider 计数只增加 1，Autowire service ID 补全出现新服务且旧服务消失。Language Server 193 项、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `954dfc4`，候选 `artifacts/php-companion-alpha-0.4.5-954dfc46/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `bb6bb41de29f31341ddba2993b6a61ad04ba9e67e4f6b8f9c9581e4b9c29b642`、`3882a86cb51c0c42d04c3ffae02936b132f6bce7017ffbc1a051db1f1451aabf`、`e4f3c4b6817b1bb92e485485e0f34ef960efc8688fd9cc959a469e90de4e2227`、`ac80650a35bb7b8df4fa6c91c409083bf5eb309ec7dd3b9d9188ba5070d18ad0`。核心与 Symfony 候选已安装到 WSL，运行中的语言服务器已自动切换。证据见 [Symfony resource 服务声明刷新](reports/service-resource-declaration-refresh-2026-09-20.md)。

2026-09-20 Symfony 事件关系 watcher 失效：关闭状态的 PHP 文件发生真实语义变化或删除时，现在会清除该 Composer 根的权威事件快照；下一次 listener/class References 必须重新运行独立事件 Provider，mtime-only 事件保持缓存。专项回归把关闭文件中的 `dispatch(new ReadyEvent())` 改成同长度的 `dispatch(new OtherEvent())`，类型声明范围和文件长度均不变，watcher 后旧 dispatch 引用仍被正确移除。Language Server 192 项、相关 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `4727726`，候选 `artifacts/php-companion-alpha-0.4.5-47277266/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `f824e3203de8a0f1b2a906919695cfdb8448106d89add137ce93df2adb2859db`、`b07f242c516b7c38469b15ac0db76c5ae2d580d4096e47a51e76679bd52131fd`、`dfa43665c239804363946f56aed301e93b06029d6c8c819fd199a15b820088d5`、`096c10837f50494231d0fc1300d4b406d38634ca7754d1a14e847a0dc91f7202`。核心与 Symfony 候选已安装到 WSL，运行中的语言服务器已自动切换。证据见 [Symfony 事件关系 watcher 失效](reports/event-watcher-invalidation-2026-09-20.md)。

2026-09-20 Symfony Controller 上下文批量刷新：同一 watcher 通知内变化的 PHP 文件现在按 Composer 根合并为一个有界文档快照，只启动一次独立 Controller Provider；通用 PHP/Doctrine 事实仍逐文件增量更新，Provider 成功、空结果、失败或无效输出都按文件原子替换/清理，delta 完成日志只在框架上下文提交后发布。新增 stdio 回归同时修改两个 Controller，Provider 计数只增加 1，两个更新后的 Twig 模板上下文均可查询。Language Server 192 项、全仓 TypeScript/ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `783ac2c`，候选 `artifacts/php-companion-alpha-0.4.5-783ac2c9/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `61a0241824345a8d13d2be6193f0b0279e30f03bee447e3cbb0e8e52f80e2dc3`、`ea4c49ab42304ff4373d3825258549f21d6aa178ac97527ef1ce87c64d523e9e`、`bb8196c5eb17f69235bf5c316a309ac63a3f06f22526c44e2984666af52dcc2f`、`b81736e42ad1179a064fe2696e7bdafe7099779064ae5fa507f2923a896c0271`。核心与 Symfony 候选已安装到 WSL，运行中的语言服务器已自动切换。证据见 [Symfony Controller 上下文批量刷新](reports/batched-controller-context-refresh-2026-09-20.md)。

2026-09-20 Composer 快照与 watcher 稳定性修复：Language Server 现在按工作区根共享不可变 Composer 项目快照，只有 `composer.json`/`composer.lock` 变化才失效；索引、候选扫描、namespace、声明水合、Safe Move 和增量更新不再为每个普通 PHP watcher 事件递归读取依赖图，同一 watcher 批次的 Symfony 容器刷新也按根合并。真实旧 Winstar 进程在索引结束后仍运行约 2 小时 10 分钟并达到约 95% CPU/1,375,528 KiB RSS；修复候选自动重启后只加载一次 Composer 快照，2 分 15 秒时 RSS 回落到 137,800 KiB，3 秒只消耗 0.020 CPU 秒且没有新完整索引。500 事件压力探针 2.947 秒完成、快照加载 1 次、RSS 143.6 MiB。index 26 项、Language Server 191 项、TypeScript、ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `bad3c0b`，候选 `artifacts/php-companion-alpha-0.4.5-bad3c0b9/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `e0a238621f10aa7109429717e6aa9fce1a2ba87754add5e09462727407d1c099`、`3764ddec6dcd12f81864e139817554fb64921ccabb31f6d3c0ed4cf868b79927`、`c7f6d88e0ab26afa5b898c36b1d1fb6b319ec947f9f88e374120f1154a879ea5`、`37315482b1b2fea339066f137c9962cd60de4fe5a920e085d865ddae8e774178`。核心与 Symfony 候选已安装到 WSL，运行中的语言服务器已自动切换。证据见 [Composer 快照与文件监听稳定性](reports/composer-snapshot-watcher-stability-2026-09-20.md)。

2026-09-20 References 候选摘要持久化：`@php-companion/index` 在独立 cache key 中保存有界标识符/命名参数摘要，以 size/mtime/ctime 验证未变文件，变化时读取并用 SHA-256 回退；损坏、超限或不完整摘要只会保守读取，最终结果仍由语义身份确认。Composer 目录改为确定性递归枚举，并按项目快照缓存编译后的 `exclude-from-classmap`。真实 Winstar 安装 bundle 的 `$urlGenerator` 首次/Reload 后 References 为 5.524/2.209 秒，热查询从摘要排除 2,271/2,275 个文件、解析 4 个候选，仍返回 3 个引用/3 处编辑；类声明查询配合独立 Symfony 插件为 3.305 秒并精确返回 services resource 与事件订阅两项。两类查询的全量索引日志/进度均为 0。project 7 项、index 25 项、Language Server 191 项、TypeScript、ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `3da6036`，候选 `artifacts/php-companion-alpha-0.4.5-3da60366/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `0c3bd35d0f2bc7cf59804bbb5c31377ee7ebd533140db82727543f092a67c148`、`f46a32c565c164405544d19155b727e5c080715c3510aca68fcf16cf089eb5f4`、`218aa9f9401674f239f6a5608879897b6eb4a061f6e0f450261da47d405ae6ed`、`1a8be91b220356f2866d458bee5118a2b404120c07c20d8a20970ee4e28e68a3`。核心与 Symfony 候选已安装到 WSL，Language Server 构建/安装摘要一致；须 Reload Window。证据见 [References 候选摘要持久化](reports/persistent-reference-candidates-2026-09-20.md)。

2026-09-20 private 提升属性候选扫描收窄：References/F2 先筛选构造器命名参数语法，再用精确构造器身份验证；注释分隔仍被识别。无缓存候选扫描最多并发预取 16 个源码并保持确定性语义提交顺序，完整索引和持久缓存路径不变。真实 Winstar `$urlGenerator` 首次 References 从 12.624 秒/231 个语义候选降到安装 bundle 的 5.729 秒/4 个候选，Prepare/Rename 为 27.62/22.47 ms，仍返回 3 处编辑且全量索引日志/进度为 0。安装 bundle 配合独立 Symfony 插件从 `AdminSecuritySubscriber` 类声明执行 References 用时 7.529 秒，返回 services resource 注册和事件订阅两项，全量索引日志为 0。index 22 项、Language Server 191 项、根扩展 44 项、TypeScript、ESLint、24 个隔离 tarball、四份 VSIX、VS Code 1.138.0 双扩展打包宿主及 Winstar/CoreRepo 预检通过。功能提交 `64ea40d`，候选 `artifacts/php-companion-alpha-0.4.5-64ea40de/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `88c477d00f9f4fb497722674da66229e24ced554b1b6035d55e478de36e07462`、`9b497ac83f1b19046215b1f42ea056d03825755e949e8a90cdeef5efd0192e4a`、`f5a443b5c6cf2858aedb816dbfbdbc6cf2f3647f28698503f7ede90c36921fe6`、`3ddb62bb41563d94a601847aff05da6b5ea8cd83e1ef925d1ccb3f191863c026`。候选 Language Server 已原子覆盖到 WSL 且摘要一致；须 Reload Window。证据见 [提升属性候选扫描收窄](reports/promoted-property-candidate-scan-2026-09-20.md)。

2026-09-20 封闭作用域 Rename 有界候选扫描完成：局部变量仍从当前文档立即完成；final class private 提升属性先按旧名称扫描项目候选，再计算声明、构造参数、`$this` 访问和跨文件构造器命名参数，不启动全量项目索引。签名解析锚定命名参数名称，嵌套 `new` 调用不再遮蔽外层构造器。semantic 270 项、Language Server 191 项、根扩展 44 项、TypeScript、ESLint、24 个隔离 tarball、四份 VSIX 内容门禁及 VS Code 1.138.0 双扩展打包宿主通过。功能提交 `2f971cc`，候选目录 `artifacts/php-companion-alpha-0.4.5-2f971cc3/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `f8c19104000bfb077e422c0ada0638ee1afeab6582d41beff9d7294aca90bc9f`、`0f6c5ae5657375bd15d8821f450298d06cf77bc86dd706647070cb96cc7f1e9b`、`4ce79351931f34f47c17033ba8da016c2758c6cd20d9bdb58b525e0eda4f588a`、`34fe4d21a20000ba7ec79297bd316a3a9c458dad843d4a684b4df34f4cfe98f4`。Winstar PHP 8.5/CoreRepo PHP 7.2 确定性预检通过。真实 `AdminSecuritySubscriber::$urlGenerator` 源码/安装 bundle 均返回 3 处编辑且全量索引日志/进度为 0；安装 bundle 的 References/Prepare/Rename 分别为 12.624 s/544.38 ms/502.25 ms。候选 Language Server 已原子覆盖到 WSL RockyLinux8 且摘要一致；须 Reload Window。证据见 [封闭作用域 Rename 不再启动项目索引](reports/closed-scope-rename-without-index-2026-09-20.md)。

2026-09-20 Symfony 静态路由快照缓存完成：路由 Provider 新增显式 `cacheUntilInvalidated` 契约，只有独立 Symfony 静态 Provider 选择缓存；Winstar 运行时路由与用户自定义 Provider 默认仍逐次执行。Provider/环境、磁盘 PHP/YAML、打开文档或插件文档快照变化会失效缓存，运行中的旧快照不能在失效后写回。Language Server 191 项、相关契约/扩展 8 项、24 个隔离 tarball、四份 VSIX 内容门禁及 VS Code 1.138.0 双扩展打包宿主通过。功能提交 `ff41aa0`，候选目录 `artifacts/php-companion-alpha-0.4.5-ff41aa03/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `3c847da7cedc29d2a4172bc44d5379b7e3e91eb447619e63de62a6965c0d0dd4`、`64b0921261e1dfa9332e45cc18ddc3ba6146be65a93683beea84ebc26eb304b5`、`4d1c0072ea72bc430cfac8d17fe87f4422a0c7a9192579857714dd8c689537ab`、`27d518684cef759be98f0380018ec9e498b7044efd98eb1ffd45296cd85f8b6b`。Winstar PHP 8.5/CoreRepo PHP 7.2 确定性预检通过；核心与 Symfony 候选已安装到 WSL 且构建/安装摘要一致。真实 Winstar 类 References 首次/命中/失效重建分别为 9537.65/6.26/914.47 ms，Provider 累计执行次数为 1/1/2，三次都返回 2 个引用并包含静态 YAML 来源。须 Reload Window。下一步完成独立 Symfony 扩展的人工编辑验收和 Alpha 发布门禁。证据见 [Symfony 静态路由快照缓存](reports/static-route-snapshot-cache-2026-09-20.md)。

2026-09-20 Symfony 静态路由核心回退移除完成：Language Server 不再读取或遍历 YAML、PHP Configurator、Route Attribute、Kernel 导入、Bundle 资源、环境、本地化和 glob/exclude，并移除核心 `minimatch` 依赖。恰好一个权威 Provider 才能提供静态路由；缺失、冲突、失败、超时、输入越界或输出不完整时能力明确不可用。Language Server 190 项、静态路由 Provider 2 项、Symfony 扩展 3 项、24 个隔离 tarball、四份 VSIX 内容门禁及 VS Code 1.138.0 双扩展开发宿主通过。功能提交 `b8386e8`，候选目录 `artifacts/php-companion-alpha-0.4.5-b8386e84/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `efb838b610db363d2defc9403456160515432ba5cfb1c0a0a9d18e1fb77d29e2`、`1df9e4c2f973d00a425d2099c689535090571d6608e8dbe5c07a64e5d6458e40`、`f748ec341e29e09d0d9d19e2cd21be9f53c478ad67d61837996d16868368df5b`、`8db387dbd1a4ddacb1a69e653bc7780837eb4a40354870c4627d235bb077c29f`。Winstar PHP 8.5/CoreRepo PHP 7.2 确定性预检通过；核心与 Symfony 候选已安装到 WSL 且构建/安装摘要一致。已安装静态路由 Provider 对真实 Winstar dev 返回 17 条有来源路由，用时 903.30 ms。须 Reload Window。Symfony 项目事实的核心兼容扫描至此全部移除；下一步完成独立扩展人工编辑验收和 Alpha 发布门禁。证据见 [Symfony 静态路由仅由独立 Provider 提供](reports/static-route-provider-only-2026-09-20.md)。

2026-09-20 Symfony 事件关系核心回退移除完成：Language Server 不再扫描 subscriber map、`#[AsEventListener]`、父类/Trait 监听方法或 `dispatch()` 候选；唯一完整权威 Provider 缺失、冲突、失败、超时、输入越界或输出不完整时会清空事件关系，不保留陈旧结果。核心继续验证 PHP 方法身份、可见性和 EventDispatcher 接收者。Language Server 190 项、事件 Provider 1 项、Symfony 扩展 3 项、根扩展 44 项、24 个隔离 tarball和四份 VSIX 内容门禁通过。功能提交 `747819b`，候选目录 `artifacts/php-companion-alpha-0.4.5-747819b9/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `abd7f0805699a865b119aefbe2eb3d27875b998dfce8d6cb163806564a94ff11`、`ee67bb84889c11f23b452a248890c6bfcd4e45363c8107752d1353e36a6bcadf`、`cd02aaff2e2f14ccd58bb86782e7d72cf30507974dd55129f0c611a8919e3a4e`、`f9382919398198325fd3d0b4469af7ddf754d62adc9ca17d775161878894ed12`。Winstar PHP 8.5/CoreRepo PHP 7.2 确定性预检通过；核心与 Symfony 候选已安装到 WSL 且构建/安装摘要一致。已安装事件 Provider 对真实 Winstar 返回 20 条订阅和 4 条派发候选，用时 4.024 秒。须 Reload Window。下一步移除静态路由核心兼容扫描。证据见 [Symfony 事件关系仅由独立 Provider 提供](reports/event-provider-only-2026-09-20.md)。

2026-09-20 Symfony 服务容器核心回退移除完成：Language Server 不再导入或执行 YAML/XML/PHP Configurator、Bundle 服务资源或 DebugContainer 分析，也删除核心专用 `SymfonyFactCache`。唯一完整权威 Provider 缺失、冲突、失败、输入越界或输出不完整时会清空服务目录、字面量返回和编译参数事实，服务注册、依赖注入及容器 References 明确不可用；配置变化仍只负责触发独立 Provider。24 个组件 728 项、Symfony 扩展 3 项、根扩展 44 项、24 个隔离 tarball、四份 VSIX 内容及 VS Code 1.138.0 双扩展打包宿主全部通过。功能提交 `b741af9`，候选目录 `artifacts/php-companion-alpha-0.4.5-b741af92/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `6c38025ed6bd400258bfc949e7f742c01f9533fc063f433236881625bedeb03f`、`a3a2b794fde386bda48c4977c7e99bc220835f31c39ca64d2199b0736f5ed924`、`71d534efadffb6139ed59127a389797de272be8fbd16d8675bfade6e3c8e80e3`、`06f2e77206e4caa10eb24760283907bc3f31a25e26c514c03e6e5dab50c82fb5`。Winstar PHP 8.5/CoreRepo PHP 7.2 确定性预检通过；核心与 Symfony 候选已安装到 WSL且构建/安装摘要一致。安装后的独立 Provider 对真实 Winstar 10,036 个类型返回 844 个服务、4 个字面量返回和 25 个配置 URI，用时 1.157 秒。须 Reload Window。下一步移除事件关系与静态路由核心兼容扫描。证据见 [Symfony 服务容器仅由独立 Provider 提供](reports/service-container-provider-only-2026-09-20.md)。

最后更新：2026-09-20。状态必须以源码和本页列出的验证命令为依据。

2026-09-20 Symfony Controller 核心回退移除完成：Language Server 不再导入或执行 `analyzeSymfonyControllerContexts`，项目事实缓存升级为 schema 4/v52 并只保留 Doctrine 框架事实；独立 Controller Provider 新增未落盘打开文档支持。Provider 缺失、冲突、失败或输出无效时会清除对应上下文并明确记录能力不可用，不再静默回退核心扫描。24 个组件 730 项、Symfony 扩展 3 项、根扩展 44 项、四份 VSIX 内容及 VS Code 1.138.0 双扩展打包宿主全部通过。功能提交 `5a5f52f`，候选目录 `artifacts/php-companion-alpha-0.4.5-5a5f52fc/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `d1d508addd0bd04a8144b8a2ca5232de149252fde6f9ac3c4457aecfb2b304d2`、`971989725deb57db56554975681a4482009d2dae2ec34a34497bc8c377acaed8`、`0737e136419a1cef926a8a9a36ae4a731cc0884ac4a810e6d53e9f209995741c`、`6a24ee9b1f93d9f47ecfab10697601081dfe29a91ef9cf12c09ffee02d24c7dc`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心与 Symfony 候选已安装到 WSL且运行产物摘要一致。安装后的独立 Provider 对真实 Winstar 2,279 个项目类型仍返回 11 个上下文和 9 个模板，用时 7.570 秒。须 Reload Window。下一步移除服务容器、事件关系与静态路由核心兼容扫描。证据见 [Symfony Controller 上下文仅由独立 Provider 提供](reports/controller-context-provider-only-2026-09-20.md)。

2026-09-20 独立 Symfony 默认安装接线完成：Open Source Pack 与 Recommended Pack 已显式包含 `sohophp.php-companion-symfony`，VSIX 门禁要求两套 Pack 的实际 manifest 必须包含该扩展；FrameworkBundle 项目直接安装核心但缺少 Symfony 扩展时会给出一次可操作提示，单独使用 Symfony 组件不会误提示。核心 VSIX 已停止依赖和打包 Winstar 运行时路由 Provider，该能力只由独立 Symfony 扩展拥有。24 个组件 729 项、Symfony 扩展 3 项、根扩展 44 项、四份 VSIX 内容及 VS Code 1.138.0 双扩展打包宿主全部通过。功能提交 `f7204a4`，候选目录 `artifacts/php-companion-alpha-0.4.5-f7204a45/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `af0dd1269a64e7c641fee2b1e968d04c7bde3f7f948c533025aee6adec72e8fb`、`5064e430e74d051c3387c6aef2b29f50c42300be2c9294f5b84aabb2541db248`、`89bacead44a492b06d5f008f1148477d5226c2797fa88dc081414a146195798f`、`c4ba7876ebf4f649eec2175b913363625e0e0268f5627b84c4900ad12a9ddd75`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心与 Symfony 候选已安装到 WSL，全部保留 bundle/WASM 摘要一致且核心安装目录无 Winstar Provider。须 Reload Window。下一步移除 Language Server 内其余 Symfony 静态兼容扫描。证据见 [独立 Symfony 扩展默认安装](reports/standalone-symfony-default-install-2026-09-20.md)。

2026-09-20 独立 Symfony 生命周期门禁完成：plugin API v1 registration 新增可选原子 `update()`，完整新贡献先校验和快照，再一次替换活动 Provider 集；无效身份/描述符保留旧集，释放后更新被拒绝，重复释放幂等。Symfony 配置切换在新核心上不再先撤销全部 Provider；旧 v1 核心继续使用撤销/重注册兼容路径，API 版本不兼容仍在任何注册前拒绝。24 个组件 729 项、Symfony 扩展 3 项、根扩展 44 项、24 个隔离 tarball、四份 VSIX 内容及 VS Code 1.138.0 双扩展打包宿主全部通过；真实 Extension Host 直接覆盖 update、无效 identity、重复 dispose 和 dispose 后 update 拒绝。功能提交 `9339f35`，候选目录 `artifacts/php-companion-alpha-0.4.5-9339f353/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `871b01fe67a7b803ad43024642f2821ab4e37e1f9c90e19ba802beddc5c5da57`、`38ddf13e82a9df00c5e73f0d956d7e21beda8ad7309d4337123452af75015327`、`57ca64542fe9d901fcc768c51c7e66be7486d7b89a4224827ed68e43a3b7b275`、`366fc14e2a52eeedde779d575b463bc131112fecd062e2df95f5a53d6a1d67be`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心与 Symfony 候选已安装到 WSL，全部 bundle/WASM 摘要一致。须 Reload Window。下一步移除核心 Symfony 兼容扫描并验证缺失扩展提示。证据见 [独立 Symfony 扩展生命周期门禁](reports/standalone-symfony-lifecycle-2026-09-20.md)。

2026-09-20 独立 Symfony Controller 上下文迁移：新增可独立发布的 `@php-companion/provider-symfony-controller-contexts`，由 Symfony VSIX 注册为权威 Controller → Twig 上下文 Provider；静态读取有界项目 PHP 源码和打开文档快照，返回字面量 `$this->render()` 模板、变量类型与来源位置，不启动 Kernel、不执行项目 PHP，也不实现 Twig 语言能力。核心按来源 URI 和源码范围验证贡献，打开文档只刷新对应文件；新建未索引文件、Provider 失败、超时或结果无效时回退既有精确分析。语言服务器崩溃恢复后改为并发刷新已打开文档诊断，真实 Extension Host 无需放宽 5 秒诊断门禁。24 个组件 729 项、Symfony 扩展 2 项、根扩展 44 项、24 个隔离 tarball、四份 VSIX 内容及 VS Code 1.138.0 双扩展打包宿主全部通过。功能提交 `17faf4d`，候选目录 `artifacts/php-companion-alpha-0.4.5-17faf4d3/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `b61c2b67d7fd1fd6099a2e108e6d9b8193d504fc79298e4bc13e252862ac0aad`、`c38300ebf9d450b6fc7f975a46f143cad2e1c8b33f90fed62e31e69d6e1f4463`、`7f79a251c0cfec1cd56230f3780431b39224bbc36bba4890a61e341a43c76e6f`、`ad6b04f5ef7a0a638899750d147289c198c78885d96d7ede12f000201eb3f743`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心与 Symfony 候选已安装到 WSL，全部 bundle/WASM 摘要一致。已安装 Provider 对真实 Winstar 的 2,265 个文件、2,279 个类型返回 11 个上下文和 9 个模板，用时 6.794 秒。须 Reload Window。下一步完成独立扩展生命周期/版本不兼容门禁，再移除核心 Symfony 兼容回退。证据见 [独立 Symfony Controller 上下文迁移](reports/standalone-symfony-controller-contexts-2026-09-20.md)。

2026-09-20 独立 Symfony 事件关系迁移：新增可独立发布的 `@php-companion/provider-symfony-events`，由 Symfony VSIX 注册为权威事件 Provider；输入有界项目源码、有效公开方法/继承目录和已确定服务目录，输出 subscriber、`AsEventListener`、继承/Trait 监听关系及 `dispatch()` 候选。核心保留通用 PHP 方法身份和 EventDispatcher 接收者校验，失败时回退。真实 Winstar 初版重复语义分析为 64.852 秒，最终复用核心目录后源码/安装 bundle 分别为 3.008/3.947 秒，均返回 20 条订阅和 4 条派发候选。23 个组件 725 项、Symfony 扩展 2 项、根扩展 44 项、23 个隔离 tarball、四份 VSIX 内容及 VS Code 1.138.0 双扩展打包宿主全部通过。功能提交 `ca600a6`，候选目录 `artifacts/php-companion-alpha-0.4.5-ca600a63/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `f74a26d7b70077e421a47f7699e0e3ef519249bd4945548edc3cfcff09c0d382`、`7d8961e317472449ff5d137e2a6f43a6ddfd8063aedb83fc3342e27218dadb9b`、`ae8c25be6fbbf3f9cddf127740488daa7e03990f3dc9b0588311bee4e7f459fd`、`3e95029fa24b2dcd2328ca07167a780991b6c297a1baa3b1d4e890fd2114927e`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心与 Symfony 候选已安装到 WSL，全部 bundle/WASM 摘要一致。须 Reload Window。下一步迁移 Controller/Twig 上下文编排。证据见 [独立 Symfony 事件关系迁移](reports/standalone-symfony-events-2026-09-20.md)。

2026-09-20 独立 Symfony 服务容器迁移：新增可独立发布的 `@php-companion/provider-symfony-services`，由 `sohophp.php-companion-symfony` 打包并始终注册；静态读取 YAML/XML/PHP Configurator、确定性导入、Bundle 资源及新鲜 DebugContainer XML，不启动 Kernel、项目 PHP或项目 autoloader。semantic-provider 新增有界项目类型目录、PHP/YAML/XML 打开快照及完整服务容器事实；权威 Provider 成功时核心不重复扫描，失败、超时、协议错误、输入越界或快照不完整时回退。22 个组件 723 项、Symfony 扩展 2 项、根扩展 44 项、22 个隔离 tarball、四份 VSIX 内容及 VS Code 1.138.0 双扩展打包宿主全部通过。真实 Winstar 建立 10,036 个项目类型并返回 844 个服务、4 个字面量返回和 25 个配置 URI；当前 DebugContainer 陈旧而被正确拒绝。功能提交 `004fbcf`，候选目录 `artifacts/php-companion-alpha-0.4.5-004fbcf3/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `510c379791025bfb99c67f0006535a33163f5548c8de8b6966c37965e082ad65`、`79f344d8955c84e8cc1893106ee9032391212ba484e3c64d3ec21137e1f99929`、`f7c6df1d76e88987333b9ea14b7034e3c64cecf28f01f6046f4d96f2420791e5`、`9b6a8508df7614ffcca9bc3395676273e7cb5727724262a205a3b8c6b44347c8`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心与 Symfony 候选已安装到 WSL，全部 bundle/WASM 摘要一致，已安装 Provider 再次返回相同事实。须 Reload Window。下一步迁移事件关系。证据见 [独立 Symfony 服务容器迁移](reports/standalone-symfony-services-2026-09-20.md)。

2026-09-20 独立 Symfony 静态路由迁移：新增可独立发布的 `@php-companion/provider-symfony-routes`，由 `sohophp.php-companion-symfony` 打包并始终注册；覆盖 YAML/PHP Configurator/Attribute、Kernel、Bundle、环境、本地化和 glob/exclude，且不启动项目 PHP。route-provider 请求新增最多 128 份、单份 1,000,000 字符、合计 8 Mi 字符的 PHP/YAML 打开文档快照；权威 Provider 成功时核心不重复扫描，失败、超时、协议错误或快照越界时回退。21 个组件 717 项、Symfony 扩展 2 项、根扩展 44 项、21 个隔离 tarball、四份 VSIX 内容及 VS Code 1.138.0 双扩展打包宿主全部通过；宿主实际返回 `profile_user` 路由补全。真实 Winstar dev 静态 Provider 返回 17 条有来源路由，运行时 Provider 的 362 条动态路由保持独立。功能提交 `e4f3ff1`，候选目录 `artifacts/php-companion-alpha-0.4.5-e4f3ff1c/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `afc7fefc5b7d40d071ab3947e43d33bf9375040c863fe7aa768c3957fff42561`、`848ba92e884ecd9750ec1ce207185acd757e6f8be5fe610d856b936ebe167213`、`6b94180cad07c9728b98fcdd7a4ea4dfa49e28759d5afbe3ac36371d86e6c920`、`ecda18d4ab2a47a0053977798b267dfb3d8ba29801462a6a579dfddd41346e33`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心与 Symfony 候选已安装到 WSL，安装 bundle 摘要一致并再次返回 17 条静态路由。须 Reload Window。下一步迁移服务/注入。证据见 [独立 Symfony 静态路由迁移](reports/standalone-symfony-static-routes-2026-09-20.md)。

2026-09-20 独立 Symfony 扩展首项迁移：新增可单独安装的 `sohophp.php-companion-symfony` VSIX，显式依赖核心并协商 plugin API v1；可选 Winstar 运行时路由 provider 现由独立扩展注册/撤销，核心检测到该扩展后关闭内置副本，未安装时保留 Alpha 回退。候选 schema 升至 2 并携带核心、Symfony 和两个 Pack 四份 VSIX；预检仍兼容历史三产物 schema 1。独立 VSIX bundle 对真实 Winstar dev Router 返回完整 362 条路由。全仓 TypeScript/ESLint、20 个组件 715 项、Symfony 扩展 2 项、根扩展 43 项、20 个隔离 tarball、四份 VSIX 内容及 VS Code 1.138.0 核心+Symfony 打包 Extension Host 均通过。功能提交 `8dbf60e`，候选目录 `artifacts/php-companion-alpha-0.4.5-8dbf60eb/`；核心、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `9495a1066a52a0a9255a15006352e7adcb2f7645c70113f301de4c26053efd0f`、`6da6b9102546a6739c90b488a6de00d742072323e071252bbb2e002cb31d06b9`、`efc5f16e9b7b764e0878e444ad5d3607481618070c3096a195940c1de68a7350`、`6350eaa3f05fbb6678509fa11416b00cd1834d7fe3ced0225834f2d37d68d36d`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心与 Symfony 候选均已安装到 WSL RockyLinux8，安装 bundle 哈希一致，已安装 Symfony provider 再次返回 362 条路由。须 Reload Window。其余服务/注入、事件、静态路由和 Controller 上下文仍待迁移。证据见 [独立 Symfony 扩展首项迁移](reports/standalone-symfony-extension-2026-09-20.md)。

2026-09-20 Symfony 独立插件运行边界增量：新增可独立发布的 `@php-companion/plugin-api` schema 1，核心扩展激活后返回版本化 API；独立 VSIX 可注册和撤销命名空间隔离的 semantic/route provider，核心校验身份、命令、参数、超时和输出预算后同步 Language Server。动态撤销会串行清除外部事实、协调剩余 provider 并刷新开放文档；插件不能访问 Language Client 或发送任意通知。TypeScript/ESLint、20 个组件 715 项、根扩展 41 项、20 个隔离 tarball、三份 VSIX 内容及 VS Code 1.138.0 打包 Extension Host 均通过。功能提交 `23e1a42`，候选目录 `artifacts/php-companion-alpha-0.4.5-23e1a42a/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `ec2016b09206979c5e5906ee92084ecb9e77bcb01a900d2045409ca0579bebcb`、`c96c632fe0be34974ea258d49616637407d19249cd8da4ead2a60f28334692fc`、`2aa2c1b47cf19028d0361c002162f97961cbf0740cf4b993f7de59086a8a84c4`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心已安装到 WSL RockyLinux8，安装 bundle 哈希与构建输出一致。须 Reload Window。现有 `framework-symfony` 仍暂随核心组装，下一步建立独立 Symfony VSIX 并按 route、服务/注入、事件、Controller 上下文顺序迁移。证据见 [Symfony 独立插件运行边界](reports/symfony-plugin-runtime-boundary-2026-09-20.md)。

2026-09-20 Doctrine EntityManager 泛型补全增量：semantic 把真实方法上的 Callable 模板与魔术方法统一进入 `class-string<T>` 实参推断，直接方法调用赋值保留专门化泛型返回；`@phpstan-return ?T` 只有在模板 bound 精确覆盖原生 nullable 非空分支时才可收窄。Language Server 在成员补全为空且上下文确定时，最多递进四层加载当前文档或上一步结果指向的精确 Composer PSR-4 owner，不进行依赖目录扫描。全仓 TypeScript/ESLint、19 个组件 712 项、根扩展 39 项、19 个隔离 tarball、三份 VSIX 内容及 VS Code 1.138.0 打包 Extension Host 均通过。真实 Winstar 源码在不预先请求 Definition 的条件下，冷/热 stdio 为 56.358/12.982 秒，均返回 9 个 Controller context，并把 `EntityManagerInterface::getRepository(Language::class)->find()` 推导为 `?Language`、补全 `getCode`；动态类字符串返回 0 个实体成员。功能提交 `1be85dd`，候选目录 `artifacts/php-companion-alpha-0.4.5-1be85dd9/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `37dc935855f5cb86b61ba815c02719ca7f06335cf3070c2c65240ce169058283`、`7d9676c23f0d7fe9807fe6a03ba251751bd488b52b7ecc4313d3f12031320ede`、`f9d681bb6923c97921969d640c5b28b969a158db9bbc5f55dd97dea002ecae17`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心已安装到 WSL RockyLinux8，安装的 Language Server/扩展入口哈希与构建输出一致。已安装 bundle 冷/热为 56.443/13.046 秒，继续返回同一精确结果。须 Reload Window。证据见 [Doctrine EntityManager 泛型按需补全](reports/doctrine-entity-manager-generic-completion-2026-09-20.md)。

2026-09-20 Doctrine `repositoryClass` 增量：framework-doctrine 从实体的字面量 `#[ORM\Entity(repositoryClass: Repository::class)]` 建立 Repository→Entity 精确绑定，因此继承普通 `Doctrine\ORM\EntityRepository`、且没有标准 `ServiceEntityRepository` 构造器的自定义 Repository，也可让 `find`/`findOneBy` 返回 `Entity|null`，让 `findAll`/`findBy` 返回 `array<int, Entity>`。动态或冲突绑定及自定义查询仍保持 unknown；Language Server 持久项目事实缓存升级为 v51，拒绝沿用缺失该关系的旧快照。全仓 TypeScript/ESLint、framework-doctrine 3 项、semantic 268 项、Language Server 187 项、testkit 5 项、根扩展 39 项、19 个隔离组件 tarball 及 VS Code 1.138.0 打包 Extension Host 均通过。真实 Winstar 静态扫描精确取得 7 组映射，源码冷/热 stdio 探针为 63.543/13.425 秒，并确认 `LanguageRepository::find(): Language|null` 与 `Language::getCode()` 补全。功能提交 `d9b49bb`，候选目录 `artifacts/php-companion-alpha-0.4.5-d9b49bbe/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `0c57176b650f87088b886ce5af86ca26b5f548fae5174a4f34b9b64e600588c1`、`02c31b8ef64f624c371f61ee7aab0f5e2b56a313d0068c63f5aebb280f5eed11`、`a6399f898d44b0aba29d3c80583b1432e5ac5aaa7bdebbe52d49dd8d0e086ebd`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心已安装到 WSL RockyLinux8，安装的 Language Server/扩展入口哈希与构建输出一致。已安装 bundle 连续两次热恢复为 12.328/12.903 秒，均返回 9 个 Controller context、精确 `Language|null` 和 `getCode`。须 Reload Window。证据见 [Doctrine repositoryClass 实体绑定](reports/doctrine-repository-class-binding-2026-09-20.md)。

2026-09-20 声明优先缓存恢复增量：语义缓存恢复不再为了随后延迟的方法体而先合并、重排、重建并序列化全部实现事实；专用门禁仍验证 schema/URI、声明数组、方法记录身份与源码范围、每项事实所属方法及规范顺序、控制流位置唯一性，以及引用候选和类型依赖的重新推导结果。损坏 scope、越界控制流、事实错层、重复方法记录、错误依赖和陈旧引用候选均有反例。semantic 268 项、Language Server 187 项、testkit 5 项、根扩展 39 项、全仓 TypeScript/ESLint、19 个隔离组件 tarball及 VS Code 1.138.0 打包 Extension Host 均通过。真实 Winstar 2265 文件缓存中实现记录约 86.35 MiB、声明约 14.07 MiB；同一未变缓存连续两次源码热恢复为 12.901/13.331 秒，较前一源码基线 14.535 秒减少 8.3%–11.2%。功能提交 `a5b17e0`，候选目录 `artifacts/php-companion-alpha-0.4.5-a5b17e04/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `d6ddecea91c334968acb67905a7fe8bf6333daf3de2f741724774b2b994cd0ee`、`c86becb4153c060b6a3d64c514d925d86a556d286c215d03390567233266e574`、`3c96cda7d2b5f9d7f2900cf1472ca1e6836943d050132852004decb2d4de9af5`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心已安装到 WSL RockyLinux8，安装的 Language Server/扩展入口哈希与构建输出一致。已安装 bundle 连续两次热恢复为 13.589/13.127 秒，较前一已安装候选 14.609 秒减少 7.0%–10.1%；两次均返回 9 个 Controller context，4 个 YAML Definition 唯一命中。须 Reload Window。证据见 [声明优先缓存恢复](reports/declaration-first-cache-restore-2026-09-20.md)。

2026-09-20 项目索引缓存快速恢复增量：缓存项新增 ctime，size/mtime/ctime 全部未变时直接恢复 payload，跳过源码读取和 SHA-256；路径集合及全部缓存项未变时不再重写相同缓存。任一元数据变化仍走内容哈希，旧缓存自动升级，同大小且恢复 mtime 的替换仍由 ctime 失效。index 21 项、Language Server 187 项、全仓 TypeScript 与 ESLint、19 个隔离组件 tarball 及 VS Code 1.138.0 打包 Extension Host 均通过；真实 Winstar 2265 个 PHP 文件、约 123 MiB 语义缓存的源码构建同机热恢复由 18.112 秒降至 14.535 秒（减少 19.8%）。功能提交 `9bff193`，候选目录 `artifacts/php-companion-alpha-0.4.5-9bff193e/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `1c258ced2ce146b8d852cdc27a0e2050f3b2995fa13ec68ef0038769564e3408`、`4de36c2f36f35c27114942af17e066c0f89c97966e7375787de9a9701b90f107`、`3ae2d085557bc162be8bdc5bb47546e95f231b5980fdd98b91a987fe4b76a334`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心已安装到 WSL RockyLinux8，安装的 Language Server/扩展入口哈希与构建输出一致。已安装 bundle 使用全新缓存实测冷/热项目扫描 59.146/14.609 秒，两次均返回 9 个 Controller context，4 个 YAML 控制器 Definition 均唯一命中。须 Reload Window。证据见 [项目索引缓存快速恢复](reports/index-cache-fast-restore-2026-09-20.md)。

2026-09-20 Symfony YAML 控制器 Definition 增量：VS Code 为 YAML 追加窄 Definition Provider，将带 `path` 路由 map 中字面量 `controller` / `defaults._controller` 的类段和方法段导航到唯一 Composer PHP 声明；方法还须为该控制器的有效公开实例方法。YAML 语法、Schema、补全和格式化继续由 Red Hat YAML 拥有，服务 ID、动态/转义值、普通同名键和外部 Symfony runtime 所有权保持无 Companion 结果。framework-symfony 42 项、Language Server 187 项、全仓 TypeScript 与 ESLint、VS Code 1.138.0 打包 Extension Host 均通过；同时修复默认 `onDemand` 的 Twig interop 未启动项目扫描而持续返回 `null` 的索引门禁。`pnpm test` 全仓门禁、19 个隔离组件 tarball 和三份 VSIX 内容验证通过；真实 Winstar 标准与 sequence 路由共 4 个类/方法 Definition 查询均唯一命中。功能提交 `602be7e`，候选目录 `artifacts/php-companion-alpha-0.4.5-602be7ef/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `a7a0a66ffff0ea661495b9795b7d1c61f532eec6ee0d2e1bd1225aa5ca8e0f9a`、`a4eb4acde5176e1ce5d192f868520f4b8b17751fa94a78d98011d263c76e3675`、`b66e4968f829d91209bdb85c432eabadff9021b3162a43ef48ebd31ce1aaacb3`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心已安装到 WSL RockyLinux8，已安装 bundle 哈希与构建输出一致，4 个真实 Definition 查询全部唯一命中，`onDemand` 无缓存冷扫描 54.428 秒后返回 9 个 Controller context。须 Reload Window。证据见 [Symfony YAML 控制器 Definition](reports/symfony-yaml-controller-definition-2026-09-20.md)。

2026-09-19 Symfony 路由控制器 References 增量：静态 YAML `controller` / `defaults._controller` 与显式启用的 route provider 现在可携带精确控制器类/方法关系；PHP 类按 FQCN 合并引用，方法还须解析为该类的有效公开实例方法。服务 ID、转义或动态标量、生成路由和无直接源码位置的关系保持 unknown，外部 Symfony runtime provider 的能力所有权不变。route-provider 3 项、framework-symfony 41 项、Winstar provider 3 项、Language Server 186 项、全仓 TypeScript 与 ESLint、19 个隔离 tarball 和三份 VSIX 内容验证通过；Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过。功能提交 `0db9711`，候选目录 `artifacts/php-companion-alpha-0.4.5-0db97115/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `6c61ea4ce66f2b076f2f5daa661ae7750a8f33845820fb7fb8aefaa28ac5885d`、`bd4f36e5949b71090a72b24ebc99f83ceebb37e4eb47075f0191287b3a65d45b`、`425ceeb162307b8de1123606a177f7da1350af40a419cc321325faf3cf801286`。核心已安装到 WSL RockyLinux8，已安装 bundle 实测标准 `HealthController::live` 与 Winstar 模块 `RegionController::countriesAndProvinces` 的类/方法 References 精确落到 YAML；路由参数、本地化 YAML 和环境筛选回归通过。须 Reload Window。证据见 [Symfony 路由控制器 References](reports/symfony-route-controller-references-2026-09-19.md)。

2026-09-19 Symfony YAML 本地化路由增量：framework-symfony 按 Symfony 7.4 loader 规则把字面量 route `path` map 展开为 `name.locale`，并输出 YAML import `prefix` map；Language Server 组合嵌套 string/map 前缀，普通子路由按 locale 克隆，已本地化子路由只匹配同名 locale。动态/参数化/非字符串结构及无法对应的嵌套 locale 保持 unknown。framework-symfony 40 项、Language Server 186 项、全仓 TypeScript 与 ESLint、19 个隔离 tarball 和三份 VSIX 内容验证通过；Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过。功能提交 `b55cb35`，候选目录 `artifacts/php-companion-alpha-0.4.5-b55cb35a/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `5ad2074ab9bed521ad9ee2e9e9b85fd89250f43fb18d30f28555e37865192f66`、`2255973354d935ff6486da1ae475c37f512a38909ab366f20767dd540ded24ba`、`607e7f3bc452d5a26a3feec276e5bb8786d50e8e1066ddfc7a8238b3ea1388b0`。核心已安装到 WSL RockyLinux8，已安装语言服务器哈希与构建输出一致；隔离 stdio 返回直接 `localized.page.en/fr`、导入克隆 `imported_page.de/en/fr` 和同 locale 匹配 `imported_child.en/fr`，Attribute、环境和 Winstar 路由参数探针继续通过。须 Reload Window。证据见 [Symfony YAML 本地化路由](reports/symfony-localized-yaml-routes-2026-09-19.md)。

2026-09-19 Symfony 本地化 Route Attribute 增量：framework-symfony 按 Symfony 7.4 `AttributeClassLoader` 规则把字面量 locale→path map 展开为 `name.locale`，覆盖类 map + 方法字符串、类字符串 + 方法 map、键完全对应的双 map 及 invokable 类；动态/重复键值、locale 集合不对应和 alias 保持 unknown。展开事实直接进入既有补全、Definition、References 和参数补全图。framework-symfony 40 项、Language Server 186 项、全仓 TypeScript 与 ESLint、19 个隔离 tarball 和三份 VSIX 内容验证通过；Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过。功能提交 `5c57b84`，候选目录 `artifacts/php-companion-alpha-0.4.5-5c57b84d/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `7b332981729a10a1c712939dc12959daeab64e30e741b475737e6e87938efe57`、`88ee601810964824ff6eceb90fdcec7c04e99b362c23e98a52aa907cf4293832`、`2b0de513d4ebb0393c046b963b18cb3eaebec19357c416623872373744964126`。核心已安装到 WSL RockyLinux8，已安装语言服务器哈希与构建输出一致；隔离 stdio 返回 `admin.localized.en`/`.fr` 及 `/english`/`/francais`，YAML 环境和 Winstar 路由参数探针继续通过。须 Reload Window。证据见 [Symfony 本地化 Route Attribute](reports/symfony-localized-attribute-routes-2026-09-19.md)。

2026-09-19 Symfony YAML 路由环境增量：framework-symfony 按 Symfony 7.4 `YamlFileLoader` 语义只展开与显式环境精确相等的顶层 `when@env` map，保留块外 route/import、内层真实范围和同文件后置直接路由覆盖；无环境或其它环境块在验证前跳过，选中块异常保持 incomplete。Language Server 将 resource scope 环境传入全部 YAML 路由分析。framework-symfony 39 项、Language Server 186 项、全仓 TypeScript 与 ESLint、19 个隔离 tarball 和三份 VSIX 内容验证通过；Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过。功能提交 `2c56b7a`，候选目录 `artifacts/php-companion-alpha-0.4.5-2c56b7ac/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `ea223125b61b2d06436cea48838942598915267f9cbecd3beeaf684e564ab7c1`、`1e447135b10027ce9cc0db674a20fd9b66f8882669097ef2a41f6043f8a8ab99`、`2d451f7f4fb90ed213b9195978a31b5b6ca0d58916affcb27911c198025f891c`。核心已安装到 WSL RockyLinux8，已安装语言服务器哈希与构建输出一致；隔离 stdio 探针证明 `conditional.page` 在 none/dev/prod 分别缺席/出现/缺席，Route Attribute 环境和 Winstar 路由参数探针也继续通过。须 Reload Window。证据见 [Symfony YAML 路由环境块](reports/symfony-yaml-route-environments-2026-09-19.md)。

2026-09-19 Symfony Route Attribute 环境增量：framework-symfony 按 Symfony 7.4 `AttributeClassLoader` 语义解析类级和方法级 `env` 字面量字符串/字符串数组；类级先筛选整个 Controller，方法级再筛选单条声明，排除项不消耗未命名路由序号。Language Server 将 resource scope `phpCompanion.symfony.environment` 传入 Attribute 图；默认空值只保留无环境限制路由，动态表达式和结构不明数组保持 unknown。framework-symfony 38 项、Language Server 186 项、全仓 TypeScript 与 ESLint、19 个隔离 tarball 和三份 VSIX 内容验证通过；Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过。功能提交 `6f18f29`，候选目录 `artifacts/php-companion-alpha-0.4.5-6f18f29c/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `d027349d2e777a1ec1743df3984ee0614aedf89f0a9bd084e68f6d92e0ff5472`、`74b30383b5834eeb1647617c8d48afb5c5f006cc07c21a01d33d57348ad2e2e0`、`89c38ef306d50224467beb284dfbac628adfbd66fae21110c2bf163a60bd649b`。Remote CLI 未更新现有目录后，候选语言服务器已原子覆盖到 WSL RockyLinux8，并核对哈希；已安装 bundle 的隔离 stdio 探针证明 none/dev/prod 分别为缺席/出现/缺席，同时 Winstar `admin.CompanyPage.edit` 参数补全仍只返回 `id`。须 Reload Window。证据见 [Symfony Route Attribute 环境筛选](reports/symfony-route-attribute-environments-2026-09-19.md)。

2026-09-19 Symfony 路由参数补全增量：在调用唯一解析到 `AbstractController::generateUrl()` / `redirectToRoute()`、`UrlGeneratorInterface::generate()` 或 `RouterInterface::generate()`，并能证明路由名、参数形参和直接数组结构时，从唯一最终路径提取 `{identifier}` 参数名。位置参数及重排后的命名参数均支持，已有键会排除；动态名称/键、unpack、歧义路由、外部 runtime 所有权和同名业务 API 保持 unknown。framework-symfony 37 项、Language Server 186 项、全仓 TypeScript 与 ESLint、19 个隔离 tarball 和三份 VSIX 内容验证通过；Winstar PHP 8.5 与 CoreRepo PHP 7.2 的 WSL 预检通过。功能提交 `ca8ed34`，候选目录 `artifacts/php-companion-alpha-0.4.5-ca8ed34d/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `fa4e6efa6392a8c49b05144a71e1560b035ce63a533940040369c80b88bd36e2`、`92c7d00249fb39bd1d73d7200ecc36074aa81a72bcbf39f7a8c8c621cde09612`、`9e8fcf358b6d4ff92159aeea8e602ee6d1ccf8fca14aee28dcbe528e94b607b1`。核心已安装到 WSL RockyLinux8；已安装语言服务器与 Winstar Provider 的哈希均与构建输出一致，真实 `admin.CompanyPage.edit` stdio 探针只返回 `id`。须 Reload Window 后由编辑器加载。证据见 [Symfony 路由路径参数补全](reports/symfony-route-parameter-completion-2026-09-19.md)。

2026-09-19 Winstar 运行时模块路由增量：新增可独立发布并随核心 VSIX 打包的 `@php-companion/provider-winstar-routes`；`phpCompanion.symfony.winstarRoutes.enabled` 默认关闭，显式开启后执行项目 PHP 包装器与 Symfony `debug:router`，用真实启用集合过滤模块 YAML，再把直接路由及 `admin_defaults` 生成路由映射到唯一名称范围。重复可能来源、损坏 YAML、无模块来源和标准 Symfony 路由不发布。真实 Winstar dev Router 704 条中保守发布 362 条模块路由；onDemand stdio 探针返回 `admin.log…` 的 6 个实际候选，`admin.login` Definition 精确到 `admin_Login.yaml` 第 2 行。适配器 3 项、Language Server 186 项、扩展 manifest 3 项、TypeScript、ESLint、19 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `1ac2be2`，候选目录 `artifacts/php-companion-alpha-0.4.5-1ac2be20/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `f4bff40a1df72645860aaf5692edc779822b3a72e6728f6e82ba7449315567aa`、`ce687348ac748749d971ee5a203f6cc2c0907062c062159389e2d4c83eb064a2`、`9ba21a6b566df2bb94cd027d47e3b989d8aa99c6f6ad882f1f189ddc73a57ab4`。Winstar PHP 8.5/CoreRepo PHP 7.2 预检通过；核心已安装，且已安装 provider 经 WSL Extension Host Node 实跑返回相同 362 条。须 Reload Window 后启用设置。证据见 [Winstar 运行时模块路由 Provider](reports/winstar-runtime-route-provider-2026-09-19.md)。

2026-09-19 动态路由 Provider 契约增量：新增可独立发布的 `@php-companion/route-provider` schema 1 与 `@php-companion/route-provider-host`，只执行 `phpCompanion.routeProviders` 显式配置的可信命令。每次路由查询使用新 generation 和一次性无 shell 子进程；完整、身份匹配且有声明来源的事实才与静态 Symfony 图合并，同名歧义整体拒绝，失败不会留下旧动态快照。外部 Symfony runtime provider 拥有工作区能力时不会启动自定义 provider。契约 3 项、宿主 2 项、Language Server 186 项、全仓组件测试/TypeScript/ESLint、18 个隔离 tarball 和三份 VSIX 内容验证通过；stdio 证明补全、Definition 范围和 provider 输入变更后立即刷新。功能提交 `7ed5bba`，候选目录 `artifacts/php-companion-alpha-0.4.5-7ed5bbac/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `b44848c8b5e2cee64433c7cbc1d2541b751b87f19e56870d39cfea8b37d40823`、`07cd3ed271b0eb766e9dba1224401c63bebccdb7ee71b449f9eec94824f099bd`、`76c08dc28f9f27a94e52da1a3b5b22107f1e02c3cb71dc0b3048a76f4f4d65ee`。Winstar PHP 8.5/CoreRepo PHP 7.2 确定性预检通过；核心已安装到 WSL RockyLinux8，Reload Window 后加载。下一步实现 Winstar `ModuleRouteLoader` 适配器。证据见 [动态路由 Provider 契约](reports/dynamic-route-provider-contract-2026-09-19.md)。

2026-09-19 Symfony 路由导航增量：PHP 直接路由字面量在调用唯一解析到受支持 Symfony 方法、参数身份正确且静态路由名唯一时，可 Definition 到 YAML、Attribute 或 PHP Configurator 声明；References 只扫描包含完整名称的项目 PHP 候选并逐个复核语义，可选附加声明。索引不完整会明确失败，同名业务 API、普通字符串、动态名称、重复声明和外部 runtime provider 均不产生 Companion 结果。Language Server 185 项、TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过；Winstar `health_live` 真实 stdio Definition 精确到 `config/symfony/routes.yaml` 第 1 行，References 只返回合法调用与声明；Winstar PHP 8.5/CoreRepo PHP 7.2 确定性预检通过。功能提交 `bbdeb21`，候选目录 `artifacts/php-companion-alpha-0.4.5-bbdeb212/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `dc3f20b06bbf1450ad611657a30aff344b6e1c947ff702a2df061e91a460b745`、`411ff8b912f917e70aac02f1a0612c420c4544cfb87069d2f80c968847503b02`、`98054c0c17c347008365f0c98369b7e14d3ea64abc4b3a8fcc1aadd1de1d685e`。核心 VSIX 已通过 Remote CLI 完整安装到 WSL RockyLinux8，已安装 adapter/server 分别以 `f3195f639ab9f0d1f801c151468099acac0e69185e5c70fa1e4a357d774b8381`、`308d7977ec35ea1fbb5670a9caf3d033b48bcee3098af4b27330fe1bfc9ceec4` 核对，须 Reload Window。下一步为动态模块路由设计独立 provider 契约。证据见 [Symfony 路由 Definition 与 References](reports/symfony-route-navigation-2026-09-19.md)。

2026-09-19 Symfony 显式环境路由增量：新增 resource scope `phpCompanion.symfony.environment`，默认空值只保留无条件路由；framework-symfony 可提取确定性 bundle map 环境布尔值和 Kernel 顶层 `$this->environment === 'literal'` Bundle/route 分支，具体环境 false 会覆盖 all true，动态、复合和嵌套条件保持 unknown。Language Server 把环境加入原子 provider 快照，在 onDemand 下按需加载 Composer PSR-4 映射，并优先处理已选环境 Kernel 根，外部 Symfony Language Tools 运行时索引开启时仍独占路由能力。Winstar 只读 stdio 探针从默认 3 个直接路由切换到 dev 的 17 个候选，准确增加 WebProfiler 的 14 个 PHP Configurator 路由。framework-symfony 35 项、Language Server 185 项、语义内核 268 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过；Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 Alpha 预检均通过。功能提交 `a69e3d6`，候选目录 `artifacts/php-companion-alpha-0.4.5-a69e3d68/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `cf41e025a1190d251204a4071920b39aae8ea9a623b352006c432ccfb1e852ab`、`ed0aee89b96662b48bce7d2be840e59464d74566d5972131fc3c3cef538e9cf4`、`40bcfa939d4ab4a46bac43d99d1575b2e82b1b17e9cf3cebb787078919a2acaa`。核心 VSIX 已通过 Remote CLI 完整安装到 WSL RockyLinux8，已安装 adapter/server 分别以 `f3195f639ab9f0d1f801c151468099acac0e69185e5c70fa1e4a357d774b8381`、`939ea115e7a3ba190a4c6e2a67300794271468a4f595272d946d88e36d403511` 核对，须 Reload Window。下一步继续补齐 Symfony 路由参数、环境 Attribute 等真实高频静态关系。证据见 [Symfony 条件路由与显式环境](reports/symfony-conditional-routes-2026-09-19.md)。

2026-09-19 Symfony PHP 路由配置增量：framework-symfony 静态提取 PHP RoutingConfigurator 顶层 add/import 和自定义 Kernel 的无条件确定路径 import；Language Server 将本地 PHP、通用 Bundle PHP 与既有 YAML/Attribute 路由图合并，并延迟 Bundle 证明到真实别名导入。环境条件、动态 RouteCollection factory 和 service loader 保持 unknown。Winstar onDemand 实际探针得到 `health_live`/`health_ready`，冷 1851 ms、热 40 ms。framework-symfony 35 项、Language Server 185 项、语义内核 268 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `864a38a`，重复入口修复提交 `6acb8e1`，最终候选目录 `artifacts/php-companion-alpha-0.4.5-6acb8e1a/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `77aa03ae74bad02a938e0ef2c5e8ecdbda72b08e429de4e6a5fa30c9ca08ba20`、`0394210356dcc80b71903db94989943893fe7d6b9616510ecb4e4462e2442d17`、`767b22b95124a7c74582fc26f5c4d9ee305a69e60f8e5805886fdeebd7c0386c`。候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `87e2230da074b9efb78ae9ecd54293f08ccbf80c074110df8f253f5fb079a819` 核对，须 Reload Window。下一步评估显式环境身份下的条件路由，继续保留运行时 provider 的能力所有权。证据见 [Symfony PHP 路由配置](reports/symfony-php-route-configurator-2026-09-19.md)。

2026-09-19 P8 Symfony `@Bundle` 服务导入增量：framework-symfony 静态提取 `config/bundles.php` 的通用注册和项目 Kernel `registerBundles()` 的顶层无条件 yield；Language Server 只在 bundle short name 唯一、类文件唯一、父类链未声明 `getPath()` 或 `__construct()` 并最终继承 Symfony 基础 Bundle 时建立资源根。目标扩展名、真实路径 containment、循环和深度继续受门禁；条件注册、自定义路径和歧义保持 unknown。Winstar Kernel 得到 14 个无条件 bundle，当前服务配置没有 `@Bundle` 导入；WebProfiler 的 PHP 路由源码可被新分析器读取，但其 `dev` 条件仍交给运行时 provider。framework-symfony 33 项、Language Server 185 项、语义内核 268 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `dc80af5`，候选目录 `artifacts/php-companion-alpha-0.4.5-dc80af5e/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `270e5b0dc2b8a93cf78dbbe9b233cb920f492c732ab5608eabb4eaf8704b3493`、`87cf55869658fcc449d8a0450e966282c4736766610428f2dd0ea6b2d3d422d1`、`85dee34be7aa03c838f8dadaba74d284e7682e360d073657ce9725ecf1c7fce9`。候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `19f668c440380648da196c4f1110a4c4d65ea7fef81e0fc4c2de3c8e23723888` 核对，须 Reload Window。P8 后续处理环境身份与剩余服务关系。证据见 [Symfony `@Bundle` 服务导入](reports/symfony-bundle-service-imports-2026-09-19.md)。

2026-09-19 P8 Symfony 位置参数增量：PHP Configurator、YAML 与 XML 的确定性位置 arguments 按语义构造参数序号解析；显式服务引用即使在 `autowire: false` 服务上也可导航，标量/unknown 只抑制自身参数，显式 argument 优先于 bind、Target、具名 alias 和推断。事实缓存升级到 `symfony-facts-v8`。Winstar 当前 vendor 只读快照按固定筛选得到 96 个 Configurator 文件，96/96 完整解析，共提取 601 个服务和 794 个位置参数事实，其中 499 个服务引用、295 个精确抑制。framework-symfony 32 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `7b8aead`，候选目录 `artifacts/php-companion-alpha-0.4.5-7b8aead1/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `2a41cc7fa75c2108abb58b3260be2a8e67506b155292cd53e78c130d3e6f3e3f`、`f689e539b5469f757d910f9522bde0cabd6f0d2c1b95e68c31d1905c28f38d3c`、`7cefb5cc57e4eedc4936581bd3778b9c81b678d01059f766c0c43dd6cd52ca72`。候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `8c845dc1042b622d7a4ea6f4e8cdfbeb83f1b1d67412588d6847728086bcc445` 核对，须 Reload Window。P8 后续处理 bundle PHP 路由资源与剩余服务关系。证据见 [Symfony 位置服务参数映射](reports/symfony-positional-service-arguments-2026-09-19.md)。

2026-09-19 P8 Symfony PHP Configurator 增量：framework-symfony 通过共享 tree-sitter parser 静态分析唯一返回的 `ContainerConfigurator` closure，不 require 配置、不启动 Kernel；覆盖官方 Configurator 命名空间/import、services 变量/直接链、defaults、set/class、alias、load/exclude、public/private、autowire、bind、具名 arg/args、call/property、显式 listener tag、remove/get 与 PHP import。重赋值 configurator、factory/fromCallable/parent、abstract/synthetic 和动态值撤销或抑制无法证明的事实。Language Server 读取约定 `services.php` 与确定性 PHP 导入，将服务注册合并到 Container 返回、注入和类型 References，事实缓存升至 `symfony-facts-v7`。当前 Winstar 安装的 Symfony 7.4 vendor 只读审计中，91/91 个文本上返回 Configurator closure 的官方文件可解析，共提取 558 个可证明服务；该数不代表运行时容器总量。framework-symfony 31 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `4c44c9d`，候选目录 `artifacts/php-companion-alpha-0.4.5-4c44c9db/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `f0d303cd9cf308da709599277b1a5d1d4811303c34e8c2ab3f9997d4bfd87a8b`、`60563df7f3f31a860434f5396251e6eb43821f3a7e9a1e48b91e9b5114072416`、`a1c49296899b55ffd446152382598ffa8d09b88071065686b847408f00fee244`。候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `9b328aff27d3abf1df0280ca41a34a23c6bc32bef53668c61fcd1fd8f2c23737` 核对，须 Reload Window。P8 后续处理可证明的 `@Bundle` 映射。证据见 [Symfony PHP Configurator 静态服务事实](reports/symfony-php-configurator-2026-09-19.md)。

2026-09-19 P8 Symfony 服务配置导入增量：framework-symfony 输出 YAML `imports[].resource` 与 XML `<imports><import resource>` 的字面量资源和精确范围；Language Server 建立项目内确定性导入图，导入先于当前文件应用，只跟随 Composer 根真实路径内、明确 YAML/XML 扩展名且无参数、glob、绝对路径、URL scheme 或 `@Bundle` 别名的相对文件。递归深度限制为 32，循环和重复加载安全终止；导入文件变更会单独绕过缓存并重建服务目录，事实缓存升至 `symfony-facts-v6`。XML→YAML→XML 的真实 stdio 循环证明冷/热启动可终止、Container 补全与类型 References 指向实际导入文件，修改导入文件后事实立即撤销。framework-symfony 30 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `abb5ed6`，候选目录 `artifacts/php-companion-alpha-0.4.5-abb5ed64/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `9a7e0451a92cac57db97542b2ca20698244a888a245f5bec73946cd9f8e6c86c`、`0286d29b89ee47caa3cd3ba5786464676f7f98d7b4f4f8d7574dc5f4a89fe712`、`ab88ec48f12b3f3c7e572c1fc653e472373bd74cb7627d4afc7efec3f1fd6335`。候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `2a19e34cf6453a52cd0565a87ade7a8748d30433ed4187878176f5479b98e9f9` 核对，须 Reload Window。P8 后续处理 PHP Configurator DSL 与可证明的 `@Bundle` 映射。证据见 [Symfony 服务配置导入图](reports/symfony-service-imports-2026-09-19.md)。

2026-09-19 P8 传统 Symfony XML 服务增量：framework-symfony 在不启动 Kernel/Composer 项目代码的前提下读取约定位置的 `services.xml`，覆盖 defaults、显式 service/alias、bind、具名 service argument、call/property、prototype/exclude 和 `kernel.event_listener` 精确范围；Language Server 将 XML 静态事实与 YAML、新鲜编译容器合并，类型 References 可直接返回 XML 注册位置，事实缓存升至 `symfony-facts-v5`。DOCTYPE、环境 `<when>`、动态参数、abstract 与无法证明 class 的 factory 保持 unknown。framework-symfony 30 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `6fbdf5e`，候选目录 `artifacts/php-companion-alpha-0.4.5-6fbdf5e0/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `8d72fa1530f5e2618cdb06b7f1ee9cb908584a6d714b74f76e4ac0e6705f6264`、`9e7b05749a94d28b79ed373007c42a3eb2370d03166096af918867463db776a7`、`f698c836500f6c22cf42ff2c3ffeb56f77abeed386ef1333f621a8927aa7135b`。候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `ff2f35e9597e597ef7811fef32c3d22fd0e4f2eeb8e601fef5afb00bebeb3e2d` 核对，须 Reload Window。P8 后续按真实样本处理 PHP DSL、导入的 bundle 配置和动态 env 表达式；订阅辅助调用仍暂缓。证据见 [Symfony 服务注册 References](reports/symfony-service-references-2026-09-16.md)。

2026-09-19 P8 必然基础订阅增量：非收敛条件分支只在基础键与追加键均为不重叠字符串字面量、条件由 `defined/class_exists/interface_exists/trait_exists/enum_exists/function_exists/extension_loaded` 等无局部符号表副作用的白名单检查组成、且分支只含静态追加时，保留分支外必定存在的订阅事实；条件条目不发布。类常量可能共享运行时字符串值，覆盖基础键、订阅变量暴露、include/require/yield、动态变量和非白名单函数调用均整体拒绝。framework-symfony 29 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `e737ff8`，候选目录 `artifacts/php-companion-alpha-0.4.5-e737ff85/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `7faa212a16a54620baee0e879e46a19f64fb3b8f63afe6867f334a4f9def69ea` 核对，须 Reload Window。P8 下一步处理缓存缺失/过期时仍可证明的静态服务关系；订阅辅助调用因 Winstar/Symfony 当前样本没有需求而暂缓。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-18 P8 订阅分支收敛增量：framework-symfony 接受 `getSubscribedEvents()` 直接返回静态 map 或向单一局部 map 追加条目的完整 `if/elseif/else`，但每个分支的条目数量、顺序和源码文本必须完全相同；所有分支的事件键与回调范围都会进入类/监听方法 References。缺失 `else`、分歧条目、动态键、辅助调用或额外语句保持 unknown。同一提取器覆盖本类、父类与 Trait 提供者。framework-symfony 29 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `5c4efd1`，候选目录 `artifacts/php-companion-alpha-0.4.5-5c4efd19/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `0143432c100f2230b3678dc3a3abbb4cf32fdc98704cd117da8a127ef292e750` 核对，须 Reload Window。P8 下一步评估可证明的纯静态订阅辅助方法，以及缓存缺失/过期时的静态服务覆盖。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-18 P8 完整同类型事件分支增量：framework-symfony 接受直接位于同一代码块的完整 `if/elseif/else`，但每个分支必须仅含一个赋值，向同一局部变量直接构造同一事件类；缺少 `else`、分支事件或变量分歧、额外语句和嵌套动态路径保持 unknown。收敛事实可继续进入 Symfony EventDispatcher 接收者语义门禁和监听类/方法 References。framework-symfony 28 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `7f29d6b`，候选目录 `artifacts/php-companion-alpha-0.4.5-7f29d6b5/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `7ae9ed6240fe6c25755086ffa34ab47e80bf81d636d09f9a4f8aa6630611c883` 核对，须 Reload Window。P8 下一步处理订阅构造的可证明分支/辅助调用和缓存缺失时的纯静态覆盖。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-18 P8 局部事件直接别名增量：framework-symfony 对同一最内层代码块的前 256 条直接语句建立事件变量状态，`new EventClass(...)` 和直接 `$alias = $event` 可传播精确运行时事件类；引用赋值、复合表达式、未知调用或控制流只撤销被触碰变量，动态/未知来源不会产生事实。Language Server 仍要求 `dispatch()` 唯一属于 Symfony EventDispatcher；真实 stdio 同时证明 `$dispatcher->dispatch($alias)` 返回 alias 范围，而 `$bus->dispatch($message)` 不进入 References。framework-symfony 28 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `e9a25db`，候选目录 `artifacts/php-companion-alpha-0.4.5-e9a25db0/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `86d1ea8e39836113097b4f0e6979163a62f848e75b24422e39ea34fc675db20b` 核对，须 Reload Window。P8 下一步评估完整同类型分支收敛、订阅构造分支/辅助调用和缓存缺失时的纯静态覆盖。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 局部事件变量派发增量：framework-symfony 在 `dispatch($event)` 没有显式 eventName 时，只接受同一最内层代码块内最后一次相关语句为 `$event = new EventClass(...)`，并要求赋值到派发之间没有任何使用、引用暴露或重赋值；事件范围精确落在派发参数变量。参数、别名、分支外赋值、动态重赋值和中间调用保持 unknown。Language Server 继续要求 `dispatch()` 唯一解析到 Symfony Contracts/Component EventDispatcher 接口族，因此 Messenger 与业务同名 API 不会误报。framework-symfony 28 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `bea0622`，候选目录 `artifacts/php-companion-alpha-0.4.5-bea06222/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `f18e6e8405f408ab61c260c5b6bc381a9cadbc606b350960a211876404b2ee3f` 核对，须 Reload Window。P8 下一步评估局部事件别名/分支收敛的可证明子集、订阅构造分支/辅助调用，以及缓存缺失时的纯静态覆盖。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 subscriber 相对常量增量：PHP 8.5 实测和 Symfony `RegisterListenersPass` 调用方式确认，继承静态订阅方法中的 `self` 绑定方法宿主、`static` 晚绑定实际注册 subscriber、`parent` 绑定宿主直接父类；Trait 方法的 `self` 绑定组合宿主，继续被子类继承时 `static` 仍绑定实际子服务。Language Server 从有效公开静态方法保留的声明身份、类型作用域和注册类构造三种绑定，Trait `as public getSubscribedEvents` 还会回溯 private/protected 原方法；缺失唯一宿主或父类保持 unknown。PHP 8.5 Reflection 与 Symfony AttributeAutoconfigurationPass 实测同时确认，父类/Trait 的类级 `#[AsEventListener]` 不会继承到子服务。semantic 268 项、framework-symfony 28 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `3f6b5b4`，候选目录 `artifacts/php-companion-alpha-0.4.5-3f6b5b46/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `2ed25925d13bffa5300fc18ce8fa4bd16f7a7ab830818b1ba2f9981ab9e07265` 核对，须 Reload Window。P8 下一步处理变量事件、分支/辅助调用订阅构造与缓存缺失时的纯静态覆盖。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 方法 Attribute 相对事件类增量：PHP 8.5 Reflection 实测证明，继承父类方法中的 `self::class`/`parent::class` 分别解析到方法声明类/声明类父类，Trait 方法中的同名表达式分别解析到消费类/消费类父类；`static::class` 在 Attribute 常量表达式中由 PHP 编译期拒绝。semantic 新增唯一直接父类查询，只有解析到唯一 class 声明才提供绑定；framework-symfony 按 provider 种类选择声明或消费上下文。缺失、重复、非 class 父目标及非法 static 保持 unknown。semantic 268 项、framework-symfony 28 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `efd443d`，候选目录 `artifacts/php-companion-alpha-0.4.5-efd443d9/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `a176fd3562a716345d85134e7494310210bc5a48aead43d43cf71d2a128b9cad` 核对，须 Reload Window。P8 下一步核对父类/Trait 类级 Attribute 的 PHP/Symfony 继承边界，再转向剩余服务关系。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 Trait alias Attribute 增量：PHP 8.5 Reflection 实测确认 `use Trait { method as alias; }` 的原方法与 alias 都保留方法 Attribute，且 Reflection declaring class 为消费类。semantic 的有效 alias 方法现在保留独立 `Host::alias` 身份以及原始 `Trait::method` 声明身份/名称；Language Server 用前者匹配 alias 调用和 References，用后者读取 `#[AsEventListener]` 源范围，并以 alias 名发布回调关系。原方法与 alias 可各自关联 Attribute 和匹配 dispatch，类 References 对相同事件范围去重。semantic 268 项、framework-symfony 28 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `2848e49`，候选目录 `artifacts/php-companion-alpha-0.4.5-2848e499/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `9678e98124d1af361a5485394bcf2f5d2e85ac2b8aeecd2ca664b39cdd07d288` 核对，须 Reload Window。P8 下一步处理跨宿主相对事件类及父类/trait 类级 Attribute 的明确运行时边界。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 继承/Trait 方法 Attribute 增量：Language Server 只对已注册服务枚举完整父类/Trait 图中的有效具体公开实例方法；当真实声明来自父类或 Trait 时，framework-symfony 会读取该方法的 `#[AsEventListener]`，支持字面量、显式事件类、首个原生参数推断、重复 Attribute、整数优先级和 dispatcher 字面量。子服务类 References 返回事件，真实父类/Trait 方法 References 返回 Attribute 名并继续合并匹配的 EventDispatcher 派发位置。跨宿主 `self/static/parent`、另行指定 method、private/static 方法、未注册消费类及 Trait alias 改名保持 unknown；普通方法查询先检查声明源码是否含 Attribute，避免扫描全部服务。semantic 268 项、framework-symfony 28 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `48d8126`，候选目录 `artifacts/php-companion-alpha-0.4.5-48d81260/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `2831426b4b6db858c1bd862d3337ed7e6bd030b7487edd4630fc0d77647bf54f` 核对，须 Reload Window。P8 下一步处理 Trait alias Attribute 的身份映射与剩余动态边界。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 确定性订阅构造增量：`getSubscribedEvents()` 除单一直接返回数组外，现在接受一个局部变量的静态数组初始化、零到多个字面量或显式类常量键赋值，以及未改变变量的最终返回；出现动态键、其他语句、变量切换或非原样返回会拒绝整段线性构造。父类/Trait 提供者中的 `KernelEvents::...` 等显式外部类常量可按词法 import 发布，跨宿主 `self/static/parent` 继续保持 unknown。framework-symfony 27 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过；真实 stdio 已改用局部构造并同时验证事件键与回调引用。功能提交 `814c25f`，候选目录 `artifacts/php-companion-alpha-0.4.5-814c25fb/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `69a69aa82c5bec60c0e8b221faec4d570007023a12a9bf3977301f8361b402dd` 核对，须 Reload Window。P8 下一步处理 Trait 方法 Attribute 组合边界。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 继承/Trait 订阅提供者增量：已注册服务只有在语义层证明属于 `EventSubscriberInterface`，并把 `getSubscribedEvents()` 唯一解析到完整父类/Trait 图中的具体公开静态方法后，才分析提供者的单一直接返回数组。字面量事件、直接回调、优先级和多监听器会绑定到实际子服务类及有效父类/Trait 监听方法；跨宿主 `self/static` 类常量事件、private/non-static/abstract 提供者、动态或分支返回保持 unknown。普通 References 不会无条件加载 Symfony 接口，只有发现订阅源码或目标类存在有效订阅提供者时才精确加载 vendor 身份。semantic 268 项、framework-symfony 26 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `a7a5448`，候选目录 `artifacts/php-companion-alpha-0.4.5-a7a5448a/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `d2c0f0adef307154ed79b0429a4d9128d8a1af16f054f6147defa152588e2bed` 核对，须 Reload Window。P8 下一步进入动态订阅与 Trait Attribute 的保守边界。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 继承/Trait 监听方法增量：semantic 新增服务类有效公开实例方法查询，只在父类与 Trait 图完整时返回唯一具体方法，并保留真实父类或 Trait 声明身份；未载入的外部接口不会阻断本类已明确实现的方法。`getSubscribedEvents()` 回调、类级 `#[AsEventListener]` 的显式/派生方法、YAML 与新鲜编译容器 `kernel.event_listener` 标签均复用该查询，因此从父方法或 Trait 方法执行 References 会返回子服务的订阅字符串和配置标签，从子服务类执行 References 会返回对应事件位置。private、static、abstract、缺失父类/Trait 和无效标签保持 unknown；继承或 Trait 提供的 `getSubscribedEvents()` 本身及 Trait Attribute 复制语义仍开放。semantic 268 项、framework-symfony 25 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `c994928`，候选目录 `artifacts/php-companion-alpha-0.4.5-c994928a/`；候选语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并以 `e183a29bb46fafc8043053793c1a898ba3d676899553ba8ed2e42e5209e63488` 核对，须 Reload Window。P8 下一步处理继承/Trait 提供订阅声明与动态订阅边界。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 编译容器事件标签增量：新鲜 `var/cache/dev/*DebugContainer.xml` 的具体 service 会提取显式 `kernel.event_listener` event、method 和整数 priority，事件身份按 XML 实体解码，References 保留原始 XML 属性值范围；缺少 event/method、非法方法名或非整数 priority 的标签保持 unknown。已有服务 class 解析和公开非静态方法门禁继续生效，因此标签不会仅凭文本产生引用。Symfony 来源事实缓存升级为 `symfony-facts-v4`，旧 v3 安全重建。framework-symfony 24 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过；冷启动 stdio 同时验证编译 service 注册、event/method 引用和无效方法反例。功能提交 `4627aca`，候选目录 `artifacts/php-companion-alpha-0.4.5-4627aca3/`；语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并通过 SHA-256 核对，须 Reload Window。P8 下一步转入继承/Trait 监听方法与动态订阅边界。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 Symfony 派发关系增量：监听类与公开方法 References 会把 subscriber/attribute/YAML 中的规范事件身份与项目中的派发候选匹配。framework-symfony 只接受直接 `new Event()`，或显式字符串、`Event::class`、类常量事件名，支持合法的位置/命名参数组合并保留精确范围；Language Server 再要求 `dispatch()` 唯一解析到 `Symfony\\Contracts\\EventDispatcher\\EventDispatcherInterface`、组件兼容接口或其子类型。真实 stdio 回归同时放入相同事件的 EventDispatcher 和 Messenger 调用，只返回前者。变量事件、动态事件名、无法解析接收者和同名业务 API 保持 unknown。候选扫描复用按名称有界路径，派发分析按 URI 与权威源码缓存；Winstar 当前仅有 Messenger dispatch，均未误报，类 References 冷/热约 7.69 秒/32 毫秒，方法约 6.88 秒/31 毫秒。framework-symfony 24 项、semantic 267 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 与 ESLint、16 个隔离 tarball 和三份 VSIX 内容验证通过。功能提交 `d6411e7`，候选目录 `artifacts/php-companion-alpha-0.4.5-d6411e74/`；语言服务器 bundle 已原子覆盖到 WSL 现有扩展目录并通过 SHA-256 核对，须 Reload Window。P8 总项继续开放，下一步为 XML/编译容器事件标签。证据继续记录在 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-16 P8 Symfony 事件关系增量：可独立发布的 framework-symfony 除完整字面量 `EventSubscriberInterface::getSubscribedEvents()` 外，新增精确类/方法级 `#[AsEventListener]` 和显式 YAML `kernel.event_listener` 事实。Attribute 支持字面量事件、`Event::class`、首个原生对象参数推断、Union、多次声明、整数优先级、类级 `on<EventName>` 派生和 `__invoke` 回退；YAML 标签保留 event/method 精确范围并随确定性 resource 展开。Language Server 只在关系对应公开非静态方法时合并到类或方法 References，冷启动直接查询方法也会按需加载服务事实；动态参数、无效 method、XML/编译容器标签、继承/Trait 方法和 dispatch 调用保持 unknown。Symfony 来源缓存升级为 `symfony-facts-v3`。framework-symfony 23 项、Language Server 185 项及根扩展 39 项测试通过，全仓 TypeScript 和 ESLint、16 个隔离 tarball、三份 VSIX 内容验证通过；Winstar 只读回归中类 References 冷/热约 6.29 秒/33 毫秒，方法约 5.72 秒/13 毫秒。功能提交 `c22b57f`，候选目录为 `artifacts/php-companion-alpha-0.4.5-c22b57f9/`。Remote CLI 安装通道挂起，候选语言服务器 bundle 已原子覆盖到 WSL 现有 0.4.5 扩展目录并通过 SHA-256 核对，须 Reload Window。P8 总项保持开放，下一步处理可证明的 dispatch 调用。证据见 [Symfony 事件订阅 References](reports/symfony-event-subscriptions-2026-09-16.md)。

2026-09-15 P4 callable 数组增量：解析器只记录精确二元素数组，其中接收者必须是已证明对象变量或 `Type::class`，方法必须是标识符字面量。语义层要求唯一、可访问且静态性一致的方法，并沿最多八层不可变直接别名提供变量调用 Signature Help、缺参/错参诊断和返回类型成员补全；动态方法、字符串类名、nullable、private 外部访问、实例/静态不匹配、控制流来源、重赋值、引用和 unset 均保持 unknown。新赋值事实进入持久实现记录，semantic snapshot 升至 schema 77，Language Server 缓存升至 v49；热恢复后继续提供同一签名。全仓类型检查、ESLint、十六个组件 656 项与根扩展 39 项测试均通过，共 695 项；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux x64 打包 Extension Host 均通过。提交 `03461a7` 的 [CI 34984747546](https://github.com/sohophp/php-companion/actions/runs/34984747546) 18/18 成功；Winstar/CoreRepo 最新只读 Oracle 同样通过。证据见[精确 callable 数组验收](reports/callable-array-contract-2026-09-15.md)。

2026-09-15 P4 可调用对象增量：唯一、非空对象类型的直接变量调用复用唯一公开实例 `__invoke()`，包括类自身、继承方法、接口声明和已证明局部对象别名；同一签名驱动 Signature Help、缺参/错参诊断及返回类型成员补全。nullable、Union 歧义、非公开和未解析目标保持 unknown。semantic 与真实 stdio 回归覆盖正反边界；该能力不增加持久事实，语义快照和缓存版本保持 schema 76/v48。全仓十六个组件 653 项与根扩展 39 项，共 692 项测试、十六个隔离 tarball、三个 VSIX 内容和 VS Code 1.137.0 Linux x64 打包 Extension Host 均通过。提交 `9c82d22` 的 [CI 34978077566](https://github.com/sohophp/php-companion/actions/runs/34978077566) 18/18 成功；Winstar/CoreRepo 最新只读 Oracle 同样通过。证据见[可调用对象契约验收](reports/invokable-object-contract-2026-09-15.md)。

2026-09-15 Alpha 启动门禁增量：新增只读 `pnpm alpha:preflight`，从 `candidate.json` 验证干净完整提交、三个角色唯一的 VSIX、文件大小与 SHA-256、受支持/拒绝扩展注册表，再核对 Composer 项目、WSL 和项目 PHP 包装器次版本。最终候选绑定 `03461a7c6135134b446188eab2f1d0ace90ad97f`，分别以 Winstar `bin/php-runtime` 8.5 和 CoreRepo `phpbin` 7.2 通过非编辑器确定性预检。严格编辑器探针准确拒绝了当前非隔离环境：命令不在 VS Code WSL 集成终端运行，且 Open Source Pack 与 Recommended Pack 同时安装；七个冻结外部扩展与核心版本均准确。CLI 无法读取扩展启用状态，因此 Intelephense 与 Symfony Language Tools 是否禁用，以及 Extension Host 归属和两小时交互，仍保留人工验收。全仓共 695 项测试、十六个隔离 tarball、三个 VSIX 内容和 VS Code 1.137.0 Linux x64 打包 Extension Host 均通过；[CI 34984747546](https://github.com/sohophp/php-companion/actions/runs/34984747546) 18/18 成功。证据见 [Alpha 环境预检](reports/alpha-preflight-2026-09-15.md)。

2026-09-15 P4 原生 closure/arrow 变量调用增量：直接局部赋值及最多八层不可变直接别名复用闭包原生参数、默认值和返回契约，提供 Signature Help、缺参/错参诊断及显式或完整可证明的返回传播；重赋值、控制流赋值、引用修改和包装调用保持 unknown。semantic snapshot 升至 schema 76，持久缓存升至 v48。十六个组件 651 项与根扩展 35 项测试、十六个隔离 tarball、三份 VSIX 内容及 VS Code 1.137.0 Linux x64 打包 Extension Host 均通过。提交 `39cc6c6` 的 [CI 34968267703](https://github.com/sohophp/php-companion/actions/runs/34968267703) 18/18 成功；最新私有候选绑定同一功能提交。P4 调用传播总项保持开放。证据见[原生 closure/arrow 变量调用契约验收](reports/native-closure-variable-callable-2026-09-15.md)。

2026-09-15 P4 局部 PHPDoc callable 别名增量：紧邻赋值的 callable `@var` 注解和同块独立 callable `@var` 断言现在可沿一次非控制流、未修改的直接局部别名传播，别名调用保留 Signature Help、具名参数、缺参/错参诊断和返回成员补全。来源在别名前后被读取或修改、别名重赋值、引用修改或控制流内赋值保持 unknown；参数 callable 的既有一次别名也新增控制流门禁。semantic 与真实 stdio 回归覆盖两类来源、签名、结果补全、缺参、错参和三类反例。十六个组件 648 项与根扩展 35 项测试全部通过，共 683 项；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux x64 打包宿主通过。提交 `9c861a7` 的 [CI 34962544589](https://github.com/sohophp/php-companion/actions/runs/34962544589) 18/18 成功。P4 调用传播总项保持开放。证据见[局部 PHPDoc callable 别名传播验收](reports/local-phpdoc-callable-alias-2026-09-15.md)。

2026-09-15 P4 独立局部 PHPDoc callable 断言增量：同一代码块内有变量名且类型完整的 `@var callable(...) $variable` 现在为断言后的首次直接调用提供参数名、可选/variadic 与返回类型 Signature Help，同时发布缺参和已证明类型不匹配诊断，返回类型继续进入成员补全。断言后的介入读取、重赋值、unset、引用修改或跨块使用保持 unknown。semantic 与真实 stdio 回归覆盖具名调用、结果成员补全、缺参、错参和三类反例。十六个组件 647 项与根扩展 35 项测试全部通过，共 682 项；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux x64 打包宿主通过。提交 `3ae79e8` 的 [CI 34959700021](https://github.com/sohophp/php-companion/actions/runs/34959700021) 18/18 成功。P4 调用传播总项保持开放。证据见[独立局部 PHPDoc callable 断言验收](reports/standalone-local-phpdoc-callable-2026-09-15.md)。

2026-09-15 P4 局部 PHPDoc callable 赋值契约增量：紧邻同一词法作用域直接赋值的 `@var callable(...) $variable` 现在为首次直接变量调用提供参数名、可选/variadic 与返回类型 Signature Help，同时发布缺少必填参数和已证明类型不匹配诊断，返回类型继续进入成员补全。控制流赋值、赋值与调用之间的读取、重赋值或引用修改保持 unknown。semantic 与真实 stdio 回归覆盖具名调用、结果成员补全、缺参、错参和三类反例。十六个组件 645 项与根扩展 35 项测试全部通过，共 680 项；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux x64 打包宿主通过。提交 `5631186` 的 [CI 34956917624](https://github.com/sohophp/php-companion/actions/runs/34956917624) 18/18 成功。P4 调用传播总项保持开放。证据见[局部 PHPDoc callable 赋值契约验收](reports/local-phpdoc-callable-assignment-2026-09-15.md)。

2026-09-15 P4 PHPDoc callable 调用契约增量：未触碰且非引用的 PHPDoc `callable(...)` 参数及一次直接局部别名现在进入变量调用 Signature Help，保留显式或稳定生成的参数名、可选参数、variadic 和返回类型；直接调用同时发布缺少必填参数与已证明类型不匹配诊断，普通和条件返回传播继续消费同一契约。提前读取、参数重赋值、别名重复使用或按引用参数保持 unknown。semantic 与真实 stdio 回归覆盖具名调用、可选参数、结果成员补全、缺参、错参、提前读取和重赋值反例。十六个组件 644 项与根扩展 35 项测试全部通过，共 679 项；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux x64 打包宿主通过。提交 `8a46213` 的 [CI 34953462952](https://github.com/sohophp/php-companion/actions/runs/34953462952) 18/18 成功。P4 调用传播总项保持开放。证据见[PHPDoc callable 调用契约验收](reports/phpdoc-callable-invocation-contract-2026-09-15.md)。

2026-09-15 P4 first-class callable 增量：parser 将变量函数调用记录为独立调用事实，同时保留 `target(...)` 的 Closure 获取身份。semantic 可从唯一直接函数、静态方法或实例方法获取目标签名，并沿最多八层未修改局部别名传播；变量调用复用原参数名、默认值、variadic/by-reference、PHPDoc 和原生类型，提供 Signature Help、缺参/错参诊断，以及位置、具名和泛型实参驱动的返回传播。动态获取、重复赋值、按引用修改、重载歧义或别名循环保持 unknown。语义快照升级到 schema 75，Language Server 缓存升级到 v47，拒绝缺少变量调用事实的旧热缓存。十六个组件 642 项与根扩展 35 项测试全部通过，共 677 项；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux x64 打包宿主通过。1,000 文件热恢复 1,000/1,000、重解析 0，热/冷比 0.354。提交 `5494030` 的 [CI 34947804332](https://github.com/sohophp/php-companion/actions/runs/34947804332) 18/18 成功。P4 调用传播总项保持开放。证据见[first-class callable 调用传播验收](reports/first-class-callable-invocation-2026-09-15.md)。

2026-09-15 P4 内建对象增量：基于 Winstar 的 Symfony、Monolog 与 Revolt 实际依赖，补齐 PHP 8.1 `Fiber`、`ReflectionFiber` 和 PHP 8.2 `SensitiveParameter`、`SensitiveParameterValue`。版本化声明保留构造参数、实例/静态成员、`Fiber::getCurrent(): ?Fiber`、Reflection 执行文件/行/trace，以及敏感值的 `mixed` 边界；PHP 8.0/8.1 反例确认不会提前暴露。语义回归覆盖成员补全、构造 Signature、nullable 非空收窄、返回传播与虚拟内建 Definition。全仓 675 项测试、十六个隔离 tarball、三个 VSIX、Linux 打包 Extension Host 通过；提交 `2c91a7d` 的 [CI 34943334118](https://github.com/sohophp/php-companion/actions/runs/34943334118) 18/18 成功。名称/成员完整目录总项保持开放。证据见[Fiber 与敏感参数内建验收](reports/fiber-sensitive-builtins-2026-09-15.md)。

2026-09-15 P4 基础类型代数封板：可独立发布的 `@php-companion/type-system` 统一表示 primitive、named、literal、null、void、never、mixed、unknown、Union、Intersection/DNF、整数区间、array/list/shape、泛型、class-string 与 Callable。Union 扁平化、规范排序、去重，并吸收 never/mixed；三态 `yes | no | unknown` 兼容关系覆盖 PHP int→float、集合到 iterable、命名继承、泛型方差/父级替换、Callable 参数逆变/返回协变和有界递归。新增边界回归确认 never 为底部、mixed 为安全目标、unknown 不伪装成错误或肯定关系、void 与 null 保持分离；组件 18 项测试和类型检查通过。P4 的名称/成员解析完整目录与调用传播总项继续开放。证据见[基础类型代数验收](reports/base-type-algebra-2026-09-15.md)。

2026-09-15 P3 工程生命周期封板：真实 stdio 回归连续验证打开缓冲区覆盖磁盘 change、PHP 文件创建/删除、普通文件移动后的 Definition URI、Composer autoload 新映射生效，且每轮重索引后打开缓冲区仍为权威来源。`@php-companion/index` 现在验证正整数资源预算；项目单文件超限、瞬时不可读或分析失败会明确置 `projectComplete=false`，依赖缺口只置全量 `complete=false`，并输出具体警告。Language Server 在项目或依赖不完整时均不发布未解析类型、函数和常量诊断，避免受限索引假阴性；结构合法但 restore adapter 拒绝的缓存条目回退源码重建。已有文件数/总字节原子门槛、确定性依赖截断、发现/逐文件取消、LSP work-done begin/report/end、JSON 缓存损坏恢复和三平台持续基准共同构成资源、取消、进度与恢复证据。全仓类型检查、ESLint、十六个组件 638 项和根扩展 35 项测试通过；十六个 tarball、三个 VSIX 与 VS Code 1.137.0 Linux x64 打包宿主通过。1,000 文件持久索引热/冷比 0.3032，热恢复 1,000/1,000、重解析 0。提交 `74f9544` 的 [CI 34939467083](https://github.com/sohophp/php-companion/actions/runs/34939467083) 18/18 成功；Winstar/CoreRepo 修复后复核均为项目完整、100/100 抽样声明与 oracle 零失败。P3 除目标 PHP/扩展完整目录与 Remote/容器环境矩阵外的工程索引子项据此关闭；人工 Windows + WSL Remote 长会话仍属于 P9 门禁。证据见[项目生命周期与完整性验收](reports/project-lifecycle-index-completeness-2026-09-15.md)。

2026-09-15 最新 P3 封板：热恢复后的正文事实可按目标 callable 水合。成员补全、Definition、Type Definition、Signature Help 和区间 Inlay Hint 进入显式有界查询作用域，只合并文件级事实与覆盖光标/范围的唯一函数、方法或 Property Hook；同一文件的其他记录继续保持 deferred。整文件诊断、重构、快照和未限定的正文消费者自动完整装载，无法证明边界时不发布部分结果。全仓类型检查、ESLint 和 667 项测试通过。10,000 文件冷/热为 17,919.25/7,066.28 ms，热/冷比 0.3943；恢复 10,000/10,000、重解析 0，19,999 条 callable 记录初始全部延迟，聚焦补全仅加载 `Consumer::inspect`，同文件仍计入 deferred，后续完整诊断只装载 3 个相关文件。500 轮编辑无陈旧补全，诊断 P95 3.97 ms、热补全 P95 1.32 ms、取消 1.22 ms、最终 RSS 增长 0.11 MiB。提交 `6a609ac` 的 [CI 34935803007](https://github.com/sohophp/php-companion/actions/runs/34935803007) 18/18 成功。P3 的声明/实现分层、引用倒排、派生依赖和持久缓存子项据此关闭；实际 Windows + WSL Remote 会话仍属于 P9 人工门禁。证据见[Callable 目标装载验收](reports/callable-targeted-loading-2026-09-15.md)。

2026-09-15 最新 P3 增量：语义快照升级为 schema 74，将文件级实现和每个身份唯一的函数、方法、Property Hook 实现拆为规范记录；重复身份保守留在文件记录。恢复会重算事实归属与原始解析顺序，拒绝记录复制、搬移、越界和旧 schema。`callableImplementationStates()` 暴露记录状态。Language Server 缓存升级到 v46/schema 3，分别校验源码、声明、文件实现、每条 callable 实现、派生层和框架事实。全仓 666 项测试、类型检查和 ESLint 通过。10,000 文件冷/热为 18,608.96/7,660.08 ms，恢复 10,000/10,000、重解析 0，19,997 条 callable 记录全部延迟，聚焦查询仍只装载 3 个文件；派生层和 callable 单条损坏都只重建 1 个文件。500 轮编辑无陈旧补全，诊断 P95 2.69 ms、热补全 P95 1.09 ms、取消 1.15 ms。Windows 完整插件组合的一次 5 秒诊断等待波动在同提交复跑通过，随后把该精确断言加固为 15 秒有界等待并输出最后诊断码；提交 `7e27eb9` 的 [CI 34932496049](https://github.com/sohophp/php-companion/actions/runs/34932496049) 18/18 成功。按目标 callable 及依赖装载仍开放。证据见[Callable 实现记录验收](reports/callable-implementation-records-2026-09-15.md)。

2026-09-15 最新 Alpha 交付增量：`pnpm candidate:alpha` 只从干净提交重新构建并验证三个 VSIX，再生成含完整提交、文件大小、SHA-256、七个冻结受支持扩展与两个拒绝扩展的私有候选目录；不会创建 tag 或公开发布。最新候选绑定提交 `03461a7c6135134b446188eab2f1d0ace90ad97f`，对应 [CI 34984747546](https://github.com/sohophp/php-companion/actions/runs/34984747546) 18/18 成功。当前源码的只读真实项目门禁中，Winstar 2,256 个和 CoreRepo 1,137 个项目 PHP 文件完整进入索引，抽样声明均为 100/100，References P95 分别 22.26/18.05 ms，两个冻结补全与 Definition Oracle 均通过。Windows 客户端连接 WSL Remote 与连续两小时真实交互仍需人工验收。证据见[私有 Alpha 候选验收](reports/private-alpha-candidate-2026-09-15.md)。

2026-09-15 最新 P3 增量：v45 热缓存命中改为声明优先恢复。schema 73 全量完整性验证通过后，全局声明表立即可用，实现数组及控制流赋值位置以文件为单位保持 `deferred`；类型、函数、常量和工作区符号目录不会装载正文，首次正文相关查询通过统一门一次性装载完整实现，避免部分事实产生假阴性。更新、删除和销毁清除旧延迟记录，索引日志暴露剩余数量。全仓类型检查、ESLint 和测试通过；十六个组件 631 项、根扩展 35 项，共 666 项。真实冷热 stdio 证明四个缓存文件启动后全部延迟，打开 consumer 后仍恢复三层 Callable 并发布精确 readonly 诊断。10,000 文件热启动恢复 10,000/10,000、重解析 0，全部 10,000 个实现先保持延迟，一次传递查询只装载 3 个相关文件；冷/热耗时 17,627.97/5,690.38 ms。500 轮编辑无陈旧补全，诊断 P95 3.79 ms、热补全 P95 1.35 ms、取消 1.21 ms。十六个隔离 tarball、三个 VSIX 内容和 Linux VS Code 1.137.0 打包 Extension Host 均通过。提交 `b7c3069` 的 [CI 34926008703](https://github.com/sohophp/php-companion/actions/runs/34926008703) 18/18 成功，覆盖三平台 Quality、Extension Host、七扩展 Open Source Profile 和 PHP 7.2–8.5。callable 级实现记录及依赖装载仍开放，P3 尚未完成。证据见[声明优先与实现按需装载验收](reports/deferred-implementation-loading-2026-09-15.md)。

2026-09-15 P3 磁盘分层增量：语义快照升级为 schema 73，把全局声明/签名、方法体实现事实、引用候选与类型依赖拆为独立记录；Language Server Composer 缓存升级到 v45，每文件封装分别保存声明、实现、派生层和 Symfony/Doctrine 事实 SHA-256，并保留整体摘要。恢复要求声明/实现 URI 一致，派生内容可从重组后的语义文件重新推出；旧 schema、任意记录篡改和打开文档源码不一致均拒绝。全仓类型检查、ESLint 和测试通过；十六个组件 631 项、根扩展 35 项，共 666 项。10,000 文件冷索引 17,194.06 ms，热恢复 5,249.23 ms，热/冷比 30.53%；热启动恢复 10,000/10,000、重解析 0，并保留框架、传递失效和 3 条 Callable 事实；单条派生层损坏仅重建 1 个文件。500 轮编辑无陈旧补全，诊断 P95 2.75 ms、热补全 P95 1.24 ms、取消 1.26 ms。十六个隔离 tarball、三个 VSIX 内容及 Linux VS Code 1.137.0 打包 Extension Host 均通过。提交 `ec96d9e` 的 [CI 34922085061](https://github.com/sohophp/php-companion/actions/runs/34922085061) 18/18 成功，覆盖三平台 Quality、Extension Host、七扩展 Open Source Profile 和 PHP 7.2–8.5。该增量当时仍完整恢复实现记录；后续文件级延迟装载已经完成，callable 级拆分仍开放。证据见[声明与实现磁盘记录验收](reports/persistent-declaration-implementation-records-2026-09-15.md)。

2026-09-15 最新 P3 增量：已消费且可证明为单一构造类型的 Callable 工厂摘要进入独立 `callable-facts-v1` 持久缓存。缓存只保存正向事实，不为未使用 Callable 增加冷启动预扫描；每个来源核对源码 SHA-256 和载荷 SHA-256，语义层要求调用者、结果类型及所有直接依赖身份唯一，再从叶节点向上传递接受完整调用链。依赖源码改变、新增同名声明、缺失/损坏条目、循环或返回类型不一致会拒绝受影响链，独立事实仍可恢复；负向、动态、递归和歧义结论不持久化。打开文档不写入磁盘，写入按 750 ms 去抖并在 LSP shutdown 前刷新。真实两进程 stdio 回归证明冷进程消费并保存 `outer -> middle -> inner`，热进程恢复 3/3 后仍发布精确 readonly 诊断。全仓类型检查、ESLint 和测试通过；十六个组件 631 项、根扩展 35 项共 666 项。10,000 文件热恢复 10,000/10,000，并恢复 3 条 Callable 事实，耗时约为冷索引的 26.88%；500 轮编辑无陈旧补全，诊断 P95 2.55 ms、热补全 P95 1.09 ms、取消 1.15 ms。提交 `1d4a909` 的 [CI 34911657028](https://github.com/sohophp/php-companion/actions/runs/34911657028) 18/18 成功，覆盖三平台 Quality、Extension Host、七扩展 Open Source Profile 和 PHP 7.2–8.5。更细的声明/方法体独立磁盘记录仍开放，P3 尚未完成。证据见[Callable 工厂事实持久化验收](reports/persistent-callable-facts-2026-09-15.md)。

2026-09-15 最新 P3 增量：Symfony `services.yaml` 和新鲜 `var/cache/dev/*DebugContainer.xml` 的未展开来源事实进入独立 `symfony-facts-v1` 持久缓存。恢复同时核对 Composer 根、路径、URI、稳定文件元数据、源内容 SHA-256、事实结构和事实 SHA-256；即使外部工具保留文件大小和 mtime，内容变化也会重建。监控事件强制绕过对应条目，单条损坏或 URI 映射变化只重建受影响来源，读取期间变化的文件不写缓存。YAML resource 每次按当前 PHP 类型目录展开，避免 PHP 声明变化后恢复旧服务集合。真实冷/热两进程 stdio 测试证明第二次启动恢复 2/2 来源且容器服务补全仍精确。全仓类型检查、ESLint 和最终测试通过；十六个组件 628 项、根扩展 35 项共 663 项。10,000 文件热恢复 10,000/10,000，耗时约为冷索引的 27.39%；500 轮编辑无陈旧补全，诊断 P95 2.45 ms、热补全 P95 0.99 ms、取消 1.04 ms。十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux 打包 Extension Host 均通过。提交 `7d4adea` 的 [CI 34907040302](https://github.com/sohophp/php-companion/actions/runs/34907040302) 18/18 成功，覆盖三平台 Quality、Extension Host、七扩展 Open Source Profile 和 PHP 7.2–8.5。通用 Callable 事实持久化及更细的声明/方法体独立磁盘记录仍开放，P3 尚未完成。证据见[Symfony 来源事实持久化验收](reports/persistent-symfony-source-facts-2026-09-15.md)。

2026-09-15 最新 P3 增量：工厂构造摘要现为唯一解析、直接返回调用建立有界 Callable 反向依赖图；`outer -> middle -> inner` 可传递复用构造结论，修改 `inner` 会失效全部调用者，移除调用边后再修改旧被调用方不会误清 `outer`。递归、歧义、动态调用和超预算继续保持 unknown，图不完整时清空相关派生缓存。全仓类型检查和 ESLint 通过；十六个组件 625 项、根扩展 35 项共 660 项测试通过；500 轮长编辑基准无陈旧结果，诊断 P95 3.77 ms、热补全 P95 1.29 ms、取消 1.38 ms；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux 打包 Extension Host 均通过。提交 `72afd9a` 的 [CI 34902843097](https://github.com/sohophp/php-companion/actions/runs/34902843097) 18/18 成功，覆盖三平台 Quality、Extension Host、七扩展 Open Source Profile 和 PHP 7.2–8.5。进程内派生摘要不会随 schema 72 快照恢复，因此本次没有无意义地升级 v44 缓存。通用 Callable 事实持久化和更细磁盘记录仍开放，P3 尚未完成。证据见[Callable 工厂依赖图验收](reports/callable-factory-dependency-graph-2026-09-15.md)。

2026-09-15 最新组合门禁：新增第三方扩展机器可读版本清单和隔离 Marketplace 安装器，CI 在 Linux、Windows 与 macOS 分别安装冻结版本并运行完整 Open Source Profile。门禁发现 Symfony Language Tools 0.20.2 会参与普通 PHP 声明 Rename 并返回 `The element can't be renamed.`；0.20.1 虽在本地相同组合通过，随后也在冻结版本的 Ubuntu CI 中产生相同拒绝。该扩展目前退出两个默认 Pack、受支持 Profile 和手动推荐清单，版本注册表明确标记为拒绝；上游提供可关闭的 Rename Provider 或稳定修复后必须重过三平台门禁。Marketplace 临时 429/5xx/网络中断采用最多五次有界重试；PHPUnit 的 PATH 命令先解析为平台绝对入口，再经隔离 PHP 代理脚本适配扩展要求的脚本路径契约，并使用 30 秒启动窗口。Safe Move 的 will 阶段冻结源文件并只复用已完成的索引，未就绪时在移动后从快照生成精确计划并提供约 20 秒协调窗口，无法形成计划则自动回滚文件操作。已规划路径的重复监控事件使用增量索引，快速反向移动不会被旧方向任务阻塞。提交 `4cd7530` 的 [CI 34894351400](https://github.com/sohophp/php-companion/actions/runs/34894351400) 18/18 成功：三系统 Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵全部通过。Windows 客户端连接 WSL Remote 与多小时真实项目会话仍开放。证据见[Open Source Profile 版本与 Provider 组合门禁](reports/open-source-profile-version-gate-2026-09-15.md)。

2026-09-15 最新稳定性增量：Ubuntu 打包 Extension Host 多次暴露 Explorer `Service → Contact` 文件已移动但 namespace 仍旧，证明 VS Code will-rename 参与者报错不会可靠取消移动。产品路径现让 `onWillRenameFiles` 冻结源文件并只使用已完成索引，移动后事件与文件状态观察器共享同一个最多 13 次、约 20 秒的串行协调任务；任务保留到 namespace、引用和保存完成且再次规划为空，无法形成精确计划则回滚文件。已规划移动的重复监控事件增量更新索引，快速反向移动会让旧任务立即退出。16 个组件 624 项、纯净打包 Extension Host 与当时包含八个冻结第三方扩展的诊断 Profile 均通过本地回归；该 Profile 随后因 Symfony 0.20.1 的 CI Rename 冲突收缩为七个受支持外部扩展。提交 `35773d5` 的历史 [CI 34873469728](https://github.com/sohophp/php-companion/actions/runs/34873469728) 15/15 成功；最终修正提交 `4cd7530` 的 [CI 34894351400](https://github.com/sohophp/php-companion/actions/runs/34894351400) 进一步以 18/18 关闭三平台七扩展组合。证据见[Safe Move 移动后收敛验收](reports/safe-move-reconciliation-retry-2026-09-15.md)及[Open Source Profile 版本与 Provider 组合门禁](reports/open-source-profile-version-gate-2026-09-15.md)。

2026-09-14 最新 P3 增量：Language Server 持久缓存升级到 v44，把每文件 Symfony Controller/Twig 上下文和 Doctrine repository/association 事实与 schema 72 语义快照放入同一 SHA-256 校验封装；恢复时验证 URI、范围、类型结构和内容，Twig interop 位置更新为当前 generation。热启动不再为这些事实重新解析 PHP。开放文档与磁盘缓存源不同会拒绝恢复，未保存内容也不会写入以磁盘元数据为键的缓存。10,000 文件 Linux x64 基准冷索引 16,932.74 ms、热恢复 3,897.67 ms，恢复 10,000/10,000，PHP 与框架重分析均为 0；损坏单个条目只重建 1 个文件。16 个组件 624 项、根扩展 33 项测试，16 个隔离 tarball、三份 VSIX 内容及 VS Code 1.137.0 打包 Extension Host 均通过；提交 `8576cee` 的 [CI 34861958814](https://github.com/sohophp/php-companion/actions/runs/34861958814) 15/15 成功，三平台热启动均恢复 1,000/1,000、PHP 与框架重分析为 0。Callable 调用依赖、Symfony YAML/编译容器外部事实及更细粒度磁盘记录仍未完成，P3 保持开放。证据见[框架派生事实持久化验收](reports/persistent-framework-facts-2026-09-14.md)。

2026-09-14 最新 P3 增量：`@php-companion/index` 新增按文档原子替换的有界反向依赖图；schema 72 语义快照把解析文件、引用候选和类型继承依赖作为独立层持久化，并在恢复前验证派生内容与解析文件一致。Language Server 缓存升级到 v43。10,000 文件 Linux x64 基准中，冷索引 16,977.41 ms，热启动 4,050.65 ms，全部 10,000 个文件从快照恢复且没有重新解析；篡改单个结构合法的引用层后只重建该 1 个文件。Linux x64、Windows x64 和 macOS arm64 的 1,000 文件 CI 均恢复 1,000/1,000、重解析 0，并通过传递依赖失效与单文件损坏重建；对应提交的 15 个 CI 任务全部通过。Callable 调用依赖、框架派生事实和更细的声明/方法体磁盘拆分仍未完成，P3 总项保持开放。证据见[持久语义分层与派生依赖图验收](reports/persistent-semantic-layers-2026-09-14.md)。

2026-09-14 最新真实项目 Alpha 门禁：新增可重复的 `audit:workspace`，只读加载 Composer 项目与依赖，要求项目源码完整、确定性抽样类型声明至少 90% 可唯一解析、References P95 不超过 150 ms，并可用版本化 JSON Oracle 验证真实补全与 Definition。Winstar 当前 2,218 个项目 PHP 文件全部进入索引，100/100 个抽样声明解析成功，References P95 12.17 ms，`BlogPostsEntityRepository` 经原生 `assert` 后补全 `createQueryBuilder` 并跳到 Doctrine `EntityRepository.php`；CoreRepo 的 1,137 个 PHP 7.2 项目文件同样完整，100/100 成功，P95 21.17 ms，`Language::getUrlCode()` 精确跳到项目声明。两者依赖均按 10,000 文件预算截断，所以不据此声称全依赖完整。当时无 Intelephense 的 Linux/WSL 隔离 Profile 也完成通用组合回归，但尚未包含后来加入的声明级 F2 场景；2026-09-15 的版本门禁已经取代该组合结论。证据见[真实项目 Alpha 门禁报告](reports/real-project-alpha-gate-2026-09-14.md)。Windows + WSL Remote 与多小时真实项目会话仍待完成。

2026-09-14 最新增量：`@php-companion/index` 新增有界、原子替换的文档键倒排表；`@php-companion/semantic` 为类型、全局函数、全局常量和静态成员维护声明及使用候选，并让 References/Rename 只在候选文件内执行原有精确语义解析。更新、删除、快照恢复均同步 postings，超限文档进入保守回退。10,000 文件、200 轮最终本机基准中，类型引用 P95 为 0.17 ms、成员引用 P95 为 0.57 ms，均低于 150 ms 热查询预算；无无关命中、替换后陈旧命中或恢复遗漏。十六个组件 619 项、根扩展 33 项，共 652 项测试通过；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 打包宿主均通过。证据见[增量引用候选索引报告](reports/incremental-reference-candidate-index-2026-09-14.md)。解析后引用事实持久化、完整派生依赖图和分层磁盘格式仍待完成，因此 P3 总项保持开放。

2026-09-14 最新增量：`@php-companion/semantic` 的更新结果已形成声明/实现/无语义变化三层契约，并返回实际变化的 callable/type 身份。文件末尾 trivia 不再清除工厂摘要；单个函数体变化只失效对应 callable，构造器和 Property Hook 实现变化会沿受影响类型层级失效构造摘要，声明变化仍保守扩大到公开表面。Language Server 据此让控制器模板上下文跟随实现体更新，同时只在声明层变化时重建 Doctrine 与 Symfony service 声明事实。引用倒排表、完整派生依赖图和分层磁盘格式尚未完成，因此 P3 总项保持开放。证据见[分层语义更新报告](reports/layered-semantic-updates-2026-09-14.md)。

2026-09-14 最新增量：新增可独立发布的 `@php-companion/runtime-probe`，用参数数组直接启动目标 PHP CLI，在 3 秒和 128 KiB 边界内读取版本、SAPI、已加载扩展及 INI 来源，不执行 shell、项目 autoloader 或 Symfony Kernel。探测只在首次打开 PHP 文件或主动重新检测后发生；服务端再次验证载荷，并只接受与目标 PHP 次版本一致的结果。成功探测到缺少 DOM、Filter、mbstring、PDO、SimpleXML、XML Parser、XMLReader 或 XMLWriter 时，会按 workspace folder/嵌套 Composer 根裁剪内建符号并发布 `php.extension.unavailable`，诊断结构区分设置、Composer 和运行时来源；失败、超时、畸形输出、版本不匹配、项目/polyfill 定义继续保持 unknown。十六个组件 616 项、根扩展 33 项，共 649 项测试通过；本机六个 PHP 次版本、十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 打包宿主均通过。验证证据见[PHP 运行时扩展探测报告](reports/php-runtime-extension-probe-2026-09-14.md)。其余扩展目录和完整 P3 环境能力仍待逐项完成。

PHP 8.4 Property Hook 继承与引用边界证据见 [PHP 8.4 Property Hook 继承与引用边界验收](reports/php84-property-hook-inheritance-2026-09-13.md)；基础读写模型见 [PHP 8.4 Property Hooks 验收报告](reports/php84-property-hooks-2026-09-13.md)。

R4/F13 的 Linux x64 连续编辑、取消、重启与损坏缓存恢复证据见 [长时间编辑与恢复门禁](reports/editing-resilience-linux-x64-2026-09-13.md)；当前候选的 Linux、Windows 与 macOS CI 证据见 [跨平台候选验收报告](reports/cross-platform-candidate-2026-09-14.md)；class/interface/trait/enum 声明级 F2 证据见 [声明级 F2 类型重命名验收](reports/declaration-f2-rename-2026-09-14.md)。

XML 文档扩展已选用仍在维护的 `redhat.vscode-xml`，并加入 Open Source Pack 与 Recommended Pack；`DotJoshJohnson.xml` 因长期未发布且依赖已废弃、无法获得安全修复的 `xmldom` 而拒绝。依据与能力边界见 [XML 扩展选型](reports/xml-extension-selection-2026-09-14.md)。

方法族 Rename 已覆盖接收者类型可完全证明的两元素数组 callable，并保持未知或复杂 callable 的整体拒绝门槛；证据见 [数组 callable 方法 Rename 验收](reports/array-callable-method-rename-2026-09-14.md)。

PHP 扩展符号选择已落地首个精准子集：workspace folder 显式配置与 Composer `config.platform` 中明确隐藏的扩展会共同裁剪 DOM、Filter、mbstring、PDO、SimpleXML、XML Parser、XMLReader 与 XMLWriter，配置和 Composer 文件变化可实时恢复或移除；缺少 `require.ext-*` 不作缺失推断。证据见 [PHP 扩展能力选择验收](reports/php-extension-availability-2026-09-14.md)。

2026-09-14 PHP 扩展能力选择封板：首批八个独立审计扩展组已进入 `language-spec` 的机器可读选择契约，`project` 只接受 Composer platform 明确为 `false` 的禁用事实，VS Code adapter 按 workspace folder 向多根 Language Server 发送完整快照；设置切换与 Composer 文件更新通过真实 stdio 验证。通用配置变化不再无条件重建项目索引。十五个组件 610 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 内容检查及 VS Code 1.137.0 打包 Extension Host 均通过。完整边界与产物哈希见 [PHP 扩展能力选择验收](reports/php-extension-availability-2026-09-14.md)。

2026-09-14 PHP 扩展不可用诊断封板：八组已审计扩展的类型、函数和常量在明确禁用时发布 `php.extension.unavailable`，支持直接名称与 `use` 别名，区分 workspace 设置和 Composer platform 来源；项目/polyfill 同身份、未知扩展、未审计符号和不完整索引保持静默。十五个组件 611 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及 VS Code 1.137.0 打包 Extension Host 本地门禁通过。证据见 [PHP 扩展不可用诊断验收](reports/php-extension-unavailable-diagnostics-2026-09-14.md)。

PHP 8.5 final 提升属性的版本、解析和继承语义证据见 [PHP 8.5 final 提升属性验收](reports/php85-final-property-promotion-2026-09-14.md)；静态属性 set 可见性证据见 [PHP 8.5 静态属性非对称可见性验收](reports/php85-static-asymmetric-visibility-2026-09-14.md)。

PHP 8.5 常量表达式 Closure 与 first-class callable 证据见 [PHP 8.5 常量表达式 callable 验收](reports/php85-constant-expression-callables-2026-09-14.md)。

PHP 8.5 属性 `#[Override]` 的版本、继承与 Trait 组合证据见 [PHP 8.5 属性 Override 验收](reports/php85-override-properties-2026-09-14.md)。

PHP 8.5 `#[NoDiscard]`、`(void)` 与重要返回值诊断证据见 [PHP 8.5 NoDiscard 验收](reports/php85-no-discard-2026-09-14.md)。

PHP 8.4–8.5 `#[Deprecated]` 与 PHPDoc 弃用使用/目标诊断证据见 [Deprecated 符号与目标诊断验收](reports/deprecated-symbol-uses-2026-09-14.md)。

PHP 8.3 动态类常量访问证据见 [PHP 8.3 动态类常量访问报告](reports/php83-dynamic-class-constant-flow-2026-09-13.md)；PHP 8.5 clone-with 类型传播证据见 [PHP 8.5 Clone With 类型传播报告](reports/php85-clone-with-type-flow-2026-09-13.md)；PHP 8.5 管道类型传播证据见 [PHP 8.5 Pipe 类型传播报告](reports/php85-pipe-type-flow-2026-09-13.md)；现代 `Dom\` 目录证据见 [现代 Dom 命名空间内建目录报告](reports/modern-dom-builtins-2026-09-13.md)；经典 DOM 目录证据见 [经典 DOM 内建目录报告](reports/classic-dom-builtins-2026-09-13.md)；XMLReader/XMLWriter 目录证据见 [XMLReader / XMLWriter 内建目录报告](reports/xml-reader-writer-builtins-2026-09-13.md)；XML Parser 目录证据见 [XML Parser 内建目录报告](reports/xml-parser-builtins-2026-09-13.md)；XML 基础目录证据见 [XML 基础内建目录报告](reports/xml-foundation-builtins-2026-09-13.md)；mbstring 完整目录证据见 [mbstring 内建目录报告](reports/mbstring-builtins-2026-09-13.md)；Reflection 高频核心证据见 [Reflection 核心内建报告](reports/reflection-core-builtins-2026-09-13.md)；最新 PHP SPL 函数完整目录证据见 [SPL 函数完整内建报告](reports/spl-functions-builtins-2026-09-12.md)；PHP Strings 完整目录证据见 [Strings 完整内建报告](reports/strings-complete-builtins-2026-09-12.md)；PHP Filesystem 完整目录证据见 [Filesystem 完整内建报告](reports/filesystem-complete-builtins-2026-09-12.md)；元数据、权限与链接的运行时细节见 [文件系统元数据内建报告](reports/filesystem-metadata-builtins-2026-09-12.md)；PHP Program Execution 证据见 [程序执行内建报告](reports/program-execution-builtins-2026-09-12.md)；PHP Directory 证据见 [目录内建报告](reports/directory-builtins-2026-09-12.md)；PHP Network 证据见 [网络内建目录报告](reports/network-builtins-2026-09-12.md)；PHP Session Handling 证据见 [会话内建报告](reports/session-builtins-2026-09-12.md)；PHP Function Handling 证据见 [函数处理内建目录报告](reports/function-handling-builtins-2026-09-12.md)；PHP Output Control 证据见 [输出控制内建目录报告](reports/output-control-builtins-2026-09-12.md)；PHP Error Handling 证据见 [错误处理内建目录报告](reports/error-handling-builtins-2026-09-12.md)；Symfony Language Tools 0.20.1 的真实 Winstar 复核见 [Symfony 0.20.1 复核报告](reports/symfony-language-tools-0.20.1-recheck-2026-09-12.md)；PHP Options/Info 环境与运行时证据见 [环境与运行时目录报告](reports/runtime-environment-builtins-2026-09-11.md)；PHP 配置证据见 [PHP 配置与运行时信息报告](reports/runtime-configuration-builtins-2026-09-11.md)；运行时自省证据见 [运行时符号与扩展自省报告](reports/runtime-introspection-builtins-2026-09-11.md)；Variable Handling 证据见 [Variable Handling 内建目录报告](reports/variable-handling-builtins-2026-09-11.md)；Math 证据见 [Math 内建目录报告](reports/math-builtins-2026-09-11.md)；PCRE 证据见 [PCRE 内建目录报告](reports/pcre-builtins-2026-09-11.md)；Filter 证据见 [Filter 内建目录报告](reports/filter-builtins-2026-09-10.md)；安全函数证据见 [Password/Hash/随机数内建目录报告](reports/security-builtins-2026-09-10.md)；局部变量诊断证据见 [确定未定义变量诊断报告](reports/definitely-undefined-variable-2026-09-10.md)；未解析符号证据见 [未解析函数与常量诊断报告](reports/unresolved-function-constant-diagnostics-2026-09-10.md)；完整名称绑定证据见 [限定名称与常量大小写报告](reports/qualified-name-and-constant-case-2026-09-10.md)；补全排序证据见 [函数和命名空间常量补全排序报告](reports/function-constant-completion-ranking-2026-09-10.md)；上下文闭包证据见 [PHPDoc callable 上下文闭包类型报告](reports/contextual-closure-typing-2026-09-10.md)。下方按时间追加的旧记录保留当时的验证边界。

SPL 目录迭代器证据见 [SPL 目录迭代器内建报告](reports/spl-directory-iterators-builtins-2026-09-13.md)；SPL 高级迭代器证据见 [SPL 高级迭代器内建报告](reports/spl-advanced-iterators-builtins-2026-09-13.md)；基础迭代器适配器证据见 [SPL 迭代器适配器内建报告](reports/spl-iterator-adapters-builtins-2026-09-13.md)；MultipleIterator 证据见 [MultipleIterator 内建报告](reports/multiple-iterator-builtins-2026-09-13.md)；SPL Observer/Subject 证据见 [SPL Observer / Subject 内建报告](reports/spl-observer-builtins-2026-09-13.md)；SPL 堆与优先队列证据见 [SPL Heap / PriorityQueue 内建报告](reports/spl-heaps-builtins-2026-09-13.md)；SPL 线性容器证据见 [SplDoublyLinkedList / SplQueue / SplStack 内建报告](reports/spl-linear-collections-builtins-2026-09-13.md)；SPL 对象/固定数组容器证据见 [SplObjectStorage / SplFixedArray 内建报告](reports/spl-object-collections-builtins-2026-09-13.md)；SPL 数组容器证据见 [ArrayObject / ArrayIterator 内建报告](reports/spl-array-collections-builtins-2026-09-13.md)。

2026-09-14 Deprecated 诊断封板：PHPDoc `@deprecated` 与按 namespace/import 精确解析的内建 `#[Deprecated]` 进入统一 `php.symbol.deprecated` warning，并携带标准 LSP Deprecated tag。唯一函数、方法、构造器、类常量、Enum case、Property Hook get/set，以及 PHP 8.5 Trait use/全局常量按实际声明与目标版本报告；first-class callable、未标记覆写、自定义同名 Attribute、动态和歧义目标保持静默。静态 `message`/`since` 进入文案，版本化内建 `utf8_encode()` 与 `SplObjectStorage::attach()` 已通过真实 stdio 验证。原生声明目标额外覆盖合法闭包/箭头函数、PHP 8.5 Trait/全局常量门槛，并拒绝类、接口、Enum、普通属性、参数和匿名类；PHP 8.5 同目标 DelayedTargetValidation 会推迟非法目标检查，PHP 8.4 仍拒绝。十五个组件 606 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及 VS Code 1.137.0 打包 Extension Host 门禁均通过；使用诊断提交 `db52c3e` 的 [CI 34793080024](https://github.com/sohophp/php-companion/actions/runs/34793080024) 已通过跨平台及 PHP 7.2–8.5 矩阵。证据见 [Deprecated 符号与目标诊断验收](reports/deprecated-symbol-uses-2026-09-14.md)。

2026-09-14 PHP 8.5 `#[NoDiscard]` 封板：解析器区分整条表达式语句和 `for` 初始化/更新列表中的真正丢弃、赋值或其他表达式消费，以及 `(void)` 明确忽略；semantic 仅对唯一解析且实参兼容的用户函数/方法、Trait 实际声明和版本化原生声明发布 `php.return-value.discarded`。覆写方法不会继承 Attribute，Trait 方法会保留；字符串 `message` 进入提示。显式 void/never、无返回值 magic method，以及 void/never 闭包与箭头函数获得返回约束错误；Property Hook、类型、属性、参数、常量和匿名类等全部非法目标获得独立目标错误，同目标 DelayedTargetValidation 可按 PHP 8.5 规则推迟目标检查。经变量调用的闭包丢弃数据流仍保持 unknown。PHP 8.4 及更低不启用 NoDiscard 行为，`(void)` 单独按 PHP 8.5 版本拒绝，PHP 8.5 的 `for` 条件仍保留语法错误。九个 DateTimeImmutable 修改方法已按 PHP 8.5.9 Reflection 加入原生 Attribute。提交 `e4a42a8` 的 [CI 34790640137](https://github.com/sohophp/php-companion/actions/runs/34790640137) 通过 Linux、Windows、macOS 质量与 Extension Host 门禁及 PHP 7.2–8.5 集成矩阵；完整目标增量的最终门禁待本轮封板记录。完整证据见 [PHP 8.5 NoDiscard 验收](reports/php85-no-discard-2026-09-14.md)。

2026-09-14 PHP 8.5 属性 `#[Override]` 封板：内建 Attribute 经 namespace/import 精确解析后，直接类属性、接口属性、构造器提升属性和匿名类属性会在完整继承图中查找同名非私有祖先属性；缺失匹配时发布 `php.attribute.invalid-override-property`。Trait 声明在 PHP 8.5 单独保持静默，组合进类后按消费类的父类/接口契约检查，嵌套 Trait 同样覆盖；PHP 8.0–8.4 目标只发布属性目标版本诊断，PHP 7.x 复用 Attribute 自身的版本诊断，均不级联缺失匹配错误。PHP 8.4.23/8.5.9 运行时、semantic 和真实 stdio LSP 正反例均通过；十五个组件 596 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及打包 Extension Host 均通过。运行时、产物哈希与完整证据见 [PHP 8.5 属性 Override 验收](reports/php85-override-properties-2026-09-14.md)。

2026-09-14 PHP 8.5 常量表达式 callable 封板：Attribute、属性/参数默认值、全局/类常量中的 static 无捕获 Closure、直接函数和静态方法 first-class callable 具备 8.4/8.5 版本边界；arrow、非 static、`use` 捕获及动态 callable 在 8.5 获得稳定错误。parser 区分 Closure 获取与调用，semantic 返回 `Closure`、保留 Definition，并消除缺少必填参数误报；参数类型错误会显示实际 `Closure`。PHP 8.4.23/8.5.9 运行时、版本分析、semantic 和真实 stdio LSP 正反例均通过。十五个组件 594 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及打包 Extension Host 均通过。详见 [PHP 8.5 常量表达式 callable 验收](reports/php85-constant-expression-callables-2026-09-14.md)。

2026-09-14 PHP 8.5 静态属性非对称可见性封板：静态属性访问现在与实例属性共用直接赋值、复合赋值、自增减及读取上下文识别，按 set 可见性允许声明类内部写入并拒绝子类或全局写入，公开读取保持可用。`php.member.inaccessible` 文案会区分 read/write、static 和 `$property` 身份。PHP 8.4.23 与 PHP 8.5.9 的真实 lint/执行结果验证版本和运行时边界，parser、semantic、版本分析及真实 stdio LSP 正反例均通过。十五个组件 591 项、根扩展 33 项、十五个隔离 tarball 和三份 VSIX 内容校验均成功。详见 [PHP 8.5 静态属性非对称可见性验收](reports/php85-static-asymmetric-visibility-2026-09-14.md)。

2026-09-14 PHP 8.5 final 提升属性封板：解析器会从当前语法包的可恢复节点中保留 `final` 属性事实，并在语法包以后提供正式节点时直接消费；PHP 8.4 目标产生版本诊断且不级联属性覆写错误，PHP 8.5 目标接受，同一事实进入完整索引下的继承覆写检查。PHP 8.4.23 与 PHP 8.5.9 真实 lint 分别验证拒绝/接受边界，PHP 8.5 同时验证子类覆写被运行时拒绝。十五个组件 590 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及打包 Extension Host 均通过。详见 [PHP 8.5 final 提升属性验收](reports/php85-final-property-promotion-2026-09-14.md)。

2026-09-13 最新封板：PHP 8.4 Property Hook 继承已覆盖完整已索引层级中的接口/抽象属性要求、get 协变、set 逆变、双向不变、独立 hook 继承、final 属性/final hook 与 `private(set)` 隐式 final；有效 `&get` 会控制数组下标修改、直接取引用、唯一解析按引用实参、属性 foreach 引用和对象 foreach 引用是否合法，向 hooked property 赋引用始终拒绝。动态或歧义目标保持 unknown。非法抽象/接口声明、virtual 默认值及 backed `&get`/`set` 组合均有稳定诊断。Semantic snapshot 升至 schema 71，持久缓存升至 v42。十五个组件 590 项、根扩展 33 项，共 623 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮继承与引用边界报告。

2026-09-14 跨平台候选门禁：提交 `c9adcf7` 的 [CI 34771375887](https://github.com/sohophp/php-companion/actions/runs/34771375887) 全部通过。Linux x64、Windows x64 与 macOS arm64 均完成 quality、十五个组件 tarball 仓库外安装、500 次编辑恢复基准、三份 VSIX 构建与内容校验；三个系统上的 VS Code 1.137.0 打包主扩展 Extension Host 均通过。PHP 7.2–8.5 运行时矩阵全部通过。三系统基准均为 0 次陈旧补全，缓存损坏恢复和重启后补全恢复通过，详细指标及原始 JSON 见 [跨平台候选验收报告](reports/cross-platform-candidate-2026-09-14.md)。随后 2026-09-15 的组合门禁补齐三系统冻结第三方 Profile；WSL Remote 自动矩阵和多小时真实项目会话仍待最终系统矩阵，因此 F13 总项保持开放。

2026-09-14 声明级 F2 封板：class、interface、trait、enum 均可从声明发起 Rename，在一次可撤销的工作区编辑中同步规范 PSR-4 文件名、声明、跨文件 import/类型引用、PHPDoc 和静态访问；普通字符串、显式 alias、大小写不同的 Enum case 与非规范重复声明保持不变。VS Code 扩展通过 `onWillRenameFiles` 将旧声明文件编辑并入文件操作；独立 LSP 客户端仍获得标准有序 `documentChanges`。同 namespace 纯文件名变化不再触发 Safe Move 的重复规划，四种类型的 Apply/Undo/Redo 均无通用错误提示。十五个组件 590 项、根扩展 33 项、十五个独立 tarball、源码/兼容/打包 Extension Host 与三份 VSIX 校验均在 Linux x64 通过；提交 `aa7c2b6` 的 [CI 34778678115](https://github.com/sohophp/php-companion/actions/runs/34778678115) 进一步通过 Linux x64、Windows x64、macOS arm64 的质量和打包 Extension Host 门禁，以及 PHP 7.2–8.5 运行时矩阵。详见 [声明级 F2 类型重命名验收](reports/declaration-f2-rename-2026-09-14.md)。

2026-09-13 R4/F13 Linux x64 门禁：真实 stdio Language Server 完成 100 次预热和 1,000 次交替类型文档更新，陈旧补全为 0；更新到诊断 P95 3.38 ms，热补全 P95 1.34 ms，立即取消 1.06 ms，最终 RSS 比基线增加 3.13 MiB。实际 semantic cache 被破坏后，重启进程明确报告并重建缓存，精确补全恢复。脚本已增加 Windows/macOS RSS 采样并接入三系统 CI。WSL Remote 和多小时真实项目会话仍待系统矩阵，因此 F13 总项保持开放。

2026-09-13 前一封板：PHP 8.4 Property Hooks 已结构化记录 hook、局部 `$this`/`$value`、backed/virtual、get/set 能力、setter 写入类型及非对称写可见性；短 setter 按真实 PHP 规则写入 backing storage。Definition、直接与复合读写、静态/readonly hook、write-only virtual 非对称可见性及 PHP 8.3/8.4 版本边界均有正反例。Semantic snapshot 升至 schema 70，持久缓存升至 v41。十五个组件 588 项、根扩展 33 项，共 621 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见基础 Property Hooks 报告。

2026-09-13 最新封板：PHP 8.3 `Type::{$name}` 会从字符串字面量、未触碰局部字符串、唯一字符串常量或纯字符串拼接解析唯一可见类常量，并提供 Definition 与 literal 类型传播；动态、修改/提前读取、不可访问、歧义或无法求值的名称保持 unknown，低版本收到明确版本诊断。Semantic snapshot 升至 schema 69，持久缓存升至 v40。十五个组件 584 项、根扩展 33 项，共 617 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮动态类常量报告。

2026-09-13 最新封板：普通 clone 与 PHP 8.5 clone-with 在操作数为可证明非 nullable 对象，且简单属性数组的声明身份、当前作用域可写性和值类型全部兼容时保留对象、Union、Intersection 与泛型身份，并进入 Completion 与 Definition；动态键、复杂值、缺失/不可访问属性和未知操作数保持 unknown。十五个组件 581 项、根扩展 33 项，共 614 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮 Clone With 报告。

2026-09-13 最新封板：PHP 8.5 `|>` 通过可证明兼容的单参数函数、静态方法、实例方法和显式闭包逐段传播返回类型，并进入成员补全与 Definition；按引用、动态、歧义、未绑定泛型、不兼容、`mixed` 和 `void` 阶段保持 unknown。未知成员不再因名称匹配当前命名空间类型产生假 Definition。十五个组件 579 项、根扩展 33 项，共 612 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮 Pipe 报告。

2026-09-13 最新封板：PHP 8.4–8.5 现代 `Dom\` 的 16 个命名空间常量、28 个类型、168/171 个显式方法和 85/89 个显式属性已进入版本化规格；包含 enum 自动成员时与 PHP 8.4.23、8.5.9 Reflection 的 171/174 个方法和 87/91 个属性一致。当前覆盖 HTML5/XML 文档工厂、selector、XPath、TokenList、集合、命名空间信息、SimpleXML/经典 DOM 导入与 PHP 8.5 新成员；同时修复命名空间内完全限定函数签名，并缓存确定的 assertion 推断子问题以消除大型 fixture 的指数重复。十五个组件 577 项、根扩展 33 项，共 610 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮现代 Dom 报告。

2026-09-13 最新封板：经典 DOM 的 45 个全局常量、PHP 7 的 20 个类型/111 个方法、PHP 8.0–8.2 的 22 个类型/122–126 个方法/87 个虚拟属性、PHP 8.3–8.5 的 22 个类型/137–139 个方法/93 个属性已进入版本化规格。当前覆盖 PHP 7 旧成员和 7.4 可选参数、PHP 8.0 mixin、8.1 tentative returns、8.2 SimpleXML 导入联合返回、8.3 WHATWG 成员，以及 8.4 DOMNode 位置常量与 XPath API；断言驱动的嵌套签名推断增加四层精度边界，消除大型 fixture 的组合爆炸。十五个组件 575 项、根扩展 33 项，共 608 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮经典 DOM 报告。

2026-09-13 最新封板：XMLReader 的 22 个常量、14 个属性和 25/28 个方法，以及 XMLWriter 的 42 个过程式函数、42/45 个对象方法已进入 PHP 7.2–8.5 版本化规格与真实 fixture。当前覆盖 PHP 7 历史参数/resource、PHP 8.1 tentative returns 与类型属性、PHP 8.3 true close、PHP 8.4 typed constants 和六个现代静态工厂。十五个组件 573 项、根扩展 33 项，共 606 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮 XMLReader/XMLWriter 报告。

2026-09-13 最新封板：XML Parser 的 22 个函数及 27/28 个常量已进入 PHP 7.2–8.5 版本化规格和真实扩展 fixture。当前覆盖 PHP 7 resource/历史参数、PHP 8.0 XMLParser 对象、8.1 结构解析返回、8.2 literal-true handler、8.3 bool option、8.4 大文档选项和原生 handler 联合类型。十五个组件 571 项、根扩展 33 项，共 604 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮 XML Parser 报告。

2026-09-13 最新封板：PHP 7.2–8.5 libxml 与 SimpleXML 已进入独立版本化规格。当前覆盖稳定 libxml 常量、错误对象与列表、external entity loader 的 8.2/8.5 边界、SimpleXML 工厂与完整公开成员，并新增无模板命名 iterable 的固定键值投影，使 SimpleXML foreach 子节点保持对象身份。十五个组件 571 项、根扩展 33 项，共 604 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。构建相关常量、工厂返回自定义子类推导边界及产物校验值见本轮 XML 报告。

2026-09-13 最新封板：PHP 7.2–8.5 mbstring 完整可调用目录与版本化常量已进入语言规范、Language Server 和真实扩展 fixture。生成目录已与本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 反射结果逐项比较，无漏项、误加项或重复声明；PHP 7.3/8.0 边界由官方源码和手册交叉确认。十五个组件 568 项、根扩展 33 项，共 601 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值和扩展裁剪边界见本轮 mbstring 报告。

2026-09-13 最新封板：PHP 7.2–8.5 Reflection 高频核心、类常量与 Enum 反射已进入最终打包产物；`ReflectionClass<T>` 从可证明类名/对象保留三个实例工厂的具体返回，动态字符串保持 unknown。方法/属性/参数/Attribute/Enum case 集合保留元素类型，版本化签名、补全与内建导航由真实 Extension Host 验证。十五个组件 566 项、根扩展 33 项，共 599 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值和限制见本轮 Reflection 报告。

2026-09-13 最新封板：`DirectoryIterator`、`FilesystemIterator`、`RecursiveDirectoryIterator` 与 `GlobIterator` 的版本化声明、迭代契约、可变 current mode 安全 Union 和 PHP 8.1 flags 数值边界已进入最终打包产物；十五个组件 563 项、根扩展 33 项，共 596 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮目录迭代器报告。

2026-09-13 前一封板：六种版本化泛型 SPL 高级迭代器、转换安全 Union 与模板替换后的 Union 去重已进入最终打包产物；十五个组件 561 项、根扩展 33 项，共 594 项测试通过。多扩展资源管理器 Safe Move 在完整索引前冻结旧源与目标状态，已消除移动先于规划完成时的旧 URI 丢失竞态。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮高级迭代器报告。

2026-09-13 前一封板：十一种版本化泛型 SPL 迭代器适配器、嵌套泛型对象与继承 `static|null` 调用者模板传播已进入最终打包产物；十五个组件 558 项、根扩展 33 项，共 591 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮适配器报告。

2026-09-13 最新封板：版本化泛型 `MultipleIterator<TInnerKey,TValue>`、可变 flags 的安全键值数组、PHP 7/8.0 失败返回及唯一泛型 iterable 父级投影已进入最终打包产物；十五个组件 554 项、根扩展 33 项，共 587 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮 MultipleIterator 报告。

2026-09-13 前一封板：版本化 `SplObserver` / `SplSubject` 完整接口、PHP 7.2/7.4 参数名边界和 PHP 8.1 tentative `void` 已进入最终打包产物；十五个组件 550 项、根扩展 33 项，共 583 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮 Observer / Subject 报告。

2026-09-13 前一封板：完整泛型 `SplHeap` / `SplMinHeap` / `SplMaxHeap` / `SplPriorityQueue` 规格、跨父类模板传播与可变 extract flags 的安全 Union 已进入最终打包产物；十五个组件 548 项、根扩展 33 项，共 581 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮 Heap / PriorityQueue 报告。

2026-09-13 前一封板：完整泛型 `SplDoublyLinkedList` / `SplQueue` / `SplStack` 规格与跨父类模板传播已进入最终打包产物；十五个组件 546 项、根扩展 33 项，共 579 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮线性容器报告。

2026-09-13 前一封板：完整泛型 `SplObjectStorage` / `SplFixedArray` 规格与对象数组静态工厂模板反推已进入最终打包产物；十五个组件 544 项、根扩展 33 项，共 577 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见对象集合报告。

2026-09-13 前一封板：完整 `ArrayObject` / `ArrayIterator` 规格与 receiver template Signature Help 已进入最终打包产物；十五个组件 542 项、根扩展 33 项，共 575 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与 Open Source Profile 均通过，冻结第三方目录的 1,371 个文件哈希不变。产物校验值和限制见数组容器报告。

2026-09-12 最新封板：`SplFileInfo`、`SplFileObject` 与 `SplTempFileObject` 已进入版本化共享规格；十五个组件 540 项、根扩展 33 项，共 573 项测试通过。TypeScript、ESLint、十五个真实 tarball、三份 VSIX 内容检查，以及 VS Code 1.137.0 的纯净与 Open Source Profile 最终打包宿主均通过；冻结开源目录的 1,371 个文件哈希不变。当前候选哈希及限制见 [SPL 文件对象内建报告](reports/spl-file-objects-builtins-2026-09-12.md)。

## 已完成

- [x] 开发目标、R0–R4 路线、P0–P9 工程任务、最终验收和组件发布规则成文。
- [x] PHP 7.2–8.5 Reflection 高频核心进入共享规格：类/对象、函数/方法、属性、参数、Named/Union/Intersection type、Attribute、类常量与 Enum 反射按版本生成；`ReflectionClass<T>` 从可证明的 class-string/对象构造实参保留三个实例工厂的具体返回，动态名称保持 unknown；集合元素进入 foreach 补全、签名和 Definition，旧 export、modifier 值、tentative returns、readonly、lazy object、property hook 与 mangled name 边界均有正反例。
- [x] PHP SPL 官方 15 项函数按 PHP 7.2–8.5 完整生成；类关系查询保留 `array<class-string,class-string>|false`，autoload 队列保留 callable list，iterator callback/args、对象 hash/id、PHP 7/8 参数名与原生返回、PHP 8.0 返回收窄、PHP 8.2 数组输入进入 Signature Help、返回传播与 Definition。PHP 8.5 `spl_autoload_unregister('spl_autoload_call')` 的调用形状弃用保持显式边界，不错误弃用整个函数。
- [x] `SplFileInfo`、`SplFileObject`、`SplTempFileObject` 按 PHP 7.2–8.5 生成构造器、继承成员、文件/CSV 失败 Union、固定 CSV 控制数组 shape 和 iterator 契约；PHP 7 `fgetss` 弃用/移除、PHP 8 参数名、PHP 8.1 CSV EOL 与 PHP 8.5 nullable write length 进入 Signature Help、返回传播与 Definition。
- [x] `ArrayObject<TKey,TValue>` 与 `ArrayIterator<TKey,TValue>` 的完整公开成员、常量、继承接口和 PHP 7.2–8.5 签名边界进入共享规格；成员 Signature Help 保留接收者模板实参，`getArrayCopy()`、`getIterator()`、`offsetGet()`、`current()` 继续驱动局部赋值、foreach、成员补全与 Definition。PHP 7.4 magic serialization、PHP 8 参数、PHP 8.2 排序 `true` 和 PHP 8.4 typed constants 均按版本选择。
- [x] `SplObjectStorage<TObject,TInfo>` 与 `SplFixedArray<TValue>` 的完整公开成员、接口和 PHP 7.2–8.5 签名边界进入共享规格；对象键、可空附加信息和可空固定槽位可跨 offset、iterator、数组转换、局部赋值、foreach、补全与 Definition 传播。`fromArray([new Item()])` 可安全反推静态 callable 模板；PHP 7.4 magic serialization、PHP 8.0 IteratorAggregate、PHP 8.1 JSON、PHP 8.2 serialization、PHP 8.4 SeekableIterator/弃用及 PHP 8.5 alias 弃用均按版本选择。
- [x] `SplDoublyLinkedList<TValue>`、`SplQueue<TValue>` 与 `SplStack<TValue>` 的完整公开成员和继承关系进入共享规格；具体值类型可跨 Iterator、ArrayAccess、队列/栈继承成员、局部赋值、foreach、补全与 Definition 传播。PHP 7 插入操作 `true`、PHP 7.4 magic serialization、PHP 8 参数与 `void` 返回及 PHP 8.4 typed constants 均按版本选择。
- [x] `SplHeap<TValue>`、`SplMinHeap<TValue>`、`SplMaxHeap<TValue>` 与 `SplPriorityQueue<TValue,TPriority>` 的完整公开成员和继承关系进入共享规格；普通 heap 值跨继承、迭代、赋值、补全与 Definition 传播，priority queue 对可变 extract flags 保留 data/priority/both Union。PHP 7/8 compare 参数、PHP 7.4 debug、PHP 8.4 typed constants/literal `true` 与 PHP 8.5 serialization 均按版本选择。
- [x] `SplObserver` 与 `SplSubject` 的完整接口进入共享规格、Signature Help 与 Definition；PHP 7.2 旧 arginfo 参数名、PHP 7.4 现代参数名和 PHP 8.1 tentative `void` 按目标版本选择。
- [x] `MultipleIterator<TInnerKey,TValue>` 的完整公开成员和 flags 进入共享规格；可变 numeric/associative flags 使用安全 array-key 容器，`MIT_NEED_ANY` 允许结束的子迭代器产生 null。直接 `current()` 与 `foreach` 的嵌套数组读取可传播具体元素类型，歧义泛型父级保持 unknown；PHP 7/8.0 失败返回、PHP 8 参数、PHP 8.1 tentative 返回及 PHP 8.4 typed constants 按版本选择。
- [x] `IteratorIterator`、五种 filter/recursive filter、`LimitIterator`、`NoRewindIterator`、`InfiniteIterator`、`AppendIterator` 与 `EmptyIterator` 的公开成员、泛型父级和 PHP 7.2–8.5 签名进入共享规格。具体键值类型可穿过继承、foreach、递归子类和 append 的嵌套 iterator；`EmptyIterator` 保留 `never` 与 PHP 8.2 literal `false`。
- [x] `RecursiveIteratorIterator`、`CachingIterator`、`RecursiveCachingIterator`、`RegexIterator`、`RecursiveRegexIterator` 与 `RecursiveTreeIterator` 的完整成员、常量、泛型和 PHP 7.2–8.5 边界进入共享规格。递归及 cache 保留具体键值；Regex 的五种模式保留原值/string/array 安全 Union，Tree 的 bypass flags 保留原值/string 安全 Union。PHP 7 参数名、7.2 `setPostfix` arginfo、PHP 8 参数类型、PHP 8.1 tentative returns、PHP 8.4 typed constants 与 PHP 8.5 树构造联合类型分别选择。
- [x] `DirectoryIterator`、`FilesystemIterator`、`RecursiveDirectoryIterator` 与 `GlobIterator` 的完整公开成员、flags、继承接口和 PHP 7.2–8.5 边界进入共享规格。目录项与 recursive child 保留实际调用类；Filesystem 可变 current mode 保持 string、`SplFileInfo` 与 iterator 自身的安全 Union；PHP 7/8 参数名、PHP 8.1 tentative returns/flags 数值变化及 PHP 8.4 typed constants 分别选择。
- [x] PHP Strings 官方 103 项 callable union 按 PHP 7.2–8.5 完整生成；模式相关的 `count_chars`/`str_word_count`、CSV list、locale shape、string/array `substr_replace`、稳定常量及 PHP 7.4/8.0/8.2/8.3 版本边界进入 Signature Help、返回传播和 Definition。调用点直接标量字面量仅在重载排序阶段保留，避免污染一般表达式推断。
- [x] PHP Filesystem 官方可调用目录完整覆盖；流、CSV/INI、锁、seek/stat、sync、process-file、临时流、路径、元数据、权限、上传和链接函数均按 PHP 7.2–8.5 生成，稳定常量、resource、引用参数、list/shape 与失败返回进入 Signature Help、返回传播及 Definition。PHP 7 `fgetss`、PHP 8.1 sync/EOL 和 PHP 8.4 CSV escape 弃用边界均保留。
- [x] PHP Filesystem 元数据、权限、上传与链接的 33 项函数按 PHP 7.2–8.5 生成；`stat/lstat` 的完整混合键 shape、realpath cache entry shape、磁盘/元数据失败返回及 PHP 7/8 参数名已进入 Signature Help、返回传播与 Definition。平台、SAPI、权限与构建条件保持显式边界。
- [x] 默认静态 Symfony 模式的路由名称补全由自研服务器在可证明源码范围内接管：覆盖 YAML 与 Attribute 声明、目录/glob 导入、exclude、映射 namespace、具名参数、字符串转义、未保存 YAML 和外部运行时提供者所有权切换；环境、本地化及运行时生成路由明确交还 Symfony Language Tools 的运行时模式，不作静态猜测。源码测试和真实组合 Extension Host 均通过。
- [x] PHP 7.2–8.5 支持矩阵按解析、事实/语义和版本诊断分栏，避免把最新 grammar 的解析能力误报为目标版本支持。
- [x] PHP Error Handling 的 14 项函数与 18 项稳定常量按 PHP 7.2–8.5 生成；backtrace/error shape、handler callable、PHP 8.2/8.4 literal `true`、PHP 8.4 `E_ALL`/`E_STRICT` 和 PHP 8.5 handler 查询门槛已进入 Signature Help、返回传播与 Definition。共享 semantic 同时支持结构化 PHPDoc array 返回安全精化 `?array`。
- [x] PHP Output Control 的 16 项函数与 13/14 项常量按 PHP 7.2–8.5 生成；单层/完整 buffer status 条件 shape、内容与长度失败返回、handler callable/null、PHP 7/8 参数边界和 PHP 8.4 processed flag 已进入 Signature Help、返回传播与 Definition。
- [x] PHP Function Handling 结合既有自省函数覆盖全部 13 项 API；动态 callback 返回保持 `mixed`，参数 list、shutdown/tick callback、PHP 7/8 参数差异、PHP 8.0–8.2 shutdown 返回迁移，以及 PHP 7.2 弃用/PHP 8.0 移除的 `create_function` 已进入版本化 Signature Help 与 Definition。
- [x] PHP Session Handling 的 23 项函数、3 项状态常量、四个 handler 类型、save-handler 重载和 callback 契约按 PHP 7.2–8.5 生成；cookie shape 覆盖 PHP 7.3 `samesite` 与 PHP 8.5 `partitioned`，`session_status()` 经安全字面量 Union 收窄为 `0|1|2`。
- [x] PHP Network 的 37 项函数与 15 项稳定 DNS 常量按 PHP 7.2–8.5 生成；DNS/header/request/network-interface shape、socket 失败返回、response-code/cookie 重载，以及 PHP 7.3/8.2/8.4/8.5 的可用性、返回收窄、options 和弃用边界已进入 Signature Help、返回传播与 Definition。平台相关 `LOG_*` 值保持显式边界。
- [x] PHP Directory 的 9 项函数、3 项稳定排序常量与 `Directory` 类型按 PHP 7.2–8.5 生成；resource/list/false 返回、PHP 7/8 参数和方法差异、PHP 8.1 readonly 属性与 PHP 8.5 final 边界已进入 Signature Help、成员传播和 Definition。构建/SAPI 条件及平台相关路径/GLOB 常量保持显式边界。
- [x] PHP Program Execution 的 11 项函数按 PHP 7.2–8.5 生成；命令 output/exit-code 引用、process/pipe resource、descriptor/status shape、PHP 7.4 array command、PHP 8 参数名、PHP 8.2 passthru 返回与 PHP 8.3 cached 状态已进入 Signature Help、返回传播和 Definition。平台与权限能力保持显式边界。
- [x] pnpm monorepo 建立 language-spec、parser、phpdoc、project、index、type-system、interop、semantic-provider、semantic-provider-host、framework-symfony、framework-doctrine、semantic、refactor、language-server 与 testkit 十五个可独立打包组件。
- [x] `@php-companion/refactor` 提供带版本/内容前置条件的编辑计划和共享 Unicode PHP 标识符校验，拒绝越界、重叠与文件操作冲突；Language Server 的接口方法/构造函数生成、类型及成员 Rename，以及 PSR-4 Safe Move 和移动后协调均消费该编辑器无关契约。
- [x] 类型 Rename 已进入统一 semantic/Language Server 路径，可从声明、直接短名、全限定名或 import 目标等唯一解析使用点发起，使用标准 LSP `documentChanges` 和同一 EditPlan 更新类型声明、原生/PHPDoc/Attribute 引用、import 路径及严格匹配的 Composer PSR-4 文件名。显式 alias 的使用名保持稳定且不作为发起点；唯一规范声明存在时会忽略路径不匹配的陈旧重复声明。真实打包 Extension Host 已验证跨文件及文件操作的一次 Apply/Undo/Redo；旧 VS Code 类型 Rename 仅在自研服务器关闭的兼容模式中保留。
- [x] 默认自研服务器路径中的 Import Class、Optimize Imports、Paste Imports 与 Resolve Imports 已迁入统一 semantic/Language Server。Import 候选按唯一 Composer 规范声明筛选，重复或无规范唯一性的声明不提供；服务器生成单个或批量 import 编辑，名称冲突时显式 alias 与粘贴文本/当前使用点同步处理。复制元数据只携带已解析类型身份，手工 Resolve 只扫描结构化未解析类型。Optimize Imports 复用标准 `source.organizeImports`，支持 grouped/FQCN 排序、删除未使用项和按类型身份去重，保留预览与单步 Undo。旧 Import/Paste 实现只在自研服务器关闭时保留。
- [x] 默认 Safe Move 命令与资源管理器文件移动已迁入 semantic/Language Server。服务器按唯一 Composer PSR-4 路径验证源与目标，拒绝语法错误、声明冲突和未保存的相关文件，生成 namespace、import、FQCN 与已证明同 namespace 引用编辑；Explorer 移动后只刷新移动前冻结的受影响文件集合，再幂等收敛其他 PHP 插件可能留下的新旧重复 import。连续双向移动、命令 Apply/Undo/Redo 和真实打包 Extension Host 均通过。主类型/文件名诊断及 Rename File Quick Fix 同时迁入 LSP；适配层旧实现仅用于关闭自研服务器的兼容模式。
- [x] 唯一解析调用的 PHPDoc `callable(Service): Return` 契约可为无原生类型的 closure/arrow 参数提供上下文对象类型；位置与具名实参均精确映射，并统一驱动成员补全、Definition 和参数类型诊断。Callable 参数模板可从同一调用的其他已证明数组/集合实参唯一专门化，覆盖 `array_map(fn($item) => …, $items)` 的 callable/null 内建重载筛选；可证明的 arrow 主体，以及由有界顺序语句、嵌套 `if/elseif/else`、`try/catch/finally`、支持直接 `break;`/`break 1;` 汇入外层后续语句的 `switch` case 贯穿，以及支持直接 `break;`/`break 1;` 汇入外层后续语句的有界 `while/do/for/foreach` 循环组成、每条可继续路径最终到达可证明 `return` 的 closure 主体，会绑定 callable 返回模板，排除明确的 throw/exit 以及唯一解析且实参兼容的原生 never 调用终止路径，并把条件提前返回与最终返回合并为 Union，使映射结果进入补全、多目标 Definition 与参数诊断。返回遍历限制为 64 个节点并服从共享控制流深度预算；重载歧义、未绑定或冲突模板、任一未知返回、函数体仍可落空、没有任何可证明返回、循环内嵌套/多层 `break` 与 `continue`、其它尚未建模控制结构内的 return、yield/goto、未解析类型、unpack、引用/variadic callback 以及参数数量不符时保持 unknown。顶层 arrow function 的局部值分析同时增加语法根终止保护。
- [x] testkit 提供 UTF-16 标记 fixture、分片 LSP framing、PHP 7.2–8.5 代表样例、性能分位统计和冻结 R1 预算。
- [x] 确定性 Composer/PSR-4 索引基准可执行并输出机器可读报告；Linux x64 的 1k/10k/50k 文件各 5 次冷索引 P95 为 1497.03/13463.54/64712.98 ms，峰值 RSS 为 115.1/168/323.8 MiB，低于对应冻结预算。
- [x] 现有 VS Code 扩展改用共享 parser 包，删除独立解析实现。
- [x] parser 提供仓库无关公开入口和默认 WASM 定位，独立 tarball 可消费。
- [x] language-server 提供 bin/stdio、增量文档同步、版本校验、语法诊断和文档符号。
- [x] VS Code adapter 已打包独立服务器入口；预览阶段曾默认关闭，当前独立安装和两个组合包均默认启用。已有 Intelephense 且用户没有显式设置时，激活策略保留旧 Provider；显式 true/false 优先。
- [x] 修复 emoji 等 astral Unicode 之前导致语法范围左移的 UTF-16 映射错误。
- [x] Changesets 与真实 tarball 隔离消费者验证建立。
- [x] 十五个组件完成 K01–K06 本地独立发布验收：统一声明 Node.js 20+、MIT、typed ESM exports、独立 changelog 与发布文件清单；内部依赖使用可转换为 caret semver 的 `workspace:^`，发布门禁检查无环图、仓库外导入、任意工作目录 WASM、真实 LS stdio 初始化及 PHP 文档查询。公开 npm 发布仍须单独确认。
- [x] `@php-companion/semantic-provider` 建立独立 schema 1 外部事实契约；Symfony 与 Doctrine 通过同一 provider 身份、generation 和带来源位置的完整快照接入，语义工作区先校验再原子替换或显式撤销，失败提交不破坏上一代事实。
- [x] `@php-companion/semantic-provider-host` 只运行 `phpCompanion.semanticProviders` 显式配置的可信命令，每轮使用独立无 shell 子进程及单请求/单响应 JSON 协议；超时、崩溃、输出超限、协议/身份/generation/完整性错误均不提交，上一代事实继续可用，移除配置则撤销该 provider。该边界提供故障隔离，不宣称 OS 安全沙箱，也不会从 Composer 或项目文件自动执行代码。
- [x] parser 结构化记录直接字符串或变量表达式动态成员名、直接接收者及可证明动态方法的调用/赋值事实；semantic 仅在名称是无插值字符串，或同一作用域内简单字符串局部变量从赋值到访问之间未被读取、重赋值且仍在有效范围时，为直接变量/类型接收者提供 Hover、Definition 与方法 Signature Help。参数数量、具名参数、已证明实参类型、PHPDoc 重载及方法模板均唯一兼容时，调用结果进入局部赋值和直接/后续成员链，并保留 nullsafe 可空性；调用结果名称、插值、已读取/重赋值、分支外、歧义、不兼容调用和复杂接收者保持 unknown；持久快照为 schema 37。
- [x] 方法和属性 Rename 会把已证明解析到目标声明族的动态字符串字面量，或其未触碰局部字符串赋值来源纳入同一编辑；动态访问已解析到无关类型时保持不变。任一同名动态名称、接收者或成员归属无法证明时，整个重构保持不可用，避免部分改名；不完整补全语法不会被 parser 误记为跨语句动态访问。
- [x] 动态成员名称支持任意括号层级和仅由无转义字符串组成的 `.` 拼接；补全、导航、签名和返回链消费折叠后的唯一名称，Rename 用覆盖首段到末段内容的单一区间把拼接原子改为新名称。变量拼接、调用、插值、转义及含注释表达式记录为 unknown 覆盖，只用于关闭可能不完整的 Rename，并抑制未解析/静态性/可见性猜测。持久快照升级为 schema 37。
- [x] 动态名称可解析唯一全局常量、可见类常量、`self/static/parent` 与常量别名链，以及 string backed Enum case 的 `->value`；循环别名安全终止。导航和调用推断消费最终字符串值，Rename 修改最终字面量来源并去重共享别名；Enum `->name` 可用于查询但因没有独立字符串来源会保守关闭方法 Rename。
- [x] `@php-companion/type-system` 建立基础类型、Union/Nullable 和三态兼容性，未知关系不误判。
- [x] type-system 增加 keyed/non-empty array、开放/封闭 shape、泛型、`list<T>`/`non-empty-list<T>`、受限/非受限 `class-string` 和 Callable；list 保留顺序整数键和非空约束，semantic 已检查直接静态数组字面量与 PHPDoc list/shape 参数，并沿同块局部赋值传播静态标量、数组、构造及已证明调用结果，可跨过不读取目标变量的纯字面量语句；完整 `if/elseif/else`、含 default 的完整 `switch` 与完整 `try/catch/finally` 合并确定性正常出口，switch 支持普通 `break`、贯穿和嵌套完整控制流，finally 支持确定覆盖及安全透传，安全 `do…while`、规范非空整数 `for`、末尾普通 break 的显式单轮循环及可证明非空 `foreach` 传播必然迭代的确定赋值；shape 递归检查必填/可选键及嵌套 shape、list、nullable、Union 字段类型；参数 shape 的数值键、局部数组的动态或稀疏数值键展开、混合键、含未知副作用或未支持控制流来源保持未知；`class-string<T>` 按完整继承关系协变并可拓宽为 string；PHPDoc 模板方差已接入泛型参数变量转发，支持逐参数协变、逆变和不变关系，`@extends` / `@implements` 直接及递归继承会显式替换和重排参数后再应用父类型方差，缺失、歧义或不完整元数据保持 unknown；Callable 实施参数逆变和返回协变。
- [x] `@php-companion/project` 静态读取根项目与已安装依赖的 Composer autoload 配置，不执行项目 PHP 或 autoloader。
- [x] `@php-companion/semantic` 对可证明的参数和 `$this` 类型提供保守成员、定义与签名查询；未知/Union 不猜测。
- [x] 类型、函数和成员统一支持 Hover/Definition；函数 References 解析 namespace、导入 alias 并排除其他 namespace 的同名函数。
- [x] 类型和方法支持 Implementation 导航；继承与接口关系可传递查找，实现结果限定在当前语义工作区。
- [x] 标准 LSP Type Hierarchy 支持从类型准备视图并逐层查询直接父类型和子类型；结果沿文档 URI 路由到所属 Composer 根，不跨多根语义空间。
- [x] 标准 Type Definition 对可证明的参数/局部变量类型和成员返回类型跳转到声明；未知、标量和无法绑定的类型返回空结果。
- [x] 标准 Semantic Tokens 对 parser/CST 已结构化确认的类型、函数、方法、参数、属性和常量声明，以及文件顶层/局部变量、当前作用域参数引用、函数调用、`new` 类型、普通/静态方法、属性/常量访问和命名实参标签分类；标准 `type` 覆盖原生对象类型、继承/接口、Trait、Attribute、`instanceof`、静态接收者、PHPDoc 类型、class import 路径和显式 alias，function/const import 使用各自类别。当前 Composer 根内恰好一个类型声明时细分 class/interface/enum，唯一全局/namespace 常量表达式分类为 enumMember；重复或未解析身份保持通用类型或静默。声明携带 declaration/static/readonly 修饰，动态成员不猜测。
- [x] 标准 Inlay Hints 对局部赋值后可唯一解析到已声明类的变量显示短类型名；Union、标量、匿名类和未知调用结果不显示。
- [x] 独立 PHPDoc AST 支持 nullable、Union、Intersection、泛型、数组后缀和 shape；`@param`、`@return`、`@var` 在原生类型缺失时接入保守推断，`array`/`iterable`/`callable` 等宽泛原生参数允许由同类别 PHPDoc 精化。
- [x] 函数和普通方法在完整可证明的生成器函数体中推导 `Generator<TKey, TValue, mixed, TReturn>`：支持无键/显式 int 或 string 键的直接 `yield`、静态数组及已声明泛型 iterable 的 `yield from`、无原生返回类型或原生 `Generator`，并排除嵌套闭包/函数的 yield。推导结果进入 Signature Help、函数/方法调用局部赋值及 foreach 值类型；原生 `Generator` 上同基 PHPDoc 泛型优先。任一 yield、键、return、委托 iterable 或递归调用无法证明时保留宽类型，不拼接局部猜测。
- [x] 原生参数、返回和属性类型与紧邻 PHPDoc 由共享类型代数校验运行时边界；`php.phpdoc.type-conflict` 只在完整索引证明文档类型不属于原生类型时标记精确类型范围。对象子类、`class-string`、array/list/shape、Callable、泛型方差、PHP 原生 `int` 到 `float` 及 `iterable` 关系进入同一判断；合法精化、未解析或不完整关系、条件/模板等未支持类型和残缺注释保持静默，并支持逐代码关闭与严重性覆盖。
- [x] 类型兼容性默认限制 256 次递归比较并允许调用方收紧；semantic 的 PHPDoc/原生类型转换限制 256 个展开节点、泛型父类型替换限制 64 层、模板替换结果限制 8 KiB。预算耗尽统一转为 unknown；PHPDoc 冲突查询在声明或继承文件更新后直接用当前工作区事实重算，测试覆盖合法→冲突→合法的失效往返及 300 层输入抑制。
- [x] PHPDoc/原生冲突查询按类级后 callable 级顺序建立模板作用域，内层同名模板遮蔽外层；`T of Bound` 可沿其他模板传递解析，无 bound 模板按 mixed 上界判断，循环、无效或不完整 bound 抑制。参数、返回和模板属性均复用同一规则。
- [x] 常量别名、构造器查找、完整层级、具体方法集合、变量/别名来源、iterable 泛型、泛型父类型、成员聚合和子类型关系等递归语义图入口统一限制为 64 层；边界内保持精确，超限返回 unknown/空结果。测试覆盖 63 层继承和 60 层变量别名仍可解析，以及 65/70 层安全抑制。
- [x] Extract Variable/Method、Inline Variable 和 private 参数定位使用最多 100,000 节点、256 层的迭代 CST 遍历；readonly 属性扫描及前向控制流使用相同显式预算，超限时清除本轮派生摘要并抑制整项诊断。测试验证 180 层合法块嵌套仍精确报告，300 层安全返回空结果。
- [x] 局部静态值合流限制为 16 层；调用参数展开、闭包/Callable 调用和成员链的 CST 定位复用有界迭代遍历，工厂返回前向流也限制节点数与深度。测试验证 8 层完整条件仍传播精确 string，20 层异常输入在约 0.4 秒的专项测试内抑制参数诊断。
- [x] constructor/factory 派生摘要按变更文件中的 callable、类型和 extends/implements/Trait 依赖闭包定向失效；类型声明拓扑变化撤销负工厂缓存，闭包超过 64 轮回退全清。计数 parser 的隔离测试证明首次查询建立摘要、无关文件保存产生 0 次工厂重解析、目标 callable 保存后重新解析。
- [x] PHPDoc `array<TKey,TValue>` / `non-empty-array<TKey,TValue>` 使用结构化 keyed/non-empty array 关系；静态数组实参分别检查 key/value，sealed shape 只有必填字段才能证明非空，仅可选字段确定不满足，开放 shape 保持 unknown。
- [x] PHPDoc AST 保留有符号整数 literal，`int<min,max>` 转为共享 integer-range。安全整数直接实参精确检查边界，range 子类型要求完整包含并可拓宽为 int；动态 int 到窄 range 保持 unknown，倒置/非安全边界抑制。PHPDoc/类型系统/semantic 正反例覆盖。
- [x] 结构化 `array<K,V>` / `list<T>`、封闭 PHPDoc array shape、唯一解析的静态短数组类常量、层级完整且全部可见常量均可静态求值的 `Class::*`，以及已索引 backed Enum，其 `key-of<...>` / `value-of<...>` 投影为数组键/值、list 的 int/T、shape 键/字段类型或精确标量值 Union。投影和 Enum backing 必须匹配原生参数；简单直接字符串/安全整数键精确校验，动态同类标量保持 unknown，unit Enum 或任一动态、不支持、不完整常量使投影静默。
- [x] 静态数组 literal 与类常量投影具有独立 256 节点预算；300 层嵌套反例在耗尽时整体保持 unknown。
- [x] 命名对象到原生 `iterable`/`callable` 不再由基础种类直接判否：semantic 沿已声明关系证明 `Traversable`/`Iterator`/`IteratorAggregate`/`Generator`，并从真实公开非静态 `__invoke` 证明 invokable；已完成层级且无契约才判不兼容，不完整层级返回 unknown。PHPDoc 冲突和实参诊断均覆盖集合/invokable 正例与普通类反例。
- [x] PHPDoc/原生冲突专用运行时上界覆盖 `positive-int`/`negative-int`/非正负整数、`non-empty-string`/truthy/numeric/literal/大小写字符串、`numeric`/`number`、`scalar`、`array-key`、`non-empty-array` 及 `integer`/`boolean`/`double`/`real` 别名；合法原生上界不报，包含越界分支时精确报告。宽化仅用于冲突证明，不替代普通精细推断。
- [x] PHPDoc AST 结构化保留参数或模板主题的 `is` / `is not` 条件类型，包括 Callable 返回位置。semantic 在唯一函数、静态方法和实例方法调用形状及全部已声明实参通过后求值；未提前读取、重赋值或按引用传递的 PHPDoc Callable 参数也按位置/具名实参求值。布尔字面量和完整对象关系选择确定分支，模板先完成现有推断与 bound 校验，未知条件合并两侧返回 Union；嵌套条件把同一参数的布尔或有限 Union 分支约束传入内层并关联 `is` / `is not`，父类型可能匹配目标子类时保留两侧；结果沿局部赋值进入补全与 Definition。无法解析的分支、不完整层级、不稳定 Callable 绑定和不唯一调用保持 unknown，并由 stdio 与真实 Extension Host 覆盖。
- [x] PHPDoc AST 支持 Callable 参数名、可选/variadic 标记和返回类型，兼容前置/后置 variadic 写法，并对未完成 Callable 输入返回结构化错误。
- [x] PHPDoc AST 区分无条件 PHPStan/Psalm `assert`、`assert-if-true/false`、`!null` / `!false` / `!true` / `!Type` / `!Generic<T>` / `!(A|B)` 否定类型，并结构化保留 `$parameter->property` 路径；semantic 对唯一函数或唯一解析方法的独立直接调用、直接 `if` 调用、`while` 或有条件 `for` 的 truthy/falsy 循环体，以及 `while`、有条件 `for`、`do…while` 和普通条件中整个条件结果能逻辑推出单次调用结果的合取真分支/析取假分支、短路求值已证明左侧结果的右操作数及无 goto 且主分支/elseif/else 的直接 return/throw/exit、完整嵌套 `if/elseif/else`，或 finally 必然终止/try 与全部 catch 均终止的 `try/catch/finally`，或含 default 且每个入口沿贯穿路径均终止的 `switch`，或首轮必然终止的 `do` 及无退出跳转的恒真 `while/for` 结果使所有可继续路径一致证明条件真值的同块继续路径，按位置或具名变量实参收窄已声明非引用参数。直接属性正类型断言支持逐级可见的单/多层属性链和局部读取；方法 `$this->property` 正断言可映射到直接非 nullsafe 变量接收者，并支持类内可见属性。任一祖先属性写入、根变量重赋值、链上方法调用或传入函数后失效。Callable 模板可从 `class-string<T>` 等已支持参数结构推断，并且只在绑定唯一、bound 与全部实参兼容时专门化参数或属性断言，包括属性 `!T` 减法。`!null` 从参数或逐级可见属性路径的单一 nullable 对象移除 null；`!Type`、`!false`、`!true`、基础类型、泛型、交集及否定 Union 从参数或属性终点的有限 Union 中减去已证明匹配的类型，并只在剩余唯一对象类型时暴露成员；泛型排除复用声明方差和泛型父类型替换，且保留唯一剩余泛型实参。嵌套条件对同一参数共享布尔与有限 Union 约束，并在位置或具名映射证明不同形参绑定同一直接变量时共享跨参数约束；不同变量和复杂表达式保持独立。嵌套括号、否定条件和普通 else 受支持；循环体内修改立即失效，循环出口和 `do…while` 首轮主体不继承尾部条件事实。stdio 与真实 Extension Host 验证成员补全/Definition 及不完整分支、无法证明的分支、条件外不泄漏。不可见属性、无法唯一化的否定属性、歧义/越界模板、无法唯一化或关系不完整、动态/重复函数或方法、unpack、引用参数、未支持控制流及后续可能修改保持 unknown；parser 缓存独立调用及归一化蕴含分支范围，semantic 快照为 schema 37。
- [x] PHPDoc 类模板按声明顺序绑定已知对象实参并验证 `of` 对象约束，方法返回模板可精确替换并继续成员链；函数和普通方法的 Callable 级模板还能从位置、具名、variadic、直接或一次未触碰局部静态数组展开、静态基数组上连续 `[]`/整数键写入构造的未读取局部位置数组展开、确定性字符串键写入构造的封闭局部 shape 展开、未触碰非引用参数的封闭全必填具名 shape 展开及直接/nullable/array/list/class-string/shape/同基泛型、完成参数替换与重排后的直接或传递父泛型实参递归推断返回替换；受支持结构任意层级的 Union 泛型实参逐分支保留完整绑定方案、分别复核 bound 与专门化参数并组成相关返回 Union，覆盖协变、不变及多模板同时变化；同时验证重复绑定、必填参数和调用形状。宽泛/可选参数 shape、已使用的参数数组、局部数组的动态或稀疏键、无法证明的修改、超过 64 个绑定组合、Union 分支结构/模板集合不一致、继承路径歧义、冲突绑定、对象身份或约束无法证明时不推断。
- [x] PHPDoc `array{key: Type}` 的已知字符串/整数键可直接或经局部赋值驱动对象成员补全；可选键只在显式 `?->` 下使用，缺失键或动态索引保持未知。
- [x] 直接属性读取赋值传播对象类型，例如 `$repo = $this->repository`；公开/当前作用域可见性、nullable 属性和 nullsafe receiver 均沿用成员解析规则，nullable 结果只允许后续 `?->`，私有外部属性和对 nullable receiver 的普通 `->` 保持 unknown。stdio LSP 已验证构造注入对象的属性转局部变量链。
- [x] 局部赋值可沿完整、静态可证明的属性/方法混合链传播，例如 `$mailer = $this->provider()->holder->mailer`；链上逐步复用成员可见性、泛型方法模板、字面量方法返回与 nullsafe 规则，中间任何缺失成员或 nullable 普通访问会使整条赋值保持 unknown。stdio LSP 已验证四步混合链。
- [x] PHPDoc `callable(...): Type` 参数在局部直接调用并赋值时传播对象返回类型；位置/具名实参、variadic 收集、直接静态数组及一次直接静态数组局部赋值后的未触碰变量展开及未触碰非引用参数的封闭全必填具名 shape 展开按参数名称、必填/可选和逐项类型验证，复用继承、泛型方差、调用文件 strict/weak 标量及 `mixed` 规则；同作用域一次直接赋值且未再使用/重赋值的单层别名可继续传播。类型不兼容或无法证明的非 mixed 实参、宽泛/可选/整数键/已使用或已修改的参数数组、复杂别名和无法证明的返回保持未知。
- [x] PHPDoc `list<T>`、`array<K,V>`、`T[]` 和同质 array shape 的对象元素可传播到 `foreach` 值变量；混合 shape、未知 iterable 和 key 类型不猜测。
- [x] parser 支持多 namespace、函数、方法、参数、属性、提升属性、类常量和原生返回类型；LSP 文档符号包含对应成员。
- [x] semantic 区分方法、实例/静态属性和类常量，完成可见性过滤、PHPDoc 返回链和类型级基础 References。
- [x] 简单赋值传播覆盖 `new`、变量复制、函数调用、静态工厂和已知对象成员调用；多 namespace 文件按调用所在函数绑定名称。
- [x] project 静态读取根项目及依赖的 PSR-4、PSR-0、classmap、files；独立 index 包在固定文件/大小预算内向语义消费者提供快照。
- [x] Composer 2 `vendor/composer/installed.json` 的 `install_path` 用于定位 path repository/自定义安装位置，避免把 symlink 包错误固定到 `vendor/name`。
- [x] index 按根包和每个依赖各自的 Composer `exclude-from-classmap` 规则过滤扫描，支持 `*`、`**` 和隐式递归后缀。
- [x] language-spec 提供首批 PHP 7.2–8.5 共同核心类签名，并按目标版本生成标准异常树、DateTimeInterface/DateTime/DateTimeImmutable/DateTimeZone/DateInterval/DatePeriod、Iterator/IteratorAggregate/Traversable、ArrayAccess、Countable、JsonSerializable、Serializable、SPL 迭代器、Closure、Generator、ArrayObject/ArrayIterator、WeakReference/WeakMap、Stringable 和 UnitEnum/BackedEnum。Date/Time 工厂、异常、常量、微秒 API 与 DatePeriod 接口变化按 7.3/8.0/8.2/8.3/8.4 门控；DatePeriod 三个构造重载支持按位置、命名和已证明实参类型筛选，固定 iterable 契约把 foreach 值传播为 DateTimeInterface。继承成员、构造签名、可见性/final 约束、tentative return type 的保守 PHPDoc 表达及 Iterator/Generator 泛型进入共享语义；全限定泛型与原生类型正确精化，Stringable/Enum 自动接口和 stdClass 动态属性规则生效。全局内建类型支持补全、签名、诊断和只读虚拟定义跳转。
- [x] language-spec 的首批字符串目录覆盖 `strlen`、`substr`、四类位置查找、PHP 8.0 contains/starts/ends、trim/大小写、replace、explode、implode/join、sprintf、HTML 转义、换行/折行、单词大小写、str_split/pad/reverse/compare 和 strtr；PHP 8.0 的失败返回、参数及函数可用性与 PHP 8.1 HTML flags 默认值按目标版本生成。全局函数 Signature Help 支持多候选，完整调用按形状和已证明类型绑定具体声明；implode/join/strtr 以关联重载避免无效 Union 组合，PHP 8 旧式反向 implode 可得到规范签名与错位参数诊断。
- [x] Trait precedence、alias、visibility 进入结构化 AST 和成员组合；私有 Trait 成员按宿主类访问，冲突排除后仍可通过 alias 使用。
- [x] `self`、`parent` 与晚期静态绑定返回链分开解析；闭包和箭头函数采用最小词法作用域，外层赋值不会错误泄漏。
- [x] 闭包 `use` 捕获进入结构化作用域：按值捕获可安全继承类型，按引用捕获保持未知；箭头函数按语言规则隐式继承外层变量。旧语义快照会被拒绝并安全重建。
- [x] 匿名类获得按文档 URI 和源码位置隔离的稳定身份，可提取自身/继承成员并传播给局部赋值；不会暴露为全局类型或工作区符号。
- [x] Language Server 动态监听 PHP/Composer 变化，保护未保存覆盖，并在完整重建后清理失效磁盘快照。
- [x] LSP 高频读取请求在异步边界检查取消令牌，Workspace Symbol 的协议取消在冻结的 100 ms 预算内返回空结果；快速连续编辑只允许当前文档版本发布诊断。
- [x] VS Code adapter 使用独立可测的服务器恢复策略：60 秒内最多自动重启三次，第四次停止，重复协议错误转入关闭流程；Extension Test 已让服务器确认请求后以非零状态退出，并验证重启后的真实成员补全恢复。
- [x] 支持标准 LSP Work Done Progress：Composer 项目发现、逐根索引和就绪状态可见，客户端取消进度会进入发现与源码分析共用的取消条件，结束事件始终成对发送。
- [x] `vscode-remote` workspace 的 URI 可转换为服务器侧路径，index 由 adapter 注入路径到 URI 映射；Definition、打开文档覆盖、文件失效及补全保持远程 scheme/authority，旧 file-only 缓存安全重建。
- [x] 每个 workspace root 使用独立语义空间并按最深根路由查询；相同 FQCN 不跨项目串线，Workspace Symbols 单独聚合。
- [x] 工作区内嵌套 Composer 根会有界发现并按最深根使用独立语义空间；跳过 vendor/VCS/node_modules，取消或达到目录/项目预算时显式返回不完整状态。
- [x] 索引取消检查覆盖目录发现和文件分析两个阶段；发现期取消不会发布部分索引。
- [x] 文件预算按根项目源码与依赖分层：根项目自身超限仍拒绝部分发布；只有依赖超限时才按稳定顺序截断，并将 `projectComplete` 与全量 `complete` 分开报告。Winstar 默认 10,000 文件预算实测先保留全部 1,638 个项目/测试 PHP 文件，再填充依赖到预算，不再因大型 vendor 树返回 0 文件；不完整索引继续抑制需要全量证明的诊断与 Twig interop。
- [x] `declare(strict_types=1)` 文件中的直接 bool/int/float/string/空数组字面量进入参数、return 与类型属性赋值兼容检查；未重赋值且类型已声明的参数变量可作为共享类型事实，mixed 保持 unknown；弱类型文件保留 PHP 标量强制转换，其他变量、调用和复合表达式未证明时不猜测。唯一函数和普通方法的声明返回只在必填/具名/variadic 形状有效且每个有类型实参可证明兼容时传播，直接或一次未触碰局部静态数组展开按整数位置键和合法字符串参数名校验，同块静态基数组上连续 `[]`/整数键写入构造且未读取的局部位置数组也保留逐项类型，未触碰非引用参数的封闭全必填具名 PHPDoc shape 也可展开；无类型/`mixed` 参数仍接受动态值，宽泛/可选参数 shape、已使用参数数组、局部数组的动态或稀疏键、无法证明的修改和无效调用保持 unknown。semantic、stdio LSP 与 VS Code Extension Host 已覆盖。
- [x] PHP 版本门槛进入 `php.version.unsupported` 稳定诊断；当前覆盖箭头函数、Union、Attribute、属性提升、match、named argument、PHP 8.0 `mixed`/`static` 返回类型、Enum、Intersection、PHP 8.2 `true`/独立 `false`/独立 `null`/`false|null`/`?false`、readonly 和 typed class constant。
- [x] 跨 namespace 类型补全覆盖构造、继承、参数、返回、属性、catch 与 Attribute；候选通过 `additionalTextEdits` 插入 `use`，alias 冲突时不猜测。
- [x] 函数补全覆盖同 namespace、全局函数、`use function` alias 与跨 namespace 候选；外部候选使用 `additionalTextEdits` 插入精确 `use function`。
- [x] namespace 常量进入 parser/semantic/LSP：支持顶层符号、补全、Hover、Definition、References、`use const` alias 和跨 namespace 自动导入；类常量仍按静态成员处理。
- [x] Signature Help 支持成员、静态方法、构造函数和导入函数；Workspace Symbols 有界返回类型、函数与成员。
- [x] 命名参数 Signature Help 可按乱序参数名定位，补全仅返回尚未使用且前缀匹配的参数名。
- [x] 同文件重复类型、命名函数、方法、属性、namespace 常量和类常量使用稳定诊断代码，并只标记后续声明；类型/函数/方法身份大小写不敏感，属性和常量保持 PHP 的大小写敏感规则，常量提示准确区分作用域。
- [x] 构造器/析构器的确定编译期契约使用 `php.method.invalid-magic-signature`：两者不可 static 或声明原生返回类型，析构器不可接收参数；同一方法的多个违规合并为一个方法名诊断，合法构造参数、无参析构器和语法残缺输入保持静默。PHP 8.5 运行时对照、单元正反例和打包 Extension Host 覆盖。
- [x] `php.method.invalid-magic-signature` 进一步覆盖 `__clone`、`__toString`、`__get`/`__set`、`__isset`/`__unset`、`__call`/`__callStatic`、`__sleep`/`__wakeup`、`__set_state`、`__debugInfo` 及目标 PHP 7.4+ 的 `__serialize/__unserialize` 精确参数数量、引用/variadic 标记、语言强制静态性、已声明 string/array 参数的逆变边界及返回类型；PHP 7.3 及以下的序列化同名方法保持普通方法语义。参数契约接受 `mixed`、含期望类型的宽 Union 和 array 的 `iterable` 超类型；返回契约接受目标版本支持的 `never`、bool 的 `true`/`false`，以及 nullable array 的 `array`/`null` 协变；`__set` 的第二参数等 PHP 实际未强制位置不猜错。PHP 7.2/8.5 运行时对照、单元正反例、残缺输入抑制和打包 Extension Host 覆盖。
- [x] 非 public 标准魔术方法使用独立 Warning `php.method.magic-visibility`，只标记方法名；构造器、析构器与 `__clone` 保留 PHP 允许的非 public 可见性，目标 PHP 7.3 及以下不把 `__serialize`/`__unserialize` 当作受约束魔术方法，残缺输入保持静默。PHP 8.5 运行时 Warning 对照、目标版本单元反例和打包 Extension Host 覆盖。
- [x] PHP 8.1+ Enum 的非法成员使用 `php.enum.invalid-member`：实例/静态属性通过受限 CST 错误恢复精确标记变量名；完整索引中唯一解析的直接或嵌套 Trait 闭包一旦证明属性，就在 Enum 的直接 Trait use 名称上报告属性来源；语言禁止的构造/析构/克隆、属性重载、睡眠/序列化、字符串转换及调试魔术方法精确标记方法名；Enum 直接声明 `cases()` 一律非法，backed Enum 直接声明 `from()`/`tryFrom()` 非法。case、类常量、无属性 Trait、Trait 中由引擎合成 API 覆盖的同名方法、unit Enum 的 `from()`/`tryFrom()`、`__invoke`、`__call`、`__callStatic` 合法，缺失/重复 Trait 身份保持静默，禁用方法不再级联魔术签名或可见性诊断。CST 恢复遍历有 100,000 节点预算，Trait 图有 64 层预算；普通语法错误、方法体错误、残缺声明及目标 PHP 8.0 保持原有语义。PHP 8.5 运行时对照、单元正反例和打包 Extension Host 覆盖。
- [x] PHP 8.1+ Enum case 契约使用 `php.enum.invalid-case` 并只标记 case 名称：非 backed case 不可带值，backed case 必须带值；直接 string/int/float/bool/null 字面量可证明与 `int`/`string` 背书类型不一致时报告，同一 Enum 内字节完全相同且类型匹配的后续字面量值报告重复来源。常量、运算及其他复杂表达式保持 unknown，避免执行项目 PHP；目标 PHP 8.0 和残缺输入不产生级联。PHP 8.5 的声明期与首次访问/`from()` 延迟失败均已对照，单元正反例和打包 Extension Host 覆盖。
- [x] PHP 8.1+ Enum 接口契约使用 `php.enum.invalid-interface` 并标记 implements 名称：显式直接实现引擎自动提供的 `UnitEnum`/`BackedEnum` 非法；直接或唯一解析、64 层以内的接口继承图包含 `Serializable` 非法；非 backed Enum 实现 `BackedEnum` 子接口非法。扩展 `UnitEnum` 的普通接口可由 unit/backed Enum 实现，扩展 `BackedEnum` 的接口可由 backed Enum 实现；缺失、重复或超预算接口图保持 unknown。namespace 同名接口、全限定名称和 import alias 按解析后的完整身份区分。PHP 8.5 运行时直接/传递对照、单元正反例和打包 Extension Host 覆盖。
- [x] 抽象方法的确定编译期契约使用 `php.method.invalid-abstract-declaration`：abstract 方法与 interface 方法不可包含方法体，含 abstract 方法的 class 必须声明 abstract，非 abstract 方法必须包含方法体，abstract 不可与 final 共存，interface 方法不可 final 且必须 public，private abstract 仅在 Trait 契约中合法；同一方法的多个违规合并到方法名范围。PHP 8.5 运行时对照、合法 public interface/static abstract/Trait private abstract 反例、残缺输入抑制和打包 Extension Host 覆盖。
- [x] `php.type.invalid-declaration` 精确标记原生类型原子：参数不可使用 `void`/`never`/`static`，普通及提升属性不可使用 `callable`/`void`/`never`/`static`，`void`/`never`/`mixed` 不可组成 nullable、Union 或 Intersection；`never` 从目标 PHP 8.1、`mixed` 从 PHP 8.0 才作为关键字应用规则，PHP 7.2 的同名 `never` 类已由项目运行时验证合法。结构化 CST 遍历限制为 100,000 节点，语法残缺或预算耗尽时不发布部分结果；单元正反例和打包 Extension Host 覆盖。
- [x] `php.type.redundant-declaration` 精确标记复合声明中的后续重复原生类型、同一 Union/Intersection 层级内大小写不敏感的重复完整类名、与 `bool` 同现的 `true`/`false`、`true|false` 的后一个字面量、与 `iterable` 同现的 `array` 或显式全局 `\Traversable`，以及平坦 `object|Class` 的类分支；Intersection 中结构化确认的标量/内建非类原子由 `php.type.invalid-declaration` 标记。原生身份和完整类名按大小写不敏感规则比较，限定名不拆段，也不跨相对/绝对写法猜测等价；PHP 8.0 Union、8.1 Intersection、8.2 DNF/`true` 版本门槛分别生效。`bool|null`、`iterable|Countable`、namespace 内自定义 `Traversable`、`A&self`/`A&parent`、不同完整类名、旧目标版本及残缺类型不产生级联诊断；PHP 8.5 运行时对照、单元正反例和打包 Extension Host 覆盖。
- [x] `php.type.invalid-relative-scope` 精确标记类型声明作用域外的 `self`/`parent`/`static`，以及无显式父类型的 class/interface 和 enum 中的 `parent`；Trait 的 `parent` 与有父类/父接口声明保持合法。原生类型、`instanceof`、`new` 和相对静态接收者共用结构化范围；语法残缺时静默。Parser、语言服务器单元正反例和打包 Extension Host 覆盖。
- [x] 唯一 Composer PSR-4 映射下提供稳定 `php.namespace.psr4` 诊断和首选 Quick Fix；重叠映射、多 namespace 与语法错误时抑制，预览 LS 启用后旧诊断所有者让位。
- [x] `new`、原生参数/返回/属性类型、继承/接口、Trait、`instanceof` 与静态接收者中的确定类型名在完整索引后提供 `php.type.unresolved` 诊断；只有零声明匹配才报告，`self`/`parent`/`static`、Attribute、索引取消/超限/构建中、语法错误和字符串内容保持静默。
- [x] 显式限定、`namespace\` 和精确 `use function`/`use const` alias 绑定的命名空间函数与常量在完整索引后提供 `php.function.unresolved` / `php.constant.unresolved`；函数身份大小写不敏感、常量身份大小写敏感。未限定全局候选、动态调用、语法错误和未完成索引保持静默，避免把尚未收录的 PHP 扩展符号误报为缺失。
- [x] 命名函数、方法、显式闭包与箭头函数内提供 `php.variable.undefined` Warning，只报告当前位置之前没有任何可能定义来源的确定缺失变量。参数、顺序/引用赋值、分支可能赋值、foreach/catch/global/static、已解析按引用参数、未解析调用参数、按值/按引用闭包捕获、箭头自动捕获、PHP 预定义变量，以及 `isset`/`empty`/`unset`/`??` 安全读取均有正反例；include/require、动态变量和 `extract`/`eval`/`parse_str` 后保持静默。该本地诊断不等待项目索引，语法错误时不级联。
- [x] 已知接收者且继承链完整时，确定缺失的方法、静态属性和类常量提供 `php.member.unresolved` 诊断；未知/Union、nullable 非安全访问、实例动态属性、魔术成员、枚举合成成员和缺失父类时抑制。
- [x] 类级 PHPDoc `@property` 与 `@method` 结构化进入 semantic 魔术成员表，提供实例/静态成员补全、参数签名、链式返回类型和指回标签的 Definition；同名 `@method` 重载先按参数数量与具名实参筛选，再以已证明的标量/对象实参类型按精确匹配、继承兼容、弱标量转换排序，唯一最佳匹配才传播返回链，歧义时 Signature Help 保留全部最佳候选且返回类型保持 unknown；PHPStan `method<T of Bound, U = Default>(...)` 方法模板可从 `class-string<T>` 等参数结构推断，复核 bound、默认值与全部参数后专门化返回；真实 PHP 声明覆盖全部同名注释成员；`@property-read` 可读取和链式导航但所有写入均诊断，`@property-write` 使用独立写入类型检查赋值且不生成读取链，同名成对标签合并并保留各自读写类型；未声明动态名称保持 unknown。快照升级为 schema 37。phpdoc、semantic、stdio LSP 与真实 Extension Host 覆盖。
- [x] 已知接收者且继承链完整时，非静态方法/属性被静态访问提供 `php.member.non-static-access`，不可见的 private/protected 成员提供 `php.member.inaccessible`；可访问继承路径和 `__call`/`__callStatic`/`__get`/`__set` 魔术接管时抑制，且不会与未解析成员重复报告。
- [x] `phpCompanion.diagnostics.disabledCodes` 可按稳定代码关闭自研服务器诊断，`phpCompanion.diagnostics.severity` 可逐代码覆盖 error/warning/information/hint/off；客户端同步配置变化后，服务器立即重算所有已打开 PHP 文档。
- [x] 唯一解析的函数、方法和构造调用在缺少必填参数时提供 `php.argument.missing-required`；正确的位置/命名参数、默认值和 variadic 被识别，参数展开、嵌套调用、未知命名参数、重复函数或动态目标时抑制。
- [x] PHP 8.0+ 唯一解析调用中的未知命名参数提供 `php.argument.unknown-named`，参数名按 PHP 规则区分大小写且范围精确；variadic、参数展开、嵌套调用、重复函数、动态目标和 PHP 7.x 时保守抑制。
- [x] PHP 8.0+ 的重复命名参数、命名参数后的普通位置参数和参数展开分别提供稳定诊断；这些调用级确定错误不依赖目标解析，PHP 7.x 仅保留版本诊断。
- [x] 补全详情、Document Symbol、Hover 与 Signature Help 保留参数的引用、variadic 和默认值语法。
- [x] 类上的 Code Action 可生成已解析接口中确实缺少的方法，原样保留单行接口签名的引用/variadic/default/返回类型，并跳过已有继承实现、未解析层级和复杂多行签名。
- [x] 具体类未实现完整继承链中的抽象父方法时提供稳定 `php.class.missing-abstract-method` 诊断与 Code Action；已有中间层具体实现会消除要求，抽象子类不报告诊断，单行签名原样生成并与接口动作去重。
- [x] 类上的 Code Action 可为无父类、无 Trait、无既有构造函数的安全子集生成构造函数；只接收有类型、无默认值、非静态且以分号声明的属性，通过统一 EditPlan 应用并支持单步 Undo，继承构造与属性 hook 场景不提供操作。
- [x] 类上的 Code Action 可为完整继承链中的有类型、非静态、分号属性生成缺失的 `getX`/`setX`；既有或继承方法不会重复，readonly 属性/类只生成 getter，属性 hook 不参与。真实 Extension Host 已验证四个访问器的应用和单步 Undo。
- [x] 具名单继承类可对完整继承链中的 public/protected 单行具体方法逐项生成 Override，保留签名、默认值和 variadic 转发，按 void/never 与有返回值生成正确的 `parent::` 调用；private/final/abstract/魔术/已覆盖方法不提供动作。真实 Extension Host 已验证候选排除、应用和单步 Undo。
- [x] 完整继承链中已声明的同名方法会校验静态性、可见性、必填/可接受参数数量、引用、variadic、参数逆变与返回协变；只在原生类型和类关系可证明时发布稳定 `php.method.incompatible-override`，未索引外部类型及晚期静态类型保持未知并抑制。原生签名与 PHPDoc 精化分别保存，避免文档类型制造运行时兼容误报。
- [x] 继承 final 类发布 `php.inheritance.final-class`，覆盖 final 方法由 `php.method.incompatible-override` 报告；直接同一语句块中无条件 return/throw 后的每条语句发布 `php.control-flow.unreachable`。复杂分支合流与 break/continue 暂不推断，真实 Extension Host 已验证三类诊断。
- [x] 唯一解析的 extends/implements/Trait use 关系会校验声明种类，class/interface 继承、class/enum 实现及 Trait 引用错误发布 `php.inheritance.invalid-type-kind`；正确、未解析和重复目标保持静默。
- [x] 完整唯一解析的 class/interface extends 环和 Trait use 环发布 `php.inheritance.cycle`，覆盖跨文件及自环；断链、声明种类错误、重复目标和 64 层预算耗尽保持静默。
- [x] 唯一解析的 interface、Trait、enum 与 abstract class 被 `new` 时发布 `php.instantiation.invalid-target`；普通 class、未解析名称和重复目标保持静默。
- [x] 唯一完整类链中的自有或继承 private/protected 构造器执行作用域可见性校验并发布 `php.instantiation.inaccessible-constructor`；private 工厂和 protected 父子类族访问合法，不完整、循环或重复层级保持静默。
- [x] `php.import.unused` 仅报告可独立删除且在代码/PHPDoc 中均无别名使用的单项 import；注释/字符串不被误认成语义使用，group use 保守留给 Optimize Imports。Quick Fix 通过 EditPlan 删除整行，真实 Extension Host 已验证诊断、应用和单步 Undo；语义快照升至 schema 11 保存注释/字符串范围及原生签名并隔离旧缓存。
- [x] 自研 Language Server 可从非魔术 private 方法声明发起 Rename；请求内确保完整索引，只编辑直接解析到同一方法的声明/调用，并拒绝非法 Unicode PHP 标识符、同类名称冲突及调用点发起。字符串、反射和动态成员名明确不改写；类型和方法 Rename 现已共用服务器语义入口，真实 Extension Host 已验证两处编辑和单步 Undo。public/protected 方法的继承族能力见后续独立条目。
- [x] 完整索引后，非抽象类缺失已解析接口方法使用稳定 `php.interface.missing-method` 诊断；抽象类、索引不完整或层级不完整时不误报。
- [x] index/semantic 建立版本化持久快照，按文件元数据复用、损坏回退、原子写入并按目标 PHP 版本隔离；VS Code 缓存位于扩展全局存储目录。
- [x] 打开的未保存 PHP 内容优先于磁盘；文档关闭后恢复已索引磁盘版本，避免关闭文件导致项目符号消失。
- [x] P5a 首批控制流支持直接正向 `instanceof` 和严格 `!== null` 分支；收窄范围限定在正向 body，nullable/Union 在分支外不提供成员猜测。
- [x] P5a 支持可证明的提前退出守卫：否定 `instanceof` 后 `return`，以及严格 null 检查后 `return`/`throw`，只在守卫后的同一词法作用域收窄。
- [x] P5a 严格空值比较支持非 null 正向分支、`=== null` 的直接 else 分支和直接否定等价式；宽松比较、elseif 与条件组合保持未知，不产生越界收窄。
- [x] 控制流事实遇到同一变量的后续赋值即失效；只有赋值结果类型可证明时才继续传播，未知调用或标量重赋值不会沿用旧参数/分支类型。
- [x] 提前退出守卫识别顶层语句序列末尾的 `return`、`throw` 或 `exit`；嵌套条件退出不视为整个分支终止，避免在可能继续执行的路径上收窄。
- [x] `while` 循环对直接 `instanceof` 与严格非空入口条件只在循环体内收窄；重赋值立即失效，循环出口不保留事实，宽松比较保持未知。
- [x] `if`/`while` 的正向 `&&` 条件对每个必然成立的直接 `instanceof` 或严格非空原子分别收窄；`||`、整体复杂否定和无法证明的原子不推断。
- [x] 单类型与多类型 catch 变量只在对应 catch body 内传播；多类型 catch 复用 Union 的共同成员、Hover、多目标 Definition 和逐分支缺失诊断，离开 body 后立即失效。
- [x] PHPDoc `@extends`/`@implements` 泛型实参进入版本化语义快照，并沿完整继承链替换父方法返回模板；补全、Hover/签名消费具体化后的返回类型。实参数量、类型解析或父模板约束不成立时不替换。
- [x] 二成员及一般 Union 在直接 `instanceof` 的普通 `else` 分支排除已匹配类型；否定条件的正反分支对称处理，不扩展到 elseif 或含未知副作用的条件。
- [x] nullable 对象仅在显式 `?->` 时提供成员、返回链与签名推断；链上可空返回值若改用普通 `->`，继续保持未知而不猜测。
- [x] 原生对象 Union/Intersection/DNF 参数进入分支感知成员主链：Intersection 汇总约束成员；Union/DNF 只暴露每个运行时备选分支都存在且签名完全相同的成员。共同返回类型可继续链式补全，Hover 使用已证明的共同签名，Definition 返回所有分支声明；成员不存在诊断逐个检查完整运行时备选分支，nullable 诊断只在每个分支都确有该成员时报告。标量/未知分支、签名冲突、重赋值及无法安全应用的收窄保持未知。semantic 与真实 stdio LSP 均覆盖 Completion/Hover/多目标 Definition、链式返回和复合诊断正反例。
- [x] 原生复合参数经直接局部别名赋值继续保留全部运行时分支与 nullable 信息，复用共同成员、Definition 和诊断规则；递归访问有界，循环别名、未知来源和不明重赋值停止推断。semantic 与真实 stdio LSP 覆盖 DNF 别名补全和多目标 Definition。
- [x] 唯一可解析函数的原生对象 Union/Intersection/DNF 返回经直接局部赋值进入相同分支模型；函数歧义、标量分支和不完整层级保持未知。semantic 与真实 stdio LSP 覆盖返回 Union 的共同成员补全。
- [x] 完整原生对象 Union/Intersection/DNF 方法返回可继续成员链；复合接收者的共同方法必须在各声明中解析为相同规范分支，同名短类型解析分歧时停止。nullable 复合接收者经 `?->` 保留空安全传播；semantic 与真实 stdio LSP 覆盖共同方法返回 Union 后的成员补全。
- [x] 实例方法、静态方法及复合接收者共同方法的完整原生复合返回可经直接局部赋值继续传播；回调模板、字面量特化或分支声明无法统一时停止。semantic 覆盖三类赋值，真实 stdio LSP 覆盖复合接收者方法返回 Union 的赋值后补全。
- [x] 开源和推荐扩展包加入 Red Hat YAML；JSON 等基础语言明确使用 VS Code 内建服务。
- [x] 完成 twig-plus 与 twig-plus-metadata schema/实现审计：Twig parser、语言服务器、formatter、作用域和访问规则保持唯一所有权；PHP Companion 不复制模板实现。
- [x] `@php-companion/interop` v1 提供项目/快照身份、能力协商、Controller 上下文、序列化 PHP 类型与成员、来源位置、失效和 Rename 准备消息，并在仓库外保持可独立消费。
- [x] `@php-companion/framework-symfony` 静态提取字面量 `$this->render()` 目标及关联数组 context；参数、`$this`、`new` 和字面量类型进入 interop，动态模板不猜测，动态数组形状标为不完整，不启动 Symfony/Composer PHP。
- [x] framework-symfony 使用成熟 `yaml` 解析器静态读取约定位置的 services.yaml，输出带源码范围的显式 class/alias/public/autowire 事实；解析 legacy `framework.services` 与标准 `services`、别名链，以及确定性的目录/末尾星号 resource 和花括号 exclude，拒绝 factory、参数化 class、任意复杂 glob 和损坏 YAML。resource 只从已索引、命名空间匹配的可实例化 PHP class 生成服务，显式定义优先覆盖；私有服务进入 `#[Autowire(service: '...')]` 的前缀补全、Hover 和 Definition，只有公开服务通过通用字面量方法返回事实驱动 PSR/Symfony Container `get('id')` 的直接链与赋值链。项目源码索引完整时，已注册且启用 autowire 的服务构造参数按字面量 Target、类型/参数 bind 或命名 arguments、参数名具名别名、同名 service/alias、唯一 resource 实现的顺序解析，并提供注明来源的注入 Hover 与实现 Definition；扁平对象 Union/Intersection 按 Symfony 的类型排序和组合别名规则解析，只有组合别名存在或每个成员收敛到同一服务才产生结果；PHP 8.2 DNF 只接受规范化完整 service/具名 alias，且目标实现必须满足一个完整交集分支。直接声明的公开 Required 方法和具名对象类型属性复用相同解析；抽象基类只有在所有已注册具体子类一致时产生结果，显式或未知 YAML calls/properties 会抑制。显式 Autowire service ID 仍走专用补全/导航，标量覆盖、动态选择器、DNF 叶子回退、冲突绑定和歧义保持未知。配置及已索引 PHP 文件保存/删除会失效事实。Winstar `src/` 1335 个项目文件完整、vendor 达到 10000 文件预算的只读审计仍证明 819 个同名构造注入目标；当前源码另有 7 个文件中的 9 个 `#[Required]` 注入点。依赖截断不会关闭这些正向结果。
- [x] framework-symfony 静态读取约定位置的传统 `services.xml`，支持 defaults、显式 service/alias、bind、具名 service argument、call/property、prototype/exclude 与 `kernel.event_listener` 精确范围；拒绝 DOCTYPE、环境 `<when>`、动态参数、abstract 与无法证明 class 的 factory。Language Server 在没有新鲜编译容器时仍合并这些服务、注入与注册 References，并以 `symfony-facts-v5` 独立缓存原始 XML 事实。
- [x] YAML `imports[].resource` 与 XML `<imports><import resource>` 的字面量资源进入确定性本地导入图。Language Server 只跟随 Composer 根真实路径内、明确 YAML/XML 扩展名、无参数/bundle 别名/通配符的相对文件，导入先于当前文件应用；递归深度限制为 32，循环不重复分析，导入文件变更可单独绕过缓存刷新。事实缓存升至 `symfony-facts-v6`。
- [x] Symfony PHP Configurator 服务 DSL 由 tree-sitter 静态分析，不 require 配置、不启动 Kernel。已证明的 `ContainerConfigurator` closure 支持官方命名空间或显式 import、services 变量或直接链，以及 defaults、set/class、alias、load/exclude、public/private、autowire、bind、具名及位置 arg/args、call/property、`kernel.event_listener` tag、remove/get 和 PHP import；重赋值 configurator、factory/fromCallable/parent、abstract/synthetic 与动态值不会产生不安全事实。位置 arguments 与 YAML/XML 共用语义构造参数序号，标量只抑制自身位置；Language Server 读取约定 `services.php` 及确定性 PHP 导入，缓存升至 `symfony-facts-v8`。
- [x] framework-symfony 使用 `fast-xml-parser` 把 Symfony dev debug-container XML 作为只读数据，提取 bundle/编译器生成服务、别名、`container.service_locator_context` 方法参数、直接构造参数/`<call method>` 服务引用及 `<property>` 服务引用；拒绝 DOCTYPE，不解析标量参数值，不启动 Kernel 或项目 PHP。Language Server 只选择 `var/cache/dev/*DebugContainer.xml` 中最新且不早于已索引 `src/`、递归 `config/`、`composer.json`、`composer.lock` 的文件；静态 YAML 在重复服务 ID 上优先。新鲜缓存为公开 bundle 服务提供 Container `get()` 成员链，为 locator、按 callable/参数位置/对象类型复核的编译调用，以及按 owner/名称/类型复核的明确 Required 属性提供 `(compiled)` Hover 与实现 Definition；多个编译目标或源码/配置更新会抑制相应事实。当前 Winstar 真实 XML 解析得到 2779 个可用服务、4416 条直接编译调用参数、507 条 locator 参数，覆盖 1084 个构造函数和 380 个方法调用；当前容器没有直接 property 参数。端到端 LSP 此前已验证 `AuthController::verifyToken(AdminSsoService $sso)` 的编译容器 Hover 和源码跳转。
- [x] `@php-companion/framework-doctrine` 静态识别 Doctrine Mapping attribute 实体、OneToOne/ManyToOne/OneToMany/ManyToMany 的可证明目标，以及标准 ServiceEntityRepository 构造或精确 PHPDoc 泛型绑定；为 find/findOneBy 与 findAll/findBy 输出实体/集合返回类型，绑定证据冲突、动态 target 和自定义查询保持未知，不启动 ORM 或数据库。
- [x] Doctrine 声明类型明确的关联属性通过通用外部属性入口进入统一成员链，保留 private/protected/public、nullability 和实际 to-many 容器；`Collection<int, Entity>` 可经模板方法返回继续导航到实体成员，属性/方法交替链由真实 stdio LSP 验证。
- [x] Doctrine to-many 关联的显式元素事实可沿 `$entity->collection` 直接 foreach 来源传播，循环变量仅在 body 内解析为目标实体；复杂来源链和未声明元素继续保持未知。
- [x] PHPDoc 解析器规范化 PHPStan/Psalm 的 param/return/var/template 标签、template 方差与 template-extends/implements，并让同一目标的工具专用类型优先于基础 `mixed`。自定义泛型集合可沿完整 `IteratorAggregate<TKey, TValue>` 继承链推导 foreach 值；`array-key` 约束只接受 int/string。模板在 nullable/Union/嵌套泛型返回中执行标识符级替换，Doctrine `get(): TValue|null` 可经 `?->` 精确导航，`filter(): Collection<TKey,TValue>` 保持实体类型；语义缓存升至 schema 16。
- [x] 方法级 PHPStan 模板可从单参数箭头函数或普通闭包绑定返回对象：参数类型必须显式；返回类型可显式声明，或从唯一的 `new Class(...)` 箭头表达式/闭包 return 证明。校验回调参数可接受集合元素、返回对象满足模板 bound 后，Doctrine `map(Closure(T):U): Collection<TKey,U>` 在直接链及局部赋值后均传播 U；动态/条件返回、复杂回调或不兼容参数保持 unknown。真实 Winstar Doctrine 源码已验证两种回调形式及对象构造返回推断，stdio LSP 已验证显式箭头形式。
- [x] Doctrine 标准 Repository 方法事实通过 semantic 的可替换外部成员入口进入统一成员查询；PHP 补全可列出四个稳定方法，`find()` 的 nullable 实体返回能经 `?->` 继续成员链，`findAll()`/`findBy()` 的数组元素可在直接 foreach body 内传播；自定义方法保持未知，文件更新/关闭/删除会同步失效。
- [x] Doctrine 默认对象水合查询链传播已证明的实体泛型；自定义 Repository 与 `EntityManagerInterface::getRepository(Entity::class)`、赋值和直接 foreach 均覆盖。改变根/结果形状或显式 hydration 时停止传播，不解释 DQL。
- [x] 自研 Language Server 可在单个具名函数或方法内 Rename 局部变量和普通参数；参数可从声明、作用域引用或唯一解析命名实参发起，并同步更新已解析到同一 callable 的工作区命名实参。提升属性构造实参进入参数/属性同一身份路径。结构化变量引用限定词法作用域，名称冲突、`$this`/超全局、`global` 绑定和跨闭包捕获会拒绝，编辑通过统一 EditPlan 并保持单步 Undo。
- [x] 唯一具名函数 Rename 可从声明或直接解析调用点发起，统一修改定义、导入路径及普通/全限定调用；显式 import alias 保持不变，从 alias 调用点发起会拒绝。semantic、stdio LSP 与真实 Extension Host 覆盖调用点发起和单步 Undo。
- [x] 唯一命名空间常量可从声明或直接使用点 Rename，统一修改声明、`use const` 路径及普通/全限定使用并保留显式 alias；类与 Trait 常量同步声明、`self::`、宿主和精确解析到同一声明的继承访问。大小写敏感 Enum case 可从声明或精确静态访问发起，只修改同一 case 身份并保留大小写不同的 sibling。unit/backed Enum 通过共享成员模型提供 `cases()`、backed `from()`/`tryFrom()`、只读 `name`/`value`、工厂 `static` 返回链、EnumMember 补全类型、原生 case Hover、精确签名帮助、`from()` 缺参/backing value 类型诊断与 `tryFrom()` nullable/nullsafe 访问检查；合成工厂签名按调用文件 strict/weak 模式处理标量；未知 case 不再被语言特例吞掉。动态访问、`constant()`/`ReflectionEnum::getCase()` 字符串查找、多 Trait 同名来源、语义重定向冲突及不完整层级会拒绝。semantic、stdio LSP 与 VS Code 1.136.1 Extension Host 覆盖补全/Hover/Signature Help 及跨文件 Rename Apply/Undo/Redo。
- [x] 非 private 方法普通参数可从声明或唯一解析命名实参按参数位置跨完整接口、父类和重写实现族 Rename；每个声明原有参数名的作用域引用、紧邻标准/PHPStan/Psalm `@param` 及唯一解析命名实参会统一进入一个 WorkspaceEdit。普通函数/方法参数 Rename 同样保持 PHPDoc 一致。自身成员优先于 Trait、Trait 优先于继承成员，保证调用解析采用真实重写签名。层级不完整、可能相关的动态同名调用、提升参数、闭包捕获或任一作用域冲突时拒绝。semantic、stdio LSP 与真实 Extension Host 均覆盖正反例，编辑器验证调用点发起、应用及单步 Undo/Redo。
- [x] public/protected 方法名可从声明或唯一解析调用点发起，在完整接口、父类和重写实现族中同步全部声明及已解析直接调用，包括 `parent/self/static` 调用；新名称与相关层级冲突、复合类型候选无法由同一计划覆盖、动态方法调用、数组/字符串 callable 或不完整层级会拒绝。无法静态解析的普通接收者调用保持不改并属于明确的工作区外/动态引用边界。semantic、stdio LSP 与 VS Code 1.136.1 打包 Extension Host 已覆盖跨文件应用及单步 Undo/Redo。
- [x] public/protected 非提升属性可从声明或唯一解析访问点发起 Rename，在完整类层级中同步重复声明及已解析实例/静态访问；新名称与相关层级冲突、private 同名属性、动态属性访问或不完整层级会拒绝，提升属性由下一条独立身份路径处理。反射、序列化字符串、无法解析的普通接收者及工作区外访问不进入编辑。semantic、stdio LSP 与 VS Code 1.136.1 打包 Extension Host 已覆盖跨文件应用及单步 Undo/Redo。
- [x] 提升属性 Rename 将构造参数与属性视为同一身份：同步参数声明/作用域使用、紧邻标准/PHPStan/Psalm `@param`、直接及继承构造的已解析命名实参和属性访问。构造签名解析会沿类层级找到继承构造，同时保留 `new` 创建的实际子类类型。参数/属性冲突、嵌套闭包捕获、重复属性、Trait、动态属性访问及不完整层级会拒绝。semantic、stdio LSP 与 VS Code 1.136.1 打包 Extension Host 已覆盖跨文件应用和 Undo/Redo。
- [x] Trait 方法与属性可从 Trait 声明或唯一解析的宿主/子类使用点发起 Rename，统一修改 Trait 内部引用和已证明宿主/子类引用；具名 `Trait::method as alias` 在源方法 Rename 时修改源 token 并保留 alias 名。alias 自身可从 adaptation 或精确调用独立 Rename，只修改 alias 身份。多个 Trait 同名方法由完整 `insteadof` 规则收敛到唯一 winner 时，winner Rename 同步被选中方法 token，被排除 Trait Rename 保留 precedence token 并同步自己的具名 alias 源。无唯一 winner、宿主或新名称冲突、动态/字符串引用及不完整消费层级会拒绝。semantic 具备正反例，stdio LSP 与 VS Code 1.136.1 Extension Host 覆盖跨文件 Apply/Undo/Redo。
- [x] 首个第二批重构 Extract Variable 已接入 `refactor.extract`：仅接受块级函数/方法/闭包中完整的简单赋值 RHS 或完整 return 表达式，自动避开作用域变量名冲突；部分子表达式、内联控制语句、赋值/yield/include/require 和损坏语法会拒绝。两个文本编辑由同一版本化 EditPlan 提交，VS Code 1.136.1 Extension Host 已验证应用及单步 Undo/Redo。
- [x] Inline Variable 的精准子集已接入 `refactor.inline`：光标必须位于普通局部变量声明左值，声明后紧邻的 return 或简单赋值 RHS 必须是该变量唯一且完整的使用；多次使用、介入语句、引用赋值、嵌套赋值、yield 和损坏语法均拒绝。声明删除和使用替换由同一版本化 EditPlan 提交，VS Code 1.136.1 Extension Host 已验证应用及单步 Undo/Redo。
- [x] Extract Method 的精准子集已接入 `refactor.extract`：接受普通实例方法体顶层、完整且连续的表达式语句；除 `$this` 外，允许类型可证明的成员接收者和唯一解析平坦调用中明确按值接收的完整实参，并按首次出现顺序生成输入。选区末条可为一个非引用简单局部赋值，当该变量在同一作用域后续真实使用且未同时充当输入时，赋值会转换为新方法 return，原位置接收单一输出。返回类型仅从真实对象声明、唯一调用的原生返回签名或 bool/int/float/string/array 字面量生成；未知结果省略类型，标量不会作为伪类名输出。生成签名复用原生输入类型，并避开继承层级方法名冲突。多赋值/多输出、yield、include/require、闭包、注释边界、未知变量、引用/展开/嵌套或歧义调用、嵌套控制块、静态方法与不完整继承层级均拒绝。两个编辑由同一版本化 EditPlan 提交，VS Code 1.136.1 Extension Host 已验证类型化输入、单一输出及各自单步 Undo/Redo。
- [x] 修改签名的首个精准子集已接入 `refactor.rewrite`：仅从唯一 private 非魔术方法声明上的普通未使用参数发起，要求完整项目索引，并同步删除参数节点、紧邻 PHPDoc 中对应标准/PHPStan/Psalm `@param` 行及所有唯一解析直接调用中的位置或命名实参。被删实参仅允许变量、标量/null 字面量或常量引用，避免丢失调用/构造等求值副作用；参数仍被使用、引用/variadic/提升参数、重复声明、展开实参、未解析引用或列表映射不完整时不提供操作。所有跨文件编辑使用同一版本化 EditPlan。VS Code 1.136.1 Extension Host 已验证声明、PHPDoc、两种调用风格的一次应用和单步 Undo/Redo。
- [x] 从声明发起的非提升 private 属性可沿统一成员解析 Rename；只修改同一属性的声明和已证明访问，拒绝访问点发起及同类属性冲突，并由真实 Extension Host 验证应用和单步 Undo。
- [x] 唯一具名函数可从声明发起 Rename，覆盖解析到同一 FQFN 的调用及 `use function` 目标路径；显式 alias 调用保留 alias，普通字符串/注释不改写，目标 FQFN、调用 namespace 或 import alias 冲突时拒绝。
- [x] 参数名 Inlay Hint 仅出现在唯一解析、扁平、无 named/unpack/variadic 的纯位置调用；参数同名变量、嵌套调用和不完整签名不显示，真实 Extension Host 与既有局部类型提示共同验证。
- [x] `php.argument.type-mismatch` 只报告唯一解析、参数映射确定且对象/null 实参类型可证明的原生签名不兼容；继承兼容、nullable、mixed/动态表达式、嵌套调用、unpack、缺失层级和弱类型标量转换保持静默。
- [x] `php.return.type-mismatch` 使用结构化 return/最小词法作用域检查具名函数和方法；对象继承、nullable、空 return、void/never 冲突可证明时报告，动态表达式和含 yield 的生成器保持静默。语义快照升至 schema 13 并隔离旧缓存。
- [x] `php.assignment.readonly-property` 在目标 PHP 8.1+ 报告可证明位于声明家族外的显式 readonly 属性写入，并始终拒绝 Enum 原生 `name/value` 写入；PHP 8.2+ 进一步使用结构化 readonly class 事实覆盖普通及提升实例属性。复合/空合并赋值、自增减、数组偏移写入、直接引用、唯一已解析签名的按引用参数和属性 foreach 引用属于必然间接修改，在声明家族内同样报告；当前流已确定初始化属性的 `$this` 整体引用遍历在 receiver 范围聚合报告；同一语句块直接 `new`，或来自唯一可解析且通过直接 `return new` 或同块紧邻 `$local = new ...; return $local;`、顺序语句、条件分支、`throw` 终止、`try/catch`、各 arm 直接 `new` 的 `match`、含贯穿/default/局部普通 `break` 的 `switch`、保守可落空的 `while`/`do`/`for`/`foreach`（含循环内局部 `break`/`continue`），以及含普通透传语句或受支持控制流的 `finally` 证明全部可继续返回路径都返回同一具体的新构造类型且不会落空的函数、静态方法或实例方法工厂的局部对象，还会纳入当前作用域可见的提升 readonly 属性，以及索引内无提前退出的自有或实际继承构造器主体在全部正常出口初始化的属性；子类有自有构造器时仅在控制流证明全部正常出口前都调用了可见的 `parent::__construct()` 时合并父摘要，完整条件分支受支持；单臂条件调用、参数、返回已有对象、不同具体类型、可落空、含 `yield`、`goto`、`exit`、跨作用域跳转或其他未支持控制流的工厂、分支构造、含 return/exit/break/continue/goto 的构造器摘要及未初始化属性保持静默。逐版本审计的 `sort`、`array_pop`、`array_shift`、`array_push`、`array_unshift`、`array_splice`、`shuffle`、`usort`、`preg_match`、`preg_match_all`、`parse_str` 内建签名进入同一按引用规则，未知内建函数保持静默；按值调用/foreach 保持只读访问。提升属性在声明构造器主体内再赋值、顺序重复初始化、全部可继续 `if/elseif/else` 分支、完整及局部 break 嵌套 `switch` 正常出口或 `try/catch` 正常出口初始化后的再赋值、循环入口已确定初始化时的循环体再赋值，以及无提前出口恒真 while/do-while/for 或规范整数边界 `for` 的必然第二次迭代会报告；规范有限循环要求同一局部计数器、整数常量初值与边界、`++`/`--` 单步更新、前两次条件为真，循环体不使用计数器且无提前退出。确定无限循环后的语句停止分析。无直接 readonly 写入的 `finally` 可保留 try 合流事实；写入型 finally 在 try/catch 无提前退出时使用并传播正常出口合流，存在提前退出时回退到进入 try 前状态。缺少 default 的 switch、嵌套 continue 或多层 switch 跳转、单臂分支、普通条件或含提前出口循环的初始化、不可达语句和含 `goto` 的 callable 保持未知。外部 unset 报告，类内可能发生在初始化前的 unset 及 readonly 对象的内部成员修改保持静默。semantic 同时覆盖保留 CST 和快照文件路径，stdio LSP、PHP 8.5 运行时对照与 VS Code Extension Host 覆盖。
- [x] `php.property.invalid-readonly-declaration` 在目标 PHP 8.1+ 检查显式 readonly 属性，PHP 8.2+ 检查 readonly class 的隐式只读属性；缺少类型、static 和非提升默认值按属性合并报告，`mixed` 与提升参数默认值保持合法。旧目标版本及语法残缺时抑制，language-server 单元测试和真实打包 Extension Host 覆盖精确属性名范围与稳定消息。
- [x] `php.property.dynamic-deprecated` 在目标 PHP 8.2+ 对唯一具体 class、完整唯一继承层级及独立简单属性赋值发布 Warning；同一变量同一属性在相邻语句已证明创建后，连续赋值不重复提示，`unset` 或其他间隔会恢复诊断。右值能证明为 bool/int/float/string/array/object、整数区间或唯一命名对象时提供首选“声明属性”Quick Fix，使用同一 EditPlan 跨文件插入 public 类型属性；未知值和 `vendor` 声明保持不可编辑。真实声明属性、`__set`、当前类或祖先的 `#[AllowDynamicProperties]`、readonly class、读取、动态名称、Union/Intersection、重复或未解析声明及残缺语法保持静默。semantic、stdio 版本对照和真实打包 Extension Host 覆盖精确属性名范围、跨文件编辑及 Apply/Undo/Redo。
- [x] `php.attribute.invalid-allow-dynamic-properties` 在目标 PHP 8.2+ 精确拒绝内建 `#[AllowDynamicProperties]` 用于 readonly class、interface、Trait 或 Enum；支持全限定名和 import alias，合法普通 class、命名空间同名自定义 Attribute、旧目标版本及残缺语法保持静默。PHP 8.5 运行时对照、semantic、stdio 和真实打包 Extension Host 覆盖。
- [x] `php.parameter.implicitly-nullable` 在目标 PHP 8.4+ 只对默认值恰为 `null` 的非 nullable 原生类型参数发布 Warning，精确标记类型范围；显式 `?T`、含 `null` Union、`mixed`、无类型参数、旧目标版本及残缺语法保持静默。首选 Quick Fix 依原子/Union/Intersection 形状生成合法显式可空类型，analysis、stdio 与真实打包 Extension Host 覆盖 Apply/Undo/Redo。
- [x] PHP 8.2 readonly class 的跨文件声明契约已进入 semantic：`php.inheritance.readonly-mismatch` 精确拒绝 readonly/非 readonly 父子状态不一致，`php.readonly-class.invalid-trait` 沿最多 64 层唯一 Trait 图拒绝直接或传递引入非 readonly 属性。相同 readonly 状态、显式 readonly/无属性 Trait、旧目标版本、未解析或重复身份保持静默；semantic、stdio LSP 与真实打包 Extension Host 覆盖。
- [x] `php.assignment.type-mismatch` 检查可解析对象的原生类型属性直接赋值；只比较可证明的对象变量、`new` 与 `null`，继承、nullable 和未知层级保持保守，动态调用、未知属性、复杂左值及弱类型标量不报告。PHP 参数变量可合法改变运行时类型，因此参数重赋值是固定反例。
- [x] `php.member.possibly-null` 只报告可证明 nullable 对象的直接普通 `->` 成员访问；成员必须真实存在且层级完整，`?->`、显式非 null 分支、mixed、动态成员和未知层级保持静默。PHP 8+ 提供仅替换该运算符的 null-safe Quick Fix，并由真实 Extension Host 验证单步 Undo。
- [x] 标准 `source.organizeImports` 对单 namespace、连续且无注释夹杂的 use 块删除已证明未使用项，并按 class/function/const 与 FQ 名稳定排序；无注释 group use 会展开为规范单项声明并逐成员删除，含注释 group、非连续块和多 namespace 不提供编辑，真实 Extension Host 已验证应用与单步 Undo。
- [x] PHP LS 从完整索引提供 context/公开类型目录及成员 UTF-16 声明位置，PHP 扩展暴露版本化桥命令；TwigPlus 扩展在启动和 PHP 文件变化后有界拉取，Twig LS 校验后合并实时与 metadata 上下文。多 Controller 类型形成 Union，只补全各分支共有成员；Twig 变量可导航到 Controller 来源，共有属性访问可精确导航到一个或多个 PHP 成员声明。
- [x] interop Controller 变量携带每个字面量 Symfony `render()` context key 的精确 PHP 来源范围；多 Controller 合并按 URI/range 去重保留全部键位置。TwigPlus 已消费该事实：完整直接目标模板的外部变量 Rename 一次更新模板内全部未被局部声明遮蔽的引用和全部 PHP context key，并拒绝动态/不完整 context、无来源及名称冲突。两仓协议集成测试覆盖 Prepare、跨语言 edits 和拒绝场景；VS Code 1.136.1 真实双 VSIX Extension Host 已验证跨 PHP/Twig 一次应用及 Undo/Redo 往返。
- [x] Open Source Pack 的核心外部成员已在 VS Code 1.136.1 / WSL 隔离目录完成实际安装与版本记录；移除当前发行版闭源且有付费边界的 Database Client，并删除非核心 CSS Peek、拼写和 Markdown 扩展，最终默认组合为 PHP Companion 加七项外部工具。PHP CS Fixer 0.3.21 的 manifest/许可证文本差异和内置 PHAR 最高支持 PHP 8.3 的限制已如实记录；Winstar 改用项目版 3.95.22 与 PHP 8.5 包装器并实际格式化成功。
- [x] Open Source Profile 组合 Extension Host 门禁加载七项受支持外部扩展及主 VSIX，且不含 Intelephense 或 Symfony Language Tools；完整 Companion 编辑用例继续通过，PHP/Twig/YAML/XML 与内建 JSON formatter 已实际调用，PHP 格式化编辑可应用和单步撤销，EditorConfig 缩进已应用。PHP Debug 经 PHP 8.5.9 / Xdebug 3.5.3 完成真实 launch 会话，PHPUnit 扩展经项目 PHPUnit 9.6.36 执行选定测试并产生哨兵结果。PHPUnit 快速删除临时重命名文件的 `ENOENT` 已记录为限制。
- [x] Open Source Pack 与 Recommended Pack 的默认 PHP 核心已统一为 PHP Companion 自研服务器。Recommended Pack 保留原 ID 作为无迁移升级入口，但 manifest 不再包含 Intelephense；两个 Pack 都设置 `phpCompanion.languageServer.enabled: true`。源码 manifest 测试和最终 VSIX 内容校验同时强制这两个条件，README 与 Release checklist 记录手动旧工作流的关闭设置。
- [x] Symfony Language Tools 0.19.0 Linux x64 已加入两个默认 Pack。Marketplace Gallery SHA-256 与包内 MIT 许可证已核对；真实 VS Code 1.136.1 Extension Host 验证插件实际激活、runtime indexing 与 release metadata 默认关闭，并确认 Companion 完整用例、TwigPlus formatter、YAML/JSON、PHP CS Fixer、EditorConfig、Xdebug 与 PHPUnit 组合不回归。

## 已验证证据

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:extension
pnpm verify:packages
```

字符串内建增量完成后，language-spec 为 10 项、Language Server 为 65 项，十五个组件为 383 项，加仓库既有 30 项共 413 项；该计数取代下方累计证据段中的 62/378/408。重新打包的主 VSIX 已在隔离 VS Code 1.136.1 Extension Host 验证字符串函数 Definition、implode/strtr 重载选择、DatePeriod foreach 与构造重载，以及既有 Generator 推导链路。

高频数组内建增量加入逐版本函数目录，以及 PHPDoc `array<TKey,TValue>` 经 values/filter/map、局部变量与 foreach 的键值传播；typed callback 的参数和返回模板共同参与重载绑定。按引用数组调用会重新评估入口参数类型，保留 pop/shift/排序可证明的值域，并在 push/unshift/splice 等可能替换值域的调用后清除过期元素事实。最终测试与 VSIX 证据记录于 [数组内建符号与泛型传播验收](reports/array-builtins-2026-09-08.md)。

数组内建增量完成后，language-spec 为 11 项、Language Server 为 68 项，十五个组件为 387 项，加仓库既有 30 项共 417 项；该计数取代上方字符串增量的 413 项。目录新增 PHP 7.3 key endpoints、PHP 8.4 find/predicate 回调与 PHP 8.5 value endpoints，并接受合法省略尾部参数的用户闭包。重新打包的主 VSIX 已在隔离 VS Code 1.136.1 Extension Host 验证 values/map/find/first/pop/splice 返回元素 Definition、splice 后不保留输入数组的过期元素 Definition、`array_is_list` 内建导航及全部既有宿主用例，SHA-256 为 `5f1464b12078f238f5bc2a41cf5b903ad7bc05db1424aa0ed8bf13a71ef155d2`。

核心迭代函数增量加入 `is_iterable`、`iterator_to_array` 与 `iterator_count`，并按 PHP 8.2 边界切换 `Traversable`/`Traversable|array`。模板推断可从 PHPDoc Union 的兼容分支沿 `IteratorAggregate<TKey,TValue>` 到 `Traversable<TKey,TValue>` 绑定，省略的 literal 默认参数参与条件返回求值，因此默认调用保留键值、`preserve_keys=false` 精确返回 list 值域。最终证据见 [迭代函数与条件返回验收](reports/iterator-functions-2026-09-08.md)。

该增量完成后，Language Server 为 69 项，十五个组件为 388 项，加仓库既有 30 项共 418 项；九个 PHP 7.2–8.5 stub 均为 0 个 parser error。十五个 tarball 隔离安装通过，主 VSIX 在隔离 VS Code 1.136.1 Extension Host 退出码为 0，SHA-256 为 `8a4b4b40ca326d18a3f8421554e2aab9850401fb566c64c3098f754d2b103dc8`。该计数与产物取代上方数组增量证据。

类与对象检查增量完成后，`get_class($object)` 可传播 `class-string<具体类>`，PHP 8.0 失败返回边界和 PHP 8.1 `enum_exists` 门槛进入共同目录。Language Server 为 70 项，semantic 为 181 项，十五个组件共 390 项，加根仓库 30 项共 420 项；九套 stub 均为 0 个 parser error。最新主 VSIX 的隔离 Extension Host 退出码为 0，SHA-256 为 `007eb33201f499f964f3fafd04dd67fb7aa1113b6501b4d968a43f3d5e6eadcd`。完整证据见 [类与对象检查函数验收](reports/class-object-functions-2026-09-08.md)。

变量类型谓词增量加入 PHP 7.2–8.5 函数和别名目录，并将已解析全局内建调用的正向分支事实接入 Union/mixed 参数类型。命名空间同名函数、范围外和赋值后保持保守；该阶段 semantic snapshot 升至 schema 38，后续补集事实已升至 schema 39。阶段证据见 [类型谓词与分支收窄验收](reports/type-predicate-narrowing-2026-09-08.md)。

2026-09-08 当前分别有：language-spec 8 项、phpdoc 12 项、parser 41 项、project 6 项、index 7 项、type-system 17 项、interop 3 项、semantic-provider 5 项、semantic-provider-host 4 项、framework-symfony 20 项、framework-doctrine 2 项、semantic 180 项、refactor 6 项、language-server 62 项、testkit 5 项（含真实 stdio、请求取消、快速编辑版本保护、标准索引进度、项目优先依赖截断、Remote URI、多根/嵌套根隔离、持久缓存、文件失效、Symfony/Twig interop、resource/Autowire 服务补全与导航、公开服务容器字面量调用、按类型/Target/bind/Union/Intersection/DNF 构造注入 Hover/实现导航、Required 方法/属性、编译容器 bundle 服务与公开方法私有 locator、DNF 参数兼容、完整成员链赋值传播、Doctrine Repository 主链、PHPStan 泛型集合迭代与方法模板、泛型继承参数替换、唯一调用、Callable 逐实参类型门禁/条件返回/成员链结果及同块局部值/数组更新、动态调用局部赋值和直接返回链、完整条件、switch、try/catch/finally、规范非空整数 for、显式单轮循环与非空 foreach 合流诊断、PHPDoc/原生类型冲突、接口/抽象方法、构造函数、访问器、Override、Extract Variable/Method、Inline Variable、private 参数及调用点删除、类型/函数/命名空间与类/Trait 常量、Enum case、private 与 public/protected 继承族方法、普通/提升/Trait 属性、可证明动态成员及 Trait 方法/局部变量/参数与继承方法参数 Rename、未使用/组织 import、继承方法签名兼容、final 继承限制、直接不可达语句、PHP 7.3–8.5 代表语法边界及兼容层反例、readonly class 目标版本对照、readonly 声明契约、PHP 8.2 `AllowDynamicProperties` 目标与动态属性创建、readonly 间接修改与确定性重复初始化、类型/函数/常量自动导入、命名参数、对象/null 参数、返回值、类型属性赋值及 nullable 成员访问诊断、参数名/局部类型提示、版本/重复/PSR-4/未解析类型、Enum 成员、成员静态性/可见性、魔术方法可见性与参数诊断、Quick Fix、Hover、Definition/Type Definition/Implementation/Type Hierarchy/References、Semantic Tokens 与内建符号）、既有 30 项，共 408 项测试通过；TypeScript 与 ESLint 通过。VS Code 1.136.1 Extension Host 已重新验证服务器异常退出后的自动恢复、上述诊断、符号、成员补全、Hover、Signature Help、Definition、Type Definition、Implementation、References、Type Hierarchy、Inlay Hints、namespace 常量与 Enum case 定义、Symfony 默认/Target/bind/扁平 Union/Intersection 构造注入及 Required 方法/属性 Hover/实现导航、PSR-4/未使用 import Quick Fix、Organize Imports、各类 Rename、PSR-4 Safe Move、Extract Variable/Method、Inline Variable、private 参数及调用点删除和代码生成；命名空间/类/Trait 常量、Enum case、公开继承族与 Trait 方法、普通/提升/Trait 属性、继承方法参数、Extract Variable/Method、Inline Variable、private 参数删除、构造函数、Import、nullable 成员、隐式可空参数与动态属性声明 Quick Fix、类型 Rename 与 Safe Move 命令具备真实 Undo/Redo 往返。最终打包 VSIX 已在隔离配置中运行同一套 Extension Host 用例；PHP Companion 与 TwigPlus 最终 VSIX 联调 31/31 通过，5 组输入回放报告通过。十五个组件从真实 tarball 在仓库外安装运行通过。

## 尚未完成

- [ ] P0 全部精准正反 fixtures 和真实插件组合操作核验；Open Source Profile 已在 Linux、Windows、macOS 完成冻结版本隔离安装及 PHP/Twig/YAML/XML/JSON、EditorConfig、PHP CS Fixer、Xdebug 与 PHPUnit 组合门禁，PHPUnit 快速删除日志限制已记录；更完整规则组合、Windows 客户端连接 WSL Remote 和人工操作仍待验证。标记 testkit、版本代表样例与冻结性能预算已建立，版本矩阵仍需随实现逐项关闭未支持状态。
- [ ] parser 的完整表达式事实；打开文档已使用 Tree edit 增量重解析并保留全量语义等价，匿名类和闭包捕获已完成。PHPDoc 模板继承、方差标签和条件类型 AST 已解析；完整嵌套条件相关性及方差安全审计仍待完成。
- [ ] Composer 嵌套项目、完整逐版本内建符号生成；path/symlink、多个 workspace root、exclude-from-classmap、持久快照、首批版本化标准异常树、Date/Time、字符串及核心迭代/对象契约已实现。八个已审计扩展组已支持 workspace folder 与 Composer 显式禁用选择，仍需其余扩展/核心符号、启用扩展版本约束、自动环境探测、声明/方法体分层和依赖级增量失效。
- [ ] type-system 高级类型；semantic 当前覆盖可证明参数、`$this`、`new` 赋值、单一返回链、PHPDoc 基础类型、成员可见性、基础 References、首批正向控制流收窄，以及完整 if/switch/try/catch/finally、安全 do/while、规范非空整数 for、显式单轮循环、可证明非空 foreach，并在一般 while、条件 for 与动态 foreach 的循环体赋值独立且完全可证明时合并循环前后局部类型；自依赖、引用、复杂跳转、循环体读取目标和完整泛型推断仍未完成。
- [x] 类型、函数与命名空间常量的自动导入候选使用统一 semantic 查询。类型按已可见状态和 namespace 邻近度排序；函数/常量按当前 namespace、显式 import、PHP 全局回退及新 import 分级，外部候选再按共同 namespace 前缀和距离排序。名称与 FQCN 负责确定性决胜，Language Server 通过分类 `sortText` 保持顺序并携带精确 import 编辑。证据见 [类型补全排序验收](reports/type-completion-ranking-2026-09-10.md)与[函数和常量补全排序验收](reports/function-constant-completion-ranking-2026-09-10.md)。
- [x] namespace 内源码类名严格区分未限定名、相对限定名、显式 import 和 `\\FQCN`。全局类不会作为未导入类名的隐式 Definition 或成员类型，补全会附加必要 `use`；函数和常量的 PHP 全局回退保持独立。内建 `is_countable()` 使用显式 `\\Countable`，语义快照为 schema 68、持久缓存为 v39。
- [x] `namespace\\Symbol` 对类、函数和常量显式绑定当前 namespace；普通相对限定函数/常量不使用仅适用于未限定名称的全局回退，namespace alias 可展开限定调用。命名空间常量、类常量和 `use const` alias 按 PHP 规则区分大小写，查询、Definition、References 与 Rename 共用相同身份。
- [ ] 精准诊断、完整现有工作流迁移、高级类型与安全重构；类型/唯一函数/private 方法/public 与 protected 继承族方法/Trait 方法/private、public/protected、提升与 Trait 属性/局部与继承方法参数 Rename、PSR-4 Safe Move、Extract Variable/Method、Inline Variable、接口/抽象方法、构造函数与访问器生成已迁移到统一 EditPlan；唯一 winner 的 Trait precedence 自动改写已完成，动态/字符串引用及其余第二批重构仍待实现。
- [ ] Symfony/Doctrine 全部框架能力；TwigPlus interop 的 Controller 上下文、类型成员、Union 合并、Controller 来源导航、PHP 成员精确导航及直接目标模板上下文变量 Rename，Symfony 确定性 resource、显式服务、Autowire service ID 补全/导航、公开服务字面量 Container get，以及 bind、命名 arguments、字面量 Target/具名别名、同名类型、唯一 resource 实现、成员一致的扁平 Union/Intersection、完整规范 alias 的 PHP 8.2 DNF 构造注入、含非私有原型继承的公开 Required 方法/具名对象属性、新鲜 dev 编译容器的 bundle 服务、公开方法私有 locator、直接编译构造/方法调用及 Required 属性已实现；Doctrine attribute、标准 Repository、关联集合/迭代和可证明对象返回的箭头函数/普通闭包 map 已实现；无法映射到已索引公开方法的 callable、缺失或过期容器缓存场景的静态替代，以及动态/条件回调返回推断仍待完成。
- [x] R1 首发候选：Linux / WSL 的 S01–S08 已通过。Safe Move 命令默认 Preview，以单个 WorkspaceEdit 原子提交文件、namespace 和引用，并通过一次 Undo/Redo 往返；资源管理器移动继续验证双向协调与重复 import 收敛。冻结诊断 corpus 的 TP=17、FP=0、FN=0，4/21 未知或不完整场景均正确抑制。R4 F01–F14 与完整系统矩阵未完成。
- [ ] 打包发布候选、公开 npm/Marketplace 发布。

当前核心编码闭环和开源组合已达到 R1 首发候选；打包主扩展及七扩展 Open Source Profile 已通过 Linux x64、Windows x64 与 macOS arm64 自动门禁。Windows 客户端连接 WSL Remote、多小时真实项目会话和 R4 最终功能仍未完成。逐项证据见 [R1 Linux / WSL 验收审计](reports/r1-acceptance-linux-wsl-2026-09-06.md)、[跨平台候选验收报告](reports/cross-platform-candidate-2026-09-14.md)及[Open Source Profile 版本与 Provider 组合门禁](reports/open-source-profile-version-gate-2026-09-15.md)。

JSON 高频目录现已覆盖 PHP 7.2–8.5 的 `json_encode`、`json_decode`、`json_last_error`、`json_last_error_msg`、主要选项/错误常量，以及 PHP 7.3 `JSON_THROW_ON_ERROR`、PHP 8.1 `JSON_ERROR_NON_BACKED_ENUM` 和 PHP 8.3 `json_validate` 门槛。PHP 7 返回通过 PHPDoc 表达，PHP 8 使用原生参数和返回类型；补全、Signature Help、Definition 与返回传播共用版本化内建文档。完整证据见 [JSON 内建目录验收](reports/json-builtins-2026-09-10.md)。

文件系统高频目录现已覆盖整文件读写、流打开/关闭/读取/写入、文件与目录检查、大小、basename/dirname/pathinfo/realpath/glob，以及常用目录创建、复制、移动和删除操作。`resource` 参数和返回通过 PHPDoc 保留，`false` 失败边界进入返回传播；PHP 7 的不可空尾部长度用精确重载表达，PHP 8 的 nullable length 使用原生签名。完整证据见 [文件系统内建目录验收](reports/filesystem-builtins-2026-09-10.md)。

序列化和 URL 高频目录现已覆盖 serialize/unserialize、Base64/十六进制、URL 编解码、`parse_url`、`http_build_query` 与 `get_headers`。`parse_url` 按是否省略 component 区分返回范围，所有失败返回继续保留；PHP 8.0 的 `get_headers` 第二参数从 int `format` 切换为 bool `associative`，与命名参数补全使用同一版本化签名。完整证据见 [序列化与 URL 内建目录验收](reports/encoding-url-builtins-2026-09-10.md)。

PDO 高频目录现已覆盖 `PDO`、`PDOStatement`、`PDOException`、跨驱动稳定常量、连接与事务、预处理、绑定、执行和结果抓取。`prepare`/`query`/`exec`/`quote`/`fetchObject`/`getColumnMeta` 保留失败返回，PHP 7 与 PHP 8 参数身份独立生成；`PDO::connect(): static` 和 `PDOStatement::setFetchMode(): true` 从 PHP 8.4 起可用。完整证据见 [PDO 内建目录验收](reports/pdo-builtins-2026-09-10.md)。

LanguageClient 现在先注册客户端、再注册所有可能发送通知的监听器，并以最后注册的关闭闸门优先阻止新通知；VS Code 逆序清理会先移除通知源，再关闭 stdio。纯净与 Open Source Profile 的同一主 VSIX 均以退出码 0 完成，PHP Companion 自身的 `ERR_STREAM_DESTROYED` 不再复现；Symfony Language Tools 0.20.0 的退出 EPIPE 仍具竞态性并作为第三方限制保留。证据见 [LanguageClient 关闭生命周期验收](reports/language-client-shutdown-2026-09-10.md)。

## 2026-09-09 首发候选收口复验

- `pnpm check` 通过；十五个组件 460 项、根仓库 33 项，共 493 项测试通过，TypeScript、ESLint、三个 VSIX 构建及内容检查同时通过。
- `pnpm verify:packages` 从真实 tarball 在仓库外安装并运行十五个组件。
- 包含 Symfony Language Tools、TwigPlus、YAML、PHP CS Fixer、PHP Debug、PHPUnit 与 EditorConfig 的隔离 Open Source Profile 通过完整打包 Extension Host 回归。
- 独立安装默认启用自研服务器；若已安装 Intelephense 且用户没有显式配置则保留旧 Provider，显式 true/false 优先。纯策略测试和删除 fixture 显式开关后的纯净/开源组合打包 Extension Host 均通过；旧语义 Rename 路径的最终移除仍属 P9 后续工作。
- 本轮产物校验值、命令和外部插件关闭期日志边界见 [首发候选收口验证](reports/release-candidate-linux-wsl-2026-09-09.md)。

## 2026-09-08 静态路由补全增量

- 自研 framework-symfony 提供 YAML 路由声明、显式 YAML 导入及 name/path prefix 事实；重复键、动态参数、环境分支、localized path 和通配导入不被猜测为确定声明。
- PHP LS 在语义证明方法属于 AbstractController 或 Symfony 路由接口时，提供常规 `config/routes.yaml/yml` 及显式导入的路由名称补全，替换整个字符串内容；同名普通方法不触发该能力。
- 读取限制为 64 个文件、单文件 1 MB，阻止路径或 symlink 逃出项目；未保存 YAML 优先，取消或 PHP 文档版本改变时放弃结果。
- framework-symfony 10 项、language-server 51 项测试通过，包含真实 stdio 的完整候选断言、普通方法反例和未保存路由更新。其他测试计数沿用上次记录，本轮没有把局部测试冒充全部回归。
- 仍未完成：Attribute/PHP 路由配置、glob/环境/本地化导入、运行时与自研补全的能力切换，以及路由查询性能矩阵；静态路由整体条目保持未完成。
- 新构建 VSIX 的完整 Open Source Profile Extension Host 退出码 0，新增断言确认自研静态 YAML 路由候选与 Symfony Attribute 导航同时工作；TypeScript、相关 ESLint、VSIX 校验与差异检查通过。

## 2026-09-08 路由补全字符串正确性

补全编辑现在按 PHP 原字符串的引号类型转义路由名中的反斜线、引号及双引号中的 `$`，保持 YAML 名称对应的运行时字符串值。框架方法大小写不敏感；`GENERATEURL()` 与标准形式使用同一语义归属门禁。框架组件增加特殊名称和 Unicode 反例；真实 stdio 覆盖单/双引号编辑、大写调用与未保存 YAML。通过 Winstar `bin/php-runtime` 对两种引号的生成表达式执行 Base64 等值对照，均通过。

本次源码验证不代表已有 VSIX 自动更新；最终交付前仍须重新构建、执行打包门禁并更新产物校验值。

## 2026-09-08 具名路由参数

路由补全现在支持以真实声明中首个参数名传递路由名，并允许先传入其他具名参数，例如 `generateUrl(parameters: [], route: '...')`。参数名由语义工作区返回的方法签名验证；不会把 `name:` 与 `route:` 混为一谈。重复参数、位置参数与具名路由冲突、具名参数后跟位置参数和 unpack 场景拒绝提供该补全。框架组件 12 项测试通过，真实 stdio 验证重排调用返回完整路由候选、错误参数名不返回路由。

具名参数与字符串转义已进入重新构建的主扩展 VSIX；完整组合 Extension Host、51 项 LS 回归和 VSIX 内容校验通过，产物校验值见 Symfony 组合报告。这取代上节“尚未重打包”的时间点状态，不代表 Attribute 补全或整个 R4 已完成。

## 2026-09-08 路由 Provider 所有权

已接入按工作区的 Symfony 路由补全切换：安装外部 Symfony 插件且启用其运行时索引时，停止该根目录的自研静态候选；关闭后恢复，PHP 其他语义功能不受影响。adapter 在配置/扩展/工作区变化时发送完整快照，并在服务器初始化与重启时读取最新选择。真实 stdio 测试覆盖停止、恢复、非法值保持原状态，以及嵌套根优先；尚需真实编辑器中切换运行时模式的独立验收，本次不能据此关闭整个 Provider 组合验收条目。

Provider 所有权切换已补真实编辑器验收：新 VSIX 在隔离组合中完成静态候选停止/恢复及 PHP 方法导航保持可用，完整 Extension Host 退出码 0，证据与新产物哈希见 Symfony 组合报告。此项取代上一时间点的“切换尚待编辑器验收”，外部运行时索引/补全能力及其余路由类型仍未完成。

## 2026-09-08 Attribute 路由声明与显式文件导入

framework-symfony 通过 PHP AST 提取明确命名的 Symfony Route Attribute，解析 import alias / 全限定名并排除同名自定义 Attribute；组合首个类级 Route 的 name/path 前缀与方法 Route，保留同一方法上的多个声明，并支持没有方法级 Route 时明确命名的 invokable 类路由。动态名称、环境/本地化、重复参数和残缺语法保守降级，不执行项目代码。

PHP LS 仅消费常规 YAML 路由配置通过 `type: attribute` 显式导入的 `.php` 文件，并叠加导入前缀。真实 stdio 对照验证未导入 Attribute 不出现在候选中、加入导入后出现正确名称与 path，删除导入后恢复原候选。框架组件 15 项、语言服务器 51 项测试通过。

尚未完成：目录/glob Attribute 导入、自动生成名称、继承方法路由、完整环境/本地化规则；这里的明确声明不代表全部 Symfony Runtime 路由表。参考官方 Symfony 7.4 `AttributeClassLoader` 的类级 globals、方法路由与 invokable fallback 规则。

Attribute 显式文件导入已通过新 VSIX 的完整组合 Extension Host：两个来源路由候选及提供者切换断言通过，产物哈希记录在 Symfony 组合报告。该增量不关闭目录/glob 和完整框架路由验收项。

## 2026-09-08 Attribute 目录导入

显式 `type: attribute` 目录资源支持递归 PHP 文件发现和导入前缀。目录按稳定顺序遍历，以 realpath 祖先集合终止目录 symlink 循环，并沿用项目路径边界、64 个资源预算、单文件 1 MB 和取消检查；非 PHP 文件及隐藏目录不加入候选。存在尚不支持的通配符或动态 exclude 时标记导入未解析，不忽略排除规则；明确文件/目录及其列表已支持。

框架组件 16 项测试通过；真实 stdio 的嵌套目录 fixture 包含循环 symlink 与伪 PHP 文本文件，最终候选严格只有预期路由。glob、通配符 exclude、资源 namespace 映射和完整环境规则仍待实现。本增量的源码测试不代表已有 VSIX 已重建；目录模式的编辑器 fixture 已准备，打包宿主验证仍待下一次构建。


## 2026-09-08 显式路由排除规则

YAML 路由导入支持 `exclude` 的文件、目录和字符串列表，路径相对于声明该导入的 YAML 文件解析，遍历前执行完整路径边界匹配。真实 stdio 验证排除目录、排除文件及相近目录名反例；未支持的通配符/参数化排除仍保持未解析，避免错误包含被排除路由。框架组件 16 项测试通过。

目录导入和明确排除已通过新 VSIX 组合宿主验收，前提是启动前配置 PHP 命令，再单独切换运行时开关。另发现连续配置修改期间 Symfony Language Tools 0.19.0 的事件循环退出，保留为开放组合缺陷；证据及持久化错误摘录见 Symfony 组合报告，未将复测通过等同于缺陷修复。


## 2026-09-08 有界路由 glob 与独立安装验收

resource/exclude 已支持共享 glob 匹配，覆盖递归 PHP、YAML 扩展名候选、字符集合、单字符和有界花括号选择；拒绝范围展开、extglob 和参数化路径。框架 17 项、LS 51 项、实际 VSIX 组合断言和 15 个组件 tarball 隔离安装通过。最新范围、产物哈希和宿主开放异常见 [增量报告](reports/symfony-route-glob-2026-09-08.md)。此项取代旧记录中 glob 尚未实现的状态，最终框架/平台验收仍开放。


## 2026-09-08 PSR-4 路由目录映射

已实现明确 `resource: {path, namespace}` Attribute 导入，并按目录/文件名验证目标类身份；同文件额外类、错误 namespace 和被排除文件不进入候选。框架 18 项测试、语言服务器完整 51 项测试（含映射正反例的真实 stdio）、相关 TypeScript 构建和 ESLint 均通过。此增量暂为源码验证，上一 glob 报告的 VSIX 不包含此改动；最终发布前仍须重建并执行组合宿主验收。


## 2026-09-08 标准 Loader 默认路由名称

明确策略下支持 FrameworkBundle / Routing 自动命名、类级前缀、同一方法的未命名序号及 invokable 类 fallback。LS 仅在根 Composer 声明 FrameworkBundle 依赖时启用该默认策略。20 项框架测试、51 项 LS 测试与相关 ESLint 通过；真实 PHP 8.5 包装器执行 Symfony AttributeRouteControllerLoader 得到相同结果。

对照脚本：[Loader oracle](reports/symfony-route-name-oracle-2026-09-08.php)。本地执行依赖脚本注明的 Winstar vendor autoload，不启动应用 Kernel。输出为 `["prefix_app_demo_show","prefix_fixed","prefix_app_demo_show_1","prefix_app_demo_index"]` 和 `["app_single__invoke"]`。自定义 Loader、非 ASCII 默认名、继承、环境及自动 FQCN 别名仍未完成。此增量与前一 PSR-4 映射均待下一次 VSIX 重建/组合验收；现有 VSIX 不代表已包含这些功能。


## 2026-09-08 PSR-4 / 默认名称组合宿主验收

前两节增量已进入新主扩展 VSIX，实际 Open Source Profile 精确候选与 Provider 切换断言通过，退出码 0。新产物哈希、原始日志、已执行检查及仍开放异常见 [组合报告](reports/symfony-route-mapped-2026-09-08.md)。此项取代前两节“尚待 VSIX 重建”的时间点状态，不关闭整体框架与最终验收。


## 2026-09-08 编辑器 fixture 保存一致性

已修复测试清理直接覆盖 dirty 文档磁盘内容的问题，改用 WorkspaceEdit / TextDocument.save 并断言恢复后的缓冲区与磁盘一致。完整组合宿主复测退出码 0，日志保存冲突为零；原有 Apply/Undo/Redo 验证保留。PHPUnit ENOENT 和通知失败仍开放，见 [保存一致性报告](reports/fixture-restore-2026-09-08.md)。


## 2026-09-08 PHPUnit 发现范围与完整恢复

隔离 Profile 补充真实 testsuite 配置，单文件与全套测试分别执行并验证结果标记。Safe Move 恢复前保存编辑计划涉及的全部文件，避免遗漏引用触发保护。完整组合测试退出码 0；ENOENT、保存冲突、通知失败和 unknown error 均为零，仅保留预期 alias Rename 拒绝。此项关闭已配置 Profile 的普通源码误扫描与 fixture 清理问题；真实测试文件移动竞态及外部 Symfony 配置变更问题仍不作已修复声明。见 [发现范围报告](reports/phpunit-discovery-2026-09-08.md)。


## 2026-09-08 非 PSR-4 自动移动与测试文件变化

修复自动 Explorer 移动对映射外测试文件误触发 Safe Move 错误的问题；跨映射边界和显式 Safe Move 保留校验。新 VSIX 通过测试文件 Move/Undo/Redo 后逐次全套执行及源文件身份核对，原有 PSR-4 场景和 30 项根单测通过。日志无移动/保存/ENOENT 错误，但外部 Symfony EPIPE 再现，仍属开放稳定性问题。见 [增量验收](reports/unmapped-move-2026-09-08.md)。

## 2026-09-08 完整终止流后的不可达诊断

`php.control-flow.unreachable` 除直接 return/throw 外，现可证明完整
`if/elseif/else`、全部 try/catch 终止，以及必然终止的 finally。任一分支可继续、
缺少 else 或不受支持的控制流仍保持静默；分支内部原有不可达检查继续生效。
遍历限制为 100,000 节点和 256 层，耗尽时撤销本轮全部不可达结果。专项分析测试
29 项及完整语言服务器 52 项回归作为本增量门槛。后续已增加含 default 的完整
switch 与 case 贯穿；break、缺少 default 和不支持的控制转移保持静默。字面量
`while (true)`、`do ... while (true)` 和条件为空的 for（允许初始化/更新表达式）在
体内无 break/goto 时也会
终止外部流；动态条件和可退出循环保持静默。尚不扩展到一般常量求值、never 调用和
跨函数分析。

新主扩展 VSIX 的真实 Open Source Profile 进一步验证冻结诊断数量与精确范围：完整
条件后的语句被标记，可继续 else 后的语句保持静默，宿主退出码 0。产物哈希、首次
失败修正和外部 Symfony EPIPE 边界见[专项报告](reports/unreachable-complete-flow-2026-09-08.md)。

随后同一门禁加入完整 switch 正例和含 break 的反例，新 VSIX 要求恰好三条精确
范围并通过。最终运行未出现 EPIPE，但只作为单次未复现记录，不关闭该间歇问题。

恒真循环增量也已进入后续 VSIX：真实宿主要求第四条精确范围来自
`while (true)`，含 break 的循环后语句保持静默；宿主退出码 0，相关五类错误计数
均为零。最新哈希和日志位置见同一专项报告。

条件为空且带初始化/更新表达式的 for 已进入再下一版 VSIX，冻结集合增至五条并
通过；动态条件 for 的专项反例保持静默。该次外部 Symfony 连接流销毁再次出现，
故上一时间点的单次干净日志不构成缺陷关闭证据。

## 2026-09-08 原生 never 调用终止流

完整项目索引下，唯一解析且实参兼容的独立函数、实例方法或静态方法调用，在其原生
返回类型严格为 `never` 时进入终止流。PHPDoc-only never、重复声明、类型不兼容、
嵌套赋值和未解析调用保持静默；PHP 8.1 以下不启用。语义完整 180 项、语言服务器
完整 54 项及相关 ESLint/构建通过。真实 VSIX 证据在本节后续更新，不以源码测试
替代编辑器验收。

该能力已进入新主 VSIX；实际 Open Source Profile 冻结诊断集要求六条精确范围并
通过，新增项严格为 `unreachableAfterNeverCall();`。产物哈希、stdio 正反例和日志
计数见[原生 never 验收报告](reports/native-never-flow-2026-09-08.md)。

## 2026-09-08 原生 never 声明的正常结束路径

新增稳定错误码 `php.never.fallthrough`。PHP 8.1+ 的原生 `never` 函数或方法仅在
有界控制流证明至少一条路径会正常到达函数体末尾时报告；空函数体、缺少 else 的
条件分支、无 default 的 switch、动态条件循环和可 break 的恒真循环属于已支持
正例。全部分支 return/throw/exit、无退出跳转的恒真循环以及已由完整索引证明的
原生 never 独立调用可终止该路径。抽象方法、普通未知调用、goto/continue、未支持
语句或预算耗尽保持静默。显式 `return` 继续由现有 `php.return.type-mismatch`
处理，不发布重复诊断。

最终门禁已通过：语言服务器 56 项、语义组件 180 项、相关 TypeScript/ESLint、
15 个组件 tarball 隔离安装、VSIX 内容校验及真实 Open Source Profile。主 VSIX
中的新诊断精确命中 `invalidNeverFallthrough`，未知调用反例保持静默，宿主退出码 0。
产物哈希、日志计数以及首次由 PHP CS Fixer 版本门禁导致的失败见
[专项报告](reports/never-fallthrough-2026-09-08.md)。

## 2026-09-08 原生值返回类型的缺失 return

同一有界控制流现发布 `php.return.missing`：具有原生值返回类型的函数或方法在可证明
存在正常结束路径时报告 Error。nullable 和 mixed 同样检查；void、never、Generator、
抽象声明、未知调用及未支持路径保持静默。语言服务器 57 项、隔离 Profile 和开源组合
Profile 完整宿主均通过；组合运行仍再现外部 Symfony EPIPE。精确边界、PHP 8.5
runtime 对照、产物哈希和日志见[专项报告](reports/missing-native-return-2026-09-08.md)。

## 2026-09-08 嵌套原生 never 调用

原生 `never` 终止事实已从独立调用扩展到赋值、普通参数和其他必经表达式位置，并把
完整表达式范围交给不可达分析。短路右侧、三元/match arm、nullsafe 参数和 nullsafe
方法自身仍保持可达；短路左侧、条件表达式的条件和 nullsafe 接收者可作为必经位置。
完整索引、唯一解析、原生返回类型、实参兼容与 PHP 8.1+ 门禁保持不变。Parser 40
项、Semantic 180 项、Language Server 57 项、15 个组件 tarball 隔离安装和真实
Open Source Profile 均通过；冻结不可达集合新增且只新增嵌套赋值后的一个精确范围。
产物哈希、格式化引擎身份与日志计数见
[专项报告](reports/nested-native-never-flow-2026-09-08.md)。

## 2026-09-08 控制条件中的原生 never 调用

终止事实进一步覆盖 `if`、`while`、`switch` 的 condition、`for` 的初始化与 condition，
以及 `foreach` iterable。控制条件的短路右侧、`for` update 和 `do...while` condition
继续保持静默。Parser 41 项、Semantic 180 项、Language Server 57 项、15 个组件
tarball 隔离安装及实际 Open Source Profile 均通过；冻结不可达集合新增且只新增
控制条件后的一个精确范围。产物哈希和日志计数见
[专项报告](reports/never-control-conditions-2026-09-08.md)。

## 2026-09-08 嵌套 throw-expression 控制流

PHP 8+ 的 throw-expression 已进入同一有界控制流：赋值、参数及普通必经表达式可终止
后续流，三元或 match 仅在全部结果均终止时成立；短路右侧和部分终止分支保持可达。
该事实同时用于不可达、原生 `never` 正常结束和原生值返回缺失 return。Language
Server 58 项、15 个组件 tarball 隔离安装及实际 Open Source Profile 均通过；冻结
不可达集合新增两个精确范围，短路反例保持可达。产物哈希与外部 Symfony stream
destroyed 复现计数见[专项报告](reports/nested-throw-flow-2026-09-08.md)。

## 2026-09-08 变量类型谓词与正向分支收窄

内建目录现覆盖基础类型、`scalar`、`numeric`、`callable`、`iterable`、`countable`
及历史别名，并按 PHP 7.2–8.5 精确控制版本边界。Parser 为直接谓词条件及可证明
为真的 `&&` 子条件记录有范围的类型事实；Semantic 仅在名称解析到全局内建函数时
收窄 Union 或 mixed，命名空间同名函数、否定条件及范围外代码不会误用事实。新增
持久事实最初使 semantic snapshot 升至 schema 38；后续补集事实加入否定标记后升至 schema 39。

最终门禁通过：15 个组件共 393 项测试和根包 30 项测试通过，其中 Parser 42、
Semantic 182、Language Server 71 项；九个版本 stub 分别有 254、258、273、284、
290、290、291、302、304 个 callable 且 parser error 均为 0。15 个组件 tarball
通过隔离安装，主 VSIX 与两个扩展包通过内容校验。打包版 VS Code 1.136.1 宿主确认
内建定义跳转、正向分支零误报及分支外唯一精确诊断，退出码 0；主 VSIX SHA-256 为
`8eddccf35a772e605cc375f8bf4d21f127b0d6ec52251637a691d13b3149fb20`。完整范围与日志
位置见[专项报告](reports/type-predicate-narrowing-2026-09-08.md)。

谓词补集随后覆盖 `!is_*` 真分支、elseif/else 链、提前终止后的同块继续路径，以及
确定为假的析取条件。有限 Union 可连续排除多个已证明成员；mixed 补集、假合取、
真析取和 namespace shadow 继续保持 unknown。直接可证明的具体或 mixed 局部副本
也会消费谓词事实，局部重赋值立即失效，动态 mixed 数组写入仍保持 unknown。
严格非空和正反 `instanceof` 事实也已统一进入参数及局部副本的实参诊断。最终门禁
为 15 个组件 403 项、根包 30 项，其中 Parser 44、Semantic 186、Language
Server 75 项；15 个组件 tarball 隔离验证和打包版 VS Code 1.136.1 宿主均退出 0。
主 VSIX SHA-256 为
`e70f1aaaf5bbdc4c9c637a95f642e9769c4ee31178778a3d8aaee8977a35e953`，完整证据见
[补集路径验收报告](reports/type-predicate-complements-2026-09-08.md)。

## 2026-09-08 属性路径类型谓词收窄

全局内建 `is_*` 谓词现在可收窄直接变量根、静态属性名、非 nullsafe 的单层或多层
可见属性路径。根对象赋值、任一路径前缀写入或 unset、链上方法调用、引用逃逸及
把根对象传给已完成调用会撤销事实；动态成员、nullsafe 路径和命名空间同名函数
保持 unknown。Semantic snapshot 升至 schema 40。

最终门禁通过：15 个组件 406 项、根包 30 项，其中 Parser 45、Semantic 187、
Language Server 76 项；15 个组件 tarball 隔离验证、VSIX 内容验证及打包版 VS Code
1.136.1 Extension Host 均退出码 0。宿主冻结七条属性谓词精确诊断；主 VSIX SHA-256
为 `5c8ed6dbe6653cfc98aa80f045ac484fffd0848c265eafcc10e4c7f3f85e400f`。完整边界和
日志位置见[属性路径验收报告](reports/property-predicate-narrowing-2026-09-08.md)。

## 2026-09-08 属性对象非空与 instanceof 流

严格属性 null 比较和属性 `instanceof` 已接入同一结构化属性路径事实。Nullable 对象
可在已证明分支移除 null，有限对象 Union 可选择或排除目标成员；参数诊断与成员补全
共享结果。带路径事实与根变量事实已明确隔离，避免把属性类型错误套用到根对象。
全部属性副作用失效规则继续生效。

最终门禁通过：15 个组件 408 项、根包 30 项，其中 Parser 45、Semantic 188、
Language Server 77 项；组件 tarball、VSIX 内容和打包版 VS Code 1.136.1 宿主均验证
通过。宿主冻结新增四条对象属性诊断和正向/else 成员 Definition；主 VSIX SHA-256
为 `a36a91f0e8ba300beb4d52a155a89a43aa1d3f8fd9135714e597f61f6f01dbb2`。完整证据见
[属性对象流验收报告](reports/property-object-flow-2026-09-08.md)。

## 2026-09-08 mixed 属性正向谓词

声明为 `mixed` 的直接属性现在可在全局内建类型谓词的正向已证明分支精化为具体
类型；无法表示的否定 mixed 补集继续保持 unknown。属性流基础类型只为属性读取
保留 mixed，未扩大普通方法调用结果。

最终门禁仍为 15 个组件 408 项、根包 30 项，组件 tarball、PHP 8.5 fixture、VSIX
内容及 VS Code 1.136.1 打包宿主均通过。宿主冻结八条标量属性诊断和四条对象属性
诊断，并证明否定 mixed 补集无额外误报；主 VSIX SHA-256 为
`48d47f43244ea14d10d5a2e282d9e21405f0b1c30b667b4b4cd7c3e42729c79a`。证据见
[mixed 属性谓词验收报告](reports/mixed-property-predicate-2026-09-08.md)。

## 2026-09-09 isset 非空流收窄

`isset(...)` 已证明为真的直接变量、静态属性名和非 nullsafe 属性路径现在会产生
非空流事实；多参数调用在整体真路径收窄全部受支持操作数，否定后提前终止的守卫
会把事实带入后续代码。普通 false 分支不推断 null-only，动态成员、nullsafe 路径和
数组下标仍保持 unknown。变量或属性修改及既有对象逃逸规则会使事实失效。

最终门禁通过：15 个组件 411 项、根包 30 项，其中 Parser 46、Semantic 189、
Language Server 78 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容和打包版
VS Code 1.136.1 宿主均验证通过。宿主冻结总计十五条属性流诊断，并验证 `isset`
后的 nullable 对象成员 Definition；主 VSIX SHA-256 为
`7b7123cd5151b7635972047dc0874a45fe9b900f43ac195d34ee83941671c70a`。第一次完整
测试中一个既有 Language Server 用例以 5082 ms 超过固定 5000 ms，未放宽预算，
同配置完整重跑通过。证据见
[isset 非空流收窄验收报告](reports/isset-flow-narrowing-2026-09-09.md)。

## 2026-09-09 数组字面量键控制流

`isset($array['key'])`、规范整数文字键、全局内建 `is_*` 谓词、严格 null 比较和
`instanceof` 现在会产生独立数组元素流事实。Semantic 可从 array shape、typed array
和 list 取得元素类型，并把同一结果用于正反分支实参诊断、对象成员补全及 Definition。
数组元素事实不会污染根变量；根数组
重赋值、任意下标写入或 unset、引用逃逸、引用 foreach 和根数组调用逃逸会撤销事实。
变量键、复杂字符串键、嵌套下标、属性容器和 false 分支仍保持 unknown。Semantic
snapshot 升至 schema 41。

最终门禁通过：15 个组件 413 项、根包 30 项，其中 Parser 46、Semantic 190、
Language Server 79 项；组件 tarball、PHP 8.5 fixture、VSIX 内容和打包版 VS Code
1.136.1 宿主均验证通过。宿主冻结总计二十一条属性/数组流诊断，并验证 `isset`
对象元素、对象 Union 正向/else 及严格非空 nullable 对象元素 Definition；主 VSIX
SHA-256 为
`8fbe6148079e86de39fbaddb2ba605ecdfccec7426c2f8f2f85229524a273590`。较早一次完整
测试中既有 Language Server 用例以 5116 ms 超过固定 5000 ms，未放宽预算；同配置
重跑通过，最终对象元素扩展后的完整门禁首次通过。完整证据见
[数组字面量键控制流验收报告](reports/array-element-flow-2026-09-09.md)。

## 2026-09-09 empty 假路径非空流

`empty(...)` 已证明为假的直接变量、静态非 nullsafe 属性路径和安全字面量数组键
现在会产生非空事实，包括 `!empty(...)` 分支及 `empty(...)` 提前终止后的继续路径。
nullable 标量进入参数诊断，nullable 对象属性和 array shape 元素进入成员补全与
Definition。`empty(...)` 真路径不被错误简化为 null；动态目标和复杂表达式保持
unknown。

最终门禁通过：15 个组件 416 项、根包 30 项，其中 Parser 46、Semantic 191、
Language Server 81 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容与 VS Code
1.136.2 打包宿主均验证通过。宿主冻结新增四条 `empty` 精确诊断、两个成员
Definition，整份属性/数组 fixture 共二十五条诊断。主 VSIX SHA-256 为
`d5d2844ebe7502f8dbb571cd61a558413248269e7dea11c05e60320bb5ca0a32`。既有泛型数组
测试按版本门控和传播行为拆分后，在不提高 5000 ms 预算的前提下稳定通过。完整证据见
[empty 假路径非空流验收报告](reports/empty-false-flow-2026-09-09.md)。

## 2026-09-09 直接 truthy 路径非空流

直接变量、静态非 nullsafe 属性路径和安全字面量数组键在已证明 truthy 的分支中
现在会产生非空事实；否定条件提前终止后的继续路径同样生效。nullable 标量进入
参数诊断，nullable 对象进入成员补全与 Definition。falsy 路径仍保留 PHP 广义空值
的不确定性，mixed 和动态目标保持 unknown。

最终门禁通过：15 个组件 418 项、根包 30 项，其中 Parser 46、Semantic 192、
Language Server 82 项；组件 tarball、PHP 8.5 fixture、VSIX 内容及 VS Code 1.136.2
打包宿主均验证通过。宿主冻结新增四条 truthy/falsy 精确诊断、两个对象成员
Definition，完整属性/数组 fixture 共二十九条诊断；主 VSIX SHA-256 为
`d0820f333eda5602a5dc4689c95816b1d34e3af4788221848b52797ea72b0a21`。完整证据见
[直接 truthy 路径非空流验收报告](reports/truthy-flow-narrowing-2026-09-09.md)。

## 2026-09-09 宽松 null 比较非空流

`!= null` 真路径和 `== null` 假路径现在与严格比较共享非空事实，覆盖直接变量、
静态属性路径及安全字面量数组键，并进入分支、else、提前终止后的继续路径、循环和
已支持合流。宽松相等真路径仍保留 PHP 广义空值不确定性，不推断 null-only。

最终门禁通过：15 个组件 420 项、根包 30 项，其中 Parser 46、Semantic 193、
Language Server 83 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容及 VS Code
1.136.2 打包宿主均验证通过。宿主冻结新增四条宽松 null 比较精确诊断，完整属性/数组
fixture 共三十三条诊断；主 VSIX SHA-256 为
`0674d40a6836fc01adbe5dd043ea38cdc653a8c00c563abe9fb13d1e481a4ece`。既有泛型数组
测试按版本门控和传播行为拆分后，在不提高 5000 ms 单测预算的前提下完整测试首次
通过。完整证据见
[宽松 null 比较非空流验收报告](reports/loose-null-flow-2026-09-09.md)。

## 2026-09-09 嵌套安全数组键路径控制流

类型谓词、`isset`、`empty` 假路径、直接 truthy 守卫、严格/宽松 null 比较和
`instanceof` 的数组元素事实已从单键扩展到最多 16 层安全字符串或规范整数文字键。
Semantic 递归读取 array shape、typed array 和 list 元素类型，并用同一条完整路径驱动
实参诊断、成员补全及 Definition；动态键、超预算路径和数组与属性混合路径保持
unknown。根数组重赋值、任意下标写入或 unset、引用及调用逃逸继续撤销事实。

最终门禁通过：15 个组件 423 项、根包 30 项，其中 Parser 47、Semantic 194、
Language Server 84 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容及 VS Code
1.136.2 打包宿主均验证通过。宿主冻结新增六条嵌套路径精确诊断和四个对象成员
Definition，完整属性/数组 fixture 共三十九条诊断；主 VSIX SHA-256 为
`8bfbca82b06cb1a71296fcfd33dbdd030d3e3a532a2d28a07b4f5730e2e131cb`。嵌套写入
失效及 16/17 层预算边界回归加入后完整测试首次通过，固定 5000 ms 单测预算未变。完整证据见
[嵌套安全数组键路径验收报告](reports/nested-array-path-flow-2026-09-09.md)。

## 2026-09-09 array_key_exists 键存在流

全局 `array_key_exists()` 及官方别名 `key_exists()` 的真路径现在产生独立“键存在”
事实。该事实只移除 array shape 可选标记带来的缺失可能性，保留字段类型显式声明的
null；直接与嵌套安全数组集合均进入实参诊断、成员补全和 Definition。命名空间同名
函数、false 路径、动态键和超预算路径保持 unknown，数组修改继续撤销事实。PHP
7.2–7.4 的对象参数重载及 PHP 8.0 起的 array-only 边界同时保留在版本目录中。

最终门禁通过：15 个组件 425 项、根包 30 项，其中 Language Spec 11、Parser 47、
Semantic 195、Language Server 85 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容
及 VS Code 1.136.2 打包宿主均验证通过。宿主冻结新增两条精确诊断、两个存在路径的
成员 Definition，并验证显式 nullable 与修改后的路径均无 Definition；完整属性/数组
fixture 共四十一条类型不兼容诊断。主 VSIX SHA-256 为
`b3c4e4a9fc91b222f609a2a3d74bc50f8fd1baaa27c2857b4be9e3f92874446a`。完整测试首次
通过，固定 5000 ms 单测预算未变。实施与验收证据见
[array_key_exists 键存在流验收报告](reports/array-key-exists-flow-2026-09-09.md)。

## 2026-09-09 is_a 对象类型控制流

全局 `is_a($value, Type::class)` 在 `$allow_string` 省略或明确为 false 时已进入统一
类型谓词流：正向路径把 mixed 或对象 Union 精化为目标类型，false/else 路径从有限
Union 排除目标成员，并覆盖命名参数、提前终止守卫、直接属性和安全数组路径。参数
诊断、成员补全和 Definition 共用结果。动态 class、`$allow_string=true`、动态第三
参数及命名空间同名函数保持 unknown；显式全局调用仍可解析。Semantic snapshot 升至
schema 44。

最终门禁通过：15 个组件 428 项、根包 30 项，其中 Parser 48、Semantic 196、
Language Server 86 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容及 VS Code
1.136.2 打包宿主均验证通过。宿主冻结新增七条精确诊断和五个对象成员 Definition，
完整属性/数组 fixture 共四十八条类型不兼容诊断；主 VSIX SHA-256 为
`03dd89031dd370bb4568c9ce6c0653f36a2af88b5a5289fdf400852654c733ea`。首次宿主运行
暴露既有属性阶段选择器包含新增 `$box->object` 用例；收紧旧阶段范围后第二次通过，
没有改动产品逻辑或等待预算。实施与验收证据见
[is_a 对象类型控制流验收报告](reports/is-a-object-flow-2026-09-09.md)。

## 2026-09-09 is_subclass_of 严格对象子类型控制流

全局 `is_subclass_of($value, Type::class, false)` 已进入统一对象控制流。实现使用严格
子类型关系，目标类型自身不会被误判为子类；正向路径保留已证明的子类，false/else
路径从关系完整的有限 Union 排除这些子类。命名参数、否定和提前终止守卫、直接属性、
最多 16 层安全数组路径均复用相同诊断、成员补全和 Definition 消费链。

第三参数省略、为 true 或动态值时仍允许 class-string，因此不产生对象事实；动态 class、
无法表示的 mixed 补集和命名空间同名函数同样保持 unknown。Semantic snapshot 升至
schema 45，旧 schema 44 缓存会安全重建。

验证覆盖 Parser、Semantic、Language Server 和打包 Extension Host；详细命令、测试数量、
VSIX 哈希及日志见
[is_subclass_of 严格对象子类型控制流验收报告](reports/is-subclass-of-object-flow-2026-09-09.md)。

## 2026-09-09 is_callable 运行时可调用性控制流

`is_callable($value)` 与明确 `syntax_only: false` 的调用现在产生 callable 正向事实和
有限 Union 反向事实，并覆盖命名参数、提前终止守卫、直接属性与安全数组路径。PHP
只做回调结构检查的 `syntax_only=true` 以及动态布尔值不会再被当作运行时 callable
证明；命名空间同名函数继续保持 unknown。

Semantic snapshot 升至 schema 46，旧 schema 45 缓存会安全重建。详细测试、打包和
宿主证据见
[is_callable 运行时可调用性控制流验收报告](reports/is-callable-runtime-flow-2026-09-09.md)。

## 2026-09-09 is_object 具体对象分支

全局 `is_object()` 对声明为具体对象与标量的参数 Union 收窄时，现在会保留具体对象
身份。正向分支与否定提前退出后的继续路径可提供成员补全和 Definition，false/else
分支继续驱动精确实参诊断；命名空间同名函数不产生事实，显式全局调用仍生效。

Semantic snapshot 升至 schema 48，旧 schema 47 缓存会安全重建。详细验证见
[is_object 具体对象分支验收报告](reports/is-object-concrete-flow-2026-09-09.md)。

## 2026-09-09 is_a 子类型身份保留

对象模式 `is_a(Child|Other, Base::class)` 的真路径现在保留实际 `Child` 身份，
成员补全和 Definition 不再退化到 `Base`。false/else 或目标分支提前退出后的继续路径
会排除目标及所有关系完整的已知子类型，并保留其余 Union 成员。mixed 或宽泛 object
仍可按目标类型精化，命名空间 shadow 和 string-enabled 边界维持既有保守规则。

Semantic snapshot 升至 schema 49，旧 schema 48 缓存会安全重建。详细验证见
[is_a 子类型身份保留验收报告](reports/is-a-subtype-preservation-2026-09-09.md)。

## 2026-09-09 对象谓词多子类型保留

对象模式 `is_a()` 与严格 `is_subclass_of(..., false)` 的真路径现在在参数、直接属性
和安全 array shape 路径上保留全部已证明子类型。`ChildOne|ChildTwo|Other` 会精化为
两个 Child 分支，只暴露签名一致的公共成员；Definition 返回两个实际声明。false 路径仅在关系完整时排除匹配候选，mixed
等不确定补集保持 unknown。

Semantic snapshot 升至 schema 50，旧 schema 49 缓存会安全重建。详细验证见
[对象谓词多子类型保留验收报告](reports/object-predicate-subtype-unions-2026-09-09.md)。

## 2026-09-09 复合对象谓词具体类保留

`is_countable()` 的 `Countable|array` 与 `is_iterable()` 的 `iterable` 目标现在通过共享类型代数逐项筛选参数 Union。真路径会保留已证明实现 `Countable` 或 `Traversable` 的具体类，因此接口成员、实现类专有成员、补全和 Definition 保持一致；无关对象候选被排除，包含数组或关系不完整的结果仍保守降级。Semantic snapshot 升至 schema 51。

同一类型代数也覆盖 `is_callable()`：带公开实例 `__invoke()` 的具体对象会在参数、直接属性和安全 array shape 路径上保留类身份，专有成员补全与 Definition 不再退化成抽象 callable。

详细证据见 [复合对象谓词验收报告](reports/composite-object-predicates-2026-09-09.md)。

## 2026-09-09 属性 PHPDoc 安全精化

紧邻属性的 `@var` 不再因为存在原生类型而被统一丢弃。原生 `mixed` 接受结构化文档类型；array/list/shape、iterable、class-string、callable/Closure 和同基类型只在可证明属于原生边界时进入成员与控制流模型。冲突文档继续由诊断报告，查询侧保留原生类型，不暴露伪成员。Semantic snapshot 升至 schema 52。

详细证据见 [属性 PHPDoc 安全精化验收](reports/property-phpdoc-refinement-2026-09-09.md)。

多属性声明中的 `@var Type $property` 已进一步按属性名绑定：指定标签只影响匹配属性，未指定变量的标签才共享给整条声明；索引与冲突诊断复用同一选择规则。Semantic snapshot 升至 schema 53。

构造器提升属性现在复用同名参数已经通过原生边界检查的 PHPDoc 类型。`@param Service $service` 可精化 `public mixed $service`，而 `public int $service` 等冲突声明仍保留原生类型。Semantic snapshot 升至 schema 54。

## 2026-09-09 局部变量 PHPDoc 类型断言

紧邻局部赋值且显式写出同名变量的 `@var Service $service` 现在进入统一局部类型模型，可驱动成员补全、Definition、成员链与参数类型诊断。结构化 `@var array{service: Service} $data` 也可沿安全字面量键提供成员补全与 Definition，并在偏移写入后失效。注解只在赋值所在词法作用域内生效，下一次同名赋值会覆盖该事实；错名、无变量名、残缺或无法解析的注解保持 unknown。Semantic snapshot 升至 schema 55。

详细证据见 [局部变量 PHPDoc 类型断言验收](reports/local-variable-phpdoc-2026-09-09.md)。

## 2026-09-09 独立局部 PHPDoc 类型断言

独立 `/** @var Service $service */` 现在可在同一语句块内精化此前已有的局部变量，无需绑定新赋值；对象、复合对象和 array shape 字面量键均进入成员补全、Definition、成员链与参数诊断。事实不会从条件、循环或闭包块泄漏到其他块；后续赋值、复合修改、自增减、`unset`、引用绑定、引用 foreach 或已证明按引用调用会使其失效，普通按值调用保持事实。后续同变量残缺注解会阻止旧断言继续生效。查询在访问 CST 前按变量名筛选 PHPDoc 候选，Semantic 203 项全量回归为 28.61 秒。Semantic snapshot 升至 schema 56。

详细证据见 [独立局部 PHPDoc 类型断言验收](reports/standalone-local-variable-phpdoc-2026-09-09.md)。

## 2026-09-09 原生 assert 类型控制流

独立原生 `assert()` 现在可把正向及有限 Union 的否定 `instanceof`、严格非空、`!is_null`、正反已解析内建类型谓词、严格 `true`/`false` 字面量比较、`isset` 与 `array_key_exists` 事实应用到同一语句块后续代码，精化参数、断言前已有精确类型的局部值、直接属性和安全 array shape 路径。`!is_numeric` 只排除一定满足谓词的 int/float，保留可能返回 false 的 string；`T|false !== false` 保留 `T`，`bool !== false` 得到字面量 `true`，严格相等可把 mixed 收窄为对应字面量；mixed 的否定字面量比较、宽松比较或无法表示的补集保持 unknown。单参数、静态字符串/`null` 描述的两参数位置或命名形式、命名换序与肯定合取中的必然原子受支持；嵌套调用、动态描述、参数展开和不确定析取保持 unknown。成员补全、Definition、成员链与参数诊断共用事实，并在目标修改后失效。Semantic snapshot 升至 schema 61。

详细证据见 [原生 assert 类型控制流验收](reports/native-assert-flow-2026-09-09.md)。

## 2026-09-09 严格布尔字面量控制流

普通 `if`、else 与可证明提前退出守卫现在消费两侧均可放置字面量的严格 `===`/`!== true|false` 事实。`T|false` 可在参数、断言前已有精确类型的局部变量、直接可见属性和安全 array shape 路径中保留 `T`，`bool !== false` 得到字面量 `true`；补全、Definition、成员链和参数诊断使用同一类型。赋值等既有目标修改规则会撤销事实，宽松 `==`/`!=` 与 mixed 的否定补集保持 unknown。PHPDoc `array{...}|false` 现在可逐分支安全精化原生 `array|false`；排除根变量 false 后，安全 shape 元素进入相同补全、Definition 和诊断链，严格比较事实也传播到逻辑已证明的短路右操作数和三元表达式的确定 arm；独立检查起点确保条件内后续按引用修改撤销事实。Semantic snapshot 升至 schema 63。

详细证据见 [严格布尔字面量控制流验收](reports/strict-boolean-literal-flow-2026-09-09.md)。

## 2026-09-09 空合并表达式类型传播

`left ?? right` 现在由精确 CST 节点驱动：仅从左侧类型删除 `null`，再与实际可达的右侧类型合并。左侧确定非空时不要求右侧可推断；左侧可能为空且右侧未知时保持 unknown。`false`、`0` 与空字符串保留，nullsafe 调用、括号和右结合嵌套可经同块局部赋值进入补全、Definition 与参数类型诊断。Semantic snapshot 升至 schema 64。

完整证据见 [空合并表达式类型传播验收](reports/null-coalescing-flow-2026-09-09.md)。

## 2026-09-09 普通三元表达式结果类型

完整 `condition ? trueArm : falseArm` 现在按 CST 字段计算结果：普通条件要求两侧均可证明并组成 Union，字面量 `true`/`false` 只求值可达 arm。结果经同块局部赋值进入补全、Definition 与参数诊断；可达 unknown 与 Elvis 简写保持 unknown。Semantic snapshot 升至 schema 65。

完整证据见 [普通三元表达式结果类型验收](reports/ternary-result-flow-2026-09-09.md)。

## 2026-09-09 match 表达式结果类型

带唯一 default、最多 64 个 arm 且每个值结果可证明的 PHP 8 `match` 现在合并结果 Union，`throw` arm 作为 `never` 排除，并经同块局部赋值进入补全、Definition 与参数诊断。缺少 default、unknown 值 arm 或超预算时保持 unknown。Semantic snapshot 升至 schema 66。

完整证据见 [match 表达式结果类型验收](reports/match-result-flow-2026-09-09.md)。
2026-09-21 首次 References 验证内循环：语义成员目标在保留语法树时从当前语句起点解析，候选准备上限从 4 个工作线程调整为 8 个；收益不足的批次重叠和 12 线程方案已撤回。Winstar 两轮空缓存成对测试为 14.439→13.478 秒、14.305→13.360 秒，四轮均为相同 112 处完整引用；Semantic 285、Index 31、Language Server 200 项及改动文件 ESLint 通过。首次查询仍约 13–14 秒，尚未满足交互目标。证据见 [首次 References 验证内循环](reports/cold-references-iteration-2026-09-21.md)。
2026-09-22 `get` 正式 bundle 冷首查复测 8.228 秒、127 处及原位置摘要；候选 4.444 秒、语义 2.111 秒。后台项目源 worker 预解析原型在无缓存时约 15 秒就绪、后续点击约 3.8 秒，但持久缓存准备需约 23.7 秒，且 Symfony Provider 可在结果返回后才提交；原型已撤回。下一步是按索引代次证明项目源、vendor 接收者与框架事实均就绪，并让立即点击复用后台任务。Goal 未完成。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。
2026-09-22 experimental 后台 worker 全量解析试验：Winstar 空闲 15 秒后项目源已就绪，但依赖索引 `complete=false`，References 仍补扫 2,289 文件，点击 8.015 秒/127 处，试验已撤回。已修正完整索引就绪标记早于语义 Provider 提交的竞态，并加延迟 Provider 的 stdio 回归；默认正式 bundle 冷首查 8.037 秒/127 处、位置摘要不变。Language Server 239 项通过、1 项跳过；性能 Goal 仍未完成。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。
2026-09-22 修复打开 YAML/XML 框架配置时选中符号预热被误关的问题：持久结果复用仍需完整输入证明，内存预热可在有打开配置文件或无磁盘缓存时继续。Winstar/Symfony 真实 `services.yaml` 快照、独立空缓存下，选中后空闲 8 秒的首次 `get` References 为 557 ms/127 处；相同场景不预热为 7.703 秒/127 处，位置摘要一致。空闲 2.5 秒仍为 5.594 秒，立即点击约 8 秒的问题未解决；Goal 继续。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。
2026-09-22 冷首查复核：Winstar `get` 1,656 个候选中 453 个完整解析、1,203 个声明解析；单线程同批解析约 11.3 秒。主线程提前保留 453 棵语法树使语义阶段约 2.1→1.18 秒，但候选阶段约 4.5→5.72 秒，总点击 8.74 秒，试验已撤回；正式 bundle 恢复后 8.39 秒/127 处、原位置摘要。后续集中做独立后台引用事实与 vendor 依赖闭包，Goal 继续。见 [首次查询短循环](reports/reference-first-query-loop-2026-09-22.md)。
