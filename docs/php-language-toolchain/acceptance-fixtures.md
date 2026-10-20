# 编号验收 fixtures

2026-10-09 [返回注释修正构建完整验证](reports/commented-return-normal-qualification-2026-10-09.md)：完整114文件/1438项LSP及四原Linux编辑器流程全过，当前C2七状态与两C3共80组生成边界保留；门禁接入后113根单元和18项依赖门禁控制通过，生产资产保持。编号映射33项/207个去重已有案例；35个公开类型及三份ADR已固定，P0总条目保持开放。原生Windows/完整性能/规模长期/真人及原全部范围继续，旧失败保留，Profile未更新。

本表把 [最终验收 F01–F14](acceptance.md)中的场景绑定到可运行输入。编号固定；新增支持范围时，在同一组中补正例、合法反例及未完成输入。当前建立了 F02 版本边界、F03 内置函数条件类型与数组形状、F04 References、F08 Extract Interface、Extract Method、private 参数删除，以及 F09 Symfony 服务、路由 YAML 和 Doctrine Entity 的首组，不能据此判定这些最终验收项或 P0 全部完成。

| 编号 | 输入 | 预期 | 自动验证 |
| --- | --- | --- | --- |
| F02-VERSION-01 | [同一独立 Composer 文件的 PHP 7.2、8.1、8.5 版本设置](../../packages/language-server/test/stdio.test.ts) | 7.2 对 `match`、`enum`、`(void)` 转换及带注释的调用尾随逗号报版本诊断；8.1 只报 `(void)`；8.5 均不报；三者均无 parser 语法错误。隔离 Core 宿主已验证前三类，新增尾随逗号由真实 stdio 验证 | `stdio.test.ts` 的 F02-VERSION-01；`test/extension/suite/c1.ts` 的三版本宿主流程 |
| F02-VERSION-02 | [字符串和注释中的 `|>`，以及真实 PHP 8.5 管道表达式](../../packages/language-server/test/analysis.test.ts) | PHP 7.2/8.4 的普通拼接和算术表达式不因文本中出现 `|>` 报版本错误；真正的管道在 8.4 报错，诊断范围只覆盖操作符 | `analysis.test.ts` 正反例、F02-VERSION-01 真实 stdio；[隔离宿主](reports/f02-version-syntax-host-2026-09-25.md)覆盖文本反例 |
| F02-VERSION-03 | [字符串和注释中的 `??=`，以及真实 PHP 7.4 空合并赋值](../../packages/language-server/test/analysis.test.ts) | PHP 7.2 的普通追加和加法表达式不因文本中出现 `??=` 报版本错误；真正的赋值在 7.2 报错，诊断范围只覆盖操作符 | `analysis.test.ts` 正反例、F02-VERSION-01 真实 stdio；[隔离宿主](reports/f02-version-syntax-host-2026-09-25.md)覆盖文本反例 |
| F02-VERSION-04 | [提升属性注释中的 `final` 与真正的 final 修饰符](../../packages/language-server/test/analysis.test.ts) | PHP 8.4 中 `public /* final */ string $name` 不报 PHP 8.5 版本错误，也不限制子类合法覆盖；真实 `public final string $name` 仍在 8.4 报错并保留 final 覆盖限制 | `analysis.test.ts`、`parser.test.ts`、`semantic.test.ts`；[隔离宿主](reports/f02-version-syntax-host-2026-09-25.md)覆盖 7.2/8.1/8.5 诊断 |
| F02-VERSION-05 | [带注释的调用尾随逗号](../../packages/language-server/test/analysis.test.ts) | PHP 7.2 对 `run(1, /* note */)` 报版本诊断且只标出逗号；注释里的逗号与下一个实参前的逗号不误报；PHP 7.3 接受合法尾随逗号 | `analysis.test.ts` 正反例及 F02-VERSION-01 真实 stdio；[隔离宿主](reports/f02-version-syntax-host-2026-09-25.md)覆盖 7.2/8.1/8.5 诊断 |
| F02-VERSION-06 | [PHP 8.5 clone-with 的表达式与尾随逗号](../../packages/language-server/test/php-runtime-syntax.test.ts) | 真实 PHP 8.5 接受构造/覆盖表达式、数组变量与尾随逗号；SoPHP 在 8.5 不报语法错误，旧目标报版本错误；缺失覆盖值仍报语法错误，Undo 后撤回 | 六套真实 CLI 对照、`analysis.test.ts` 反例及[隔离 Core 与 10 项 Pack 宿主](reports/f02-clone-with-host-2026-09-27.md) |
| F02-VERSION-07 | [浮点和指数数字分隔符](../../packages/language-spec/test/numeric-literal-separators.test.ts) | PHP 7.2/7.3 对带下划线的整数、浮点及指数数字报 PHP 7.4 版本要求；新目标、字符串/注释与普通数字接受，范围、Unicode、未完成输入及恢复正确 | 47 新测试、九真实 CLI 90 组、九目标版本/两模式 18 生产协议；[修复与验证](reports/numeric-literal-separator-version-2026-10-12.md) |
| F02-VERSION-08 | [显式八进制版本边界](../../packages/language-spec/test/version-boundary-gaps.test.ts) | 合法 `0o`/`0O` 和内部数字分隔符要求 PHP 8.1，传统八进制保持；裸前缀应用错误事实见 F02-OCTAL-01 | 九目标/两路径、实际 CLI 与生产协议；[版本验证](reports/remaining-version-boundaries-2026-10-12.md) |
| F02-VERSION-09 | [参数及闭包捕获尾随逗号](../../packages/language-spec/test/version-boundary-fixtures.ts) | 函数、方法、闭包、箭头函数参数及引用/普通捕获列表的实际尾随逗号要求 PHP 8.0；注释与普通分隔逗号不误报，调用尾随逗号继续要求 7.3 | 完整规范/分析/九版本两模式生产协议和实际 CLI；[验证](reports/remaining-version-boundaries-2026-10-12.md) |
| F02-VERSION-10 | [无异常变量的 catch](../../packages/language-spec/test/version-boundary-fixtures.ts) | 无异常变量的单/联合类型 catch 要求 PHP 8.0；catch 体内变量不当作捕获，保留异常变量的旧语法接受；头部未完成不猜测版本，完整关键字范围准确 | 完整规范/分析/生产协议与真实 CLI；[验证](reports/remaining-version-boundaries-2026-10-12.md) |
| F02-OCTAL-01 | [无效显式八进制的应用错误事实](../../packages/parser/test/invalid-octal-literals.test.ts) | 裸前缀/首位分隔符发布精确 syntax 错误，相邻原生错误合并；Unicode、增量恢复和独立未完成输入保持，参数顺序信息拒绝并在修正后恢复，旧 v82 缓存重建 | 完整 Parser254/Semantic24122、相关LSP173、九真实CLI108组及当前暖缓存；[验证](reports/invalid-octal-literal-errors-2026-10-12.md) |
| F03-WATCH-01 | [服务刷新并发测试](../../packages/language-server/test/symfony-container-provider-concurrency-stdio.test.ts)：PHP 8.5、onDemand/progressive 的已知服务删除与受控 Provider 等待 | 刷新前有真实 send 补全；服务删除后查询等待本次刷新，不能返回旧成员；等待期间取消请求仍在原 100 ms 内返回 | [计划实施报告](reports/plan-execution-watchers-diagnostics-2026-10-12.md)；正常 Linux 协议范围，完整新构建回归、其它平台和真人 WSL 分别验收。 |
| F03-PROVIDER-CANCEL-01 | [服务并发测试](../../packages/language-server/test/symfony-container-provider-concurrency-stdio.test.ts)：PHP 7.2/8.5、progressive，替换真实服务 Provider 并阻塞重建 | 正向类型补全存在；普通补全等待重建时，取消在原100毫秒内返回；另一查询继续等待、释放后恢复；正常退出及清理 | [取消修复记录](reports/provider-reconciliation-cancellation-2026-10-13.md)；30项服务并发与正常Linux打包协议已通过，当前完整LSP/编辑器/Windows待终态 |
| F03-BUILTIN-01 | [pathinfo 合同](../../packages/semantic/test/pathinfo-contract.test.ts)：省略／15、具体 flags、未知 flags、同名常量和用户函数遮蔽 | 仅确定为数组时给出 basename／dirname／extension／filename；dirname 与 extension 可选；具体 flags 返回 string；未知 flags 不猜选分支；PHP 7 不暴露 PATHINFO_ALL | PHP 7.2／8.5 语义、主 stdio 与 `pathinfoCompletion.ts`；[证据](reports/phpstorm-stubs-pathinfo-contract-2026-10-02.md) |
| F03-BUILTIN-02 | [stat／lstat 合同](../../packages/semantic/test/stat-contract.test.ts)：成功保护、无保护、is_array 保护 | 返回保留 false；成功保护后建议 size，删除保护后撤回，数组保护后恢复 | PHP 7.2／8.5 语义、主 stdio 与 `statCompletion.ts`；[证据](reports/phpstorm-stubs-stat-failure-shape-2026-10-02.md) |
| F03-BUILTIN-03 | [SimpleXML 工厂合同](../../packages/semantic/test/simplexml-factory-contract.test.ts)：默认、显式 null、自定义子类及失败 | 三入口保留各自 false／null 失败；有效 class-string 子类决定结果成员；默认类不受调用位置同名类误导 | 语义、主 stdio 与 `simplexmlFactoryCompletion.ts`；[证据](reports/phpstorm-stubs-simplexml-factory-2026-10-02.md) |
| F03-BUILTIN-04 | [getrusage 合同](../../packages/semantic/test/getrusage-contract.test.ts)：已测自身／子进程字段、未知模式、平台切换、无字段事实及坏输入 | 仅提供实际字段；未知模式保留公共可证明键；无运行时事实不猜 Linux 键；失败 false 保留；切换撤回旧平台键；不接受重复／不完整／非法字段 | 语义、`getrusage-stdio.test.ts`、Linux／Windows `getrusageCompletion.ts`；[证据](reports/phpstorm-stubs-getrusage-runtime-contract-2026-10-02.md) |
| F03-BUILTIN-05 | [图片尺寸两入口合同](../../packages/semantic/test/image-size-contract.test.ts)：保护切换、GD 禁用、PHP 7.2／8.5 | 保护后补全 mime／bits／channels；删除保护后空列表；bits／channels 可选；PHP 8.5 才有单位字段且索引 3 可缺失；标准函数不依赖 GD | 九版规格、两版语义／`image-size-stdio.test.ts`、Linux `imageSizeCompletion.ts`；[证据](reports/phpstorm-stubs-image-size-shape-2026-10-02.md) |
| F03-BUILTIN-06 | [高亮三入口合同](../../packages/semantic/test/highlight-contract.test.ts)：省略、true、false、未知 bool、PHP 8 命名实参 | 输出模式与捕获模式类型区分；文件失败 false 保留；PHP 8.4 起 highlight_string 不含失败 false；未保存切换后变量 Hover 更新 | 四版语义、九版规格、两版 `highlight-stdio.test.ts`、Linux `highlightReturn.ts`；[证据](reports/phpstorm-stubs-highlight-conditional-return-2026-10-02.md)与[当前集成记录](reports/phpstorm-stubs-current-integration-2026-10-02.md) |
| F03-BUILTIN-07 | [数组键域](../../packages/semantic/test/array-key-preservation.test.ts)：反转／切片／分块、preserve_keys 与未知输入 | 反转与切片保留可证明的键域；分块默认重编号全部键，true 保留原键；PHP 7 slice 接受 null length；未知类型保持保守 | 四版语义、两版 `array-key-preservation-stdio.test.ts`、Linux／Windows `arrayKeyPreservation.ts` 与六版实际 PHP；[证据](reports/phpstorm-stubs-array-key-preservation-2026-10-03.md) |
| F03-BUILTIN-08 | [调用绑定](../../packages/semantic/test/value-call-binding.test.ts)与[原生泛型父类](../../packages/semantic/test/native-generic-parent.test.ts)：可选引用输出、按值／引用构造、SimpleXML 子类 | 未传入可选输出与已知按值构造保留对象；实际引用、缺失必填实参及未知调用不伪造类型；固定父类迭代合同传至子类，缺失／冲突合同保持未知 | PHP 7.2／8.5 语义与 `stubs-flow-completion-stdio.test.ts`、Linux／Windows `stubsFlowCompletion.ts`；[证据](reports/phpstorm-stubs-call-and-inherited-flow-2026-10-03.md) |
| F04-COMP-TRIVIA-01 | [已有括号与注释](../../packages/language-server/test/call-trivia-stdio.test.ts)：函数／实例方法／静态方法／new／魔术方法声明 | 名称后有注释和已有括号时不重复插入；无括号沿用片段；PHP/HTML 边界、未闭合注释和 Attribute 不误识别 | 18 项边界、PHP 7.2／8.5 LSP、Linux 可见 Enter／Tab 十次精确接受与 Undo/Redo；[报告](reports/completion-call-trivia-2026-10-02.md) |
| F04-COMP-TRIVIA-02 | [构造关键字后的注释](../../packages/semantic/test/construction-trivia-completion.test.ts)与[真实 LSP](../../packages/language-server/test/construction-trivia-stdio.test.ts) | new 保留可实例化类型；instanceof 保留接口／抽象类型；前缀、限定名、预期类型排序及注释反例 | PHP 7.2／8.5 共 48 次插入、Linux Enter／Tab 六次接受；[报告](reports/completion-construction-trivia-2026-10-02.md) |
| F04-COMP-TRIVIA-03 | [继承声明注释](../../packages/semantic/test/inheritance-trivia-completion.test.ts)与[真实 LSP](../../packages/language-server/test/inheritance-trivia-stdio.test.ts) | 类 extends、接口 extends、implements、多接口和限定别名保持正确类型类别；注释、字符串与 HTML 反例为空 | PHP 7.2／8.5 共 24 查询，Linux Enter／Tab 八次接受；[报告](reports/completion-inheritance-trivia-2026-10-02.md) |
| F04-COMP-INHERIT-01 | [继承合法性](../../packages/semantic/test/inheritance-validity-completion.test.ts)与[真实 LSP](../../packages/language-server/test/inheritance-validity-stdio.test.ts) | extends 排除 final、readonly 不兼容、自身及已证明循环；new／参数类型仍保留 final，未保存修饰符撤回／恢复 | 两版 LSP、Linux 八次可见接受和 Undo/Redo；[报告](reports/completion-inheritance-validity-2026-10-02.md) |
| F04-COMP-INHERIT-02 | [接口列表与匿名继承](../../packages/semantic/test/inheritance-list-completion.test.ts)与[真实 LSP](../../packages/language-server/test/inheritance-list-stdio.test.ts) | 排除已经直接列出的同一接口，保留当前编辑项；匿名类 extends／implements 保持正确类别 | 两版 LSP 新增 36 查询、Linux 六次可见接受和 Undo/Redo；[报告](reports/completion-inheritance-list-2026-10-02.md) |
| F04-COMP-INHERIT-03 | [readonly 匿名类语义](../../packages/semantic/test/readonly-anonymous.test.ts)与[版本和更新协议](../../packages/language-server/test/readonly-anonymous-stdio.test.ts) | readonly 父类候选正确，未保存修饰符撤回／恢复；匿名 8.3、具名 8.2、显式属性 8.1 保持各自门槛 | 三目标版本实际 LSP、Linux 六次可见接受与 Undo/Redo；[报告](reports/completion-readonly-anonymous-2026-10-02.md) |
| F04-COMP-MAGIC-01 | [魔术方法声明作用域](../../packages/semantic/test/magic-declaration-completion.test.ts)与[真实 LSP](../../packages/language-server/test/magic-declaration-stdio.test.ts) | 当前类型已经直接声明的方法不再建议，保留自身编辑与父类重写；Class／Trait／Interface／匿名类、大小写与未保存切换正确 | PHP 7.2／8.5 十二次更新、Linux 六次可见接受与 Undo/Redo；[报告](reports/completion-magic-declaration-uniqueness-2026-10-02.md) |
| F04-COMP-PROPERTY-01 | [属性赋值预期类型](../../packages/semantic/test/semantic.test.ts) | 实例／静态属性按写入类型排序，未知候选保留；未保存类型改变后更新；Hook 不混用读写合同，联合 PHPDoc、不可访问及 readonly 不猜测 | PHP 7.2／8.5 `stdio.test.ts` 与 `PHP_COMPANION_TEST_C2_ONLY=1 PHP_COMPANION_TEST_C2_PROPERTY_RANK_ONLY=1` 隔离宿主；[报告](reports/c2-property-expected-completion-2026-10-01.md) |
| F04-REF-01 | [有类型接收者与全局函数调用](../../packages/semantic/test/fixtures/acceptance/f04-references-valid.php) | 方法和函数分别返回唯一真实调用；`includeDeclaration` 决定是否包含声明 | `acceptance-f04-references.test.ts` |
| F04-REF-02 | [字符串、nowdoc 与块注释](../../packages/semantic/test/fixtures/acceptance/f04-references-counterexample.php) | PHP 源码有效，调用样式文本不产生代码引用 | 同上 |
| F04-REF-03 | [调用后的未完成成员输入](../../packages/semantic/test/fixtures/acceptance/f04-references-incomplete.php) | 保留前面完整调用的引用，不捏造未完成位置 | 同上 |
| F04-REF-04 | [文件顶层变量改赋、闭包与条件赋值](../../packages/semantic/test/fixtures/acceptance/f04-references-global.php) | 第一次 `Printer::render` 调用属于 `Printer`，改赋及闭包内的 `Other::render` 不混入；仅在条件分支赋值的接收者不被猜成 `Printer`；缓存恢复保持结果 | 同上及 `stdio.test.ts` |
| F04-REF-05 | `prepared-source-fresh-references-stdio.test.ts`：后台准备后新建未打开调用者，无 watcher 通知 | PHP 7.2／8.5、onDemand／progressive 均返回接口声明和正确调用点的精确范围；无关同名方法不混入，后续磁盘删除调用撤回旧结果 | 正常 bundle 红灯、隔离修正协议及原完整 C3 progressive 分别记录；不能以原整套旧绿灯代替本时序 |
| F04-REF-06 | `prepared-source-changed-references-stdio.test.ts`：已准备调用者的磁盘修改、恢复及删除 | progressive／experimental source-only，在系统搜索、portable 和关闭 ripgrep 的配置中更新结果；未变化准备事实仍复用，原源码宿主与 `[named-candidates]` 不重扫断言保持 | 两种索引模式 × 三种搜索配置；portable 为明确 testMode 配置，另外两种使用生产配置 |
| F04-REF-07 | [准备引用的并行读取](../../packages/language-server/test/prepared-reference-batch-stdio.test.ts) | 读取最多八文件，观测兼容Promise/callback；实际磁盘读完成后打开新的未保存缓冲区，不允许旧读结果覆盖；同一URI修改、取消回复及下一查询精确恢复，磁盘保持原文 | PHP7.2/8.5 × progressive/experimental四项正常bundle协议；[最新报告](reports/prepared-reference-callback-reads-2026-10-11.md)、[原报告](reports/prepared-reference-bounded-freshness-2026-10-11.md)，不代替选区1000ms、编辑器/Remote或全矩阵资格 |
| F04-REF-08 | `stdio.test.ts`：重复且大小写混用的继承接收者原生返回类型及索引收尾竞争 | 24独立消费者与延迟vendor实现；cold精确25位置，父类未保存返回类型改变后精确26位置；缓存收尾保留查询加载依赖，磁盘保持原文 | PHP7.2/8.5 × onDemand/progressive原四项及progressive两项收尾并发；[当前完整1542项](reports/progressive-index-current-full-lsp-2026-10-12.md)、[修正](reports/progressive-index-hydrated-dependencies-2026-10-12.md)、[原报告](reports/reference-receiver-return-lookup-2026-10-11.md)，正常bundle六项及原新鲜度十项通过，不代替性能/全量/编辑器资格 |
| F04-REF-09 | `stdio.test.ts`：Composer排除的调用者与首次References | 正常bundle仅返回目标声明和未排除调用者的两个精确位置；Skipped目录同名调用不进入结果 | PHP7.2/8.5 × onDemand/progressive四项；祖先/共享根包测试及66079路径旧/新判定另证，[报告](reports/ancestor-composer-exclusions-2026-10-11.md)，不代替平台/全量或1秒门槛 |
| F04-REF-10 | [短标识符与Unicode方法引用](../../packages/language-server/test/prepared-reference-identifiers-stdio.test.ts) | 大写GET精确位置；近似ASCII名字不读取，字符串及Unicode邻接保守读取；磁盘移除/恢复/删除/新建及中文、补充平面方法两位置保持 | PHP7.2/8.5 × progressive/experimental四项正常bundle；[报告](reports/prepared-reference-identifier-normal-2026-10-11.md)，[当前完整LSP及六引用流程](reports/prepared-reference-identifier-full-qualification-2026-10-11.md)通过，完整性能继续 |
| F05-GEN-01 | `generator-delegation-return.test.ts`、`generator-delegation-expanded.test.ts`、`generator-delegation-local-calls.test.ts`：委托返回与局部消费 | `yield from` 使用已证明的返回合同，数组委托返回 null；安全零参数成员调用后局部事实保持，引用／未知／动态边界不猜测 | 完整语义、生产 `generator-delegation-stdio.test.ts`、C2 七状态未保存／UndoRedo；见 Generator 委托正常资格报告 |
| F05-GEN-02 | `generator-send-contract.test.ts`、`generator-send-ownership.test.ts`、`generator-send-anonymous-template.test.ts`、`generator-send-integration-consumers.test.ts` | 普通 yield 使用自身有效 TSend；嵌套 callable／namespace／自身模板归属准确，无界／循环不误绑同名类；send／throw 输出保留 TValue|null，非法实参与未知合同保守 | 正常完整语义按精确身份复用、生产 `generator-send-stdio.test.ts`、C2 send 七状态及当前完整 LSP 1,377 项通过；仅证明列出的支持子集，完整 F05 继续 |
| F05-GEN-03 | Generator 条件、try/catch/finally、switch、while/for/do/foreach、不可达顺序返回与嵌套闭包；完整与声明延迟两路径 | TReturn 包含真实隐式 null；finally 返回覆盖待返回值；不混入不可达或嵌套 callable 返回；保留 yield-only void 合同 | 当前完整语义/生产协议与精确源码绑定；见[编号映射](reports/generator-return-numbered-fixtures-2026-10-09.md)。只绑定已通过的 22 类完成路径及两个已知重复循环；不宣称任意循环、预算或整个 F05 完成。 |
| F05-GEN-04 | PHP 7.2/8.5 的 yield from 可空结果，未保护与非 null 保护后的成员访问及实参 | 未保护时撤回成员与导航，非 null 保护后恢复已证明成员；参数不匹配诊断对应实际合同 | 当前完整语义/生产协议与精确源码绑定；见[编号映射](reports/generator-return-numbered-fixtures-2026-10-09.md)。两端目标版本的语义消费者；不外推所有目标版本、平台或所有缩窄表达式。 |
| F05-GEN-05 | 未保存 partial/total/finally/unknown 合同切换、恢复与关闭重开；真实 C2 Undo/Redo | 签名、成员候选、定义、Hover 与参数诊断跟随当前缓冲区；未知合同撤回旧证明；编辑器七状态保持磁盘未改 | 当前完整语义/生产协议与精确源码绑定；见[编号映射](reports/generator-return-numbered-fixtures-2026-10-09.md)。生产协议 PHP 7.2/8.5 × onDemand/progressive 四项；真实编辑器为原完整 Linux C2 内七状态，不是人工 WSL 或其它平台资格。 |
| F04-NAV-01 | [跨文件 Composer 工作流](../../packages/language-server/test/stdio.test.ts) | 同一接口调用的补全、Hover、参数提示、定义、实现、引用精确；无关同名方法不混入；未保存新增调用立即进入引用，定义仍指向接口 | `stdio.test.ts` 的 F04-NAV-01 |
| F04-NAV-02 | [未保存接收者类型切换](../../packages/language-server/test/stdio.test.ts) | 在 F04-NAV-01 同一 Composer 项目中把接口参数改为另一个有同名方法的类型；等待第三版诊断发布后，Definition、Implementation、References、Hover 与 Signature Help 按新身份返回，无旧接口残留 | `stdio.test.ts` 的 F04-NAV-01 第三版文档 |
| F04-NAV-03 | [编辑后立即导航](../../packages/language-server/test/stdio.test.ts) | 将第三版未保存文档切回接口类型后，不等待诊断发布，立即请求 Definition 与 Implementation；两项都按第四版文档返回接口及其实现 | `stdio.test.ts` 的 F04-NAV-01 第四版文档 |
| F04-NAV-04 | [跨 namespace 的父类成员](../../packages/language-server/test/stdio.test.ts) | 独立 Composer 双 PSR-4 映射、双层 import alias 与继承：冷启动 Hover、Signature Help、Definition、Completion、References 分别可解析父类 `format()`；无关同名方法不混入 | `stdio.test.ts` 的 F04-NAV-04 |
| F04-NAV-05 | [跨 namespace 的 Trait 成员](../../packages/language-server/test/stdio.test.ts) | 同一 Composer 项目改由外部 Trait 提供方法；新服务器上的冷启动 Definition、Completion、Hover、Signature Help、References 分别指向 Trait 声明或唯一调用，无关同名方法不混入 | `stdio.test.ts` 的 F04-NAV-04/05 |
| F04-NAV-06 | [未完成成员与连续未保存编辑](../../packages/language-server/test/stdio.test.ts) | 连续发送 `Other`→`Contract` 两个版本，不等待诊断就查询未完成的 `$printer->re`：补全只有当前类型成员，Definition 指向当前声明；再切回 `Other`，专属候选和定义落点同步变化 | `stdio.test.ts` 的 F04-NAV-01 第五至七版文档 |
| F04-NAV-07 | [跨 namespace 同名短类](../../packages/language-server/test/stdio.test.ts) | `App\\Formatter` 与 `Acme\\Formatter` 各有不同签名的 `format()` 和专属成员；Consumer 通过 import alias 使用后，按需补全、Hover、参数提示、定义和引用分别归属真实类，不混合候选 | `stdio.test.ts` 的 F04-NAV-07 |
| F04-NAV-08 | [跨文件 Trait 优先级与别名](../../packages/language-server/test/stdio.test.ts) | 两个 Trait 都提供 `format()`，Host 用 `insteadof` 选择主方法并将另一方法命名为 `formatNumber()`；按需补全、Hover、参数提示、定义和引用区分两条成员链 | `stdio.test.ts` 的 F04-NAV-08 |
| F04-NAV-09 | [外部 Trait 修改后按需失效](../../packages/language-server/test/stdio.test.ts) | 已解析的主 Trait 在磁盘修改并收到文件变更通知后，同一会话的参数提示使用新签名，未修改的别名 Trait 仍保持原签名 | `stdio.test.ts` 的 F04-NAV-08 后半段 |
| F04-NAV-10 | [进行中查询取消与新版本](../../packages/language-server/test/stdio.test.ts) | 大型独立 Composer 项目的 References 已开始候选扫描时，发送较新未保存文档和取消请求；旧查询返回取消/内容已变更错误，后续 Definition 指向新接收者，不显示旧结果 | `stdio.test.ts` 的 F04-NAV-10 |
| F04-NAV-11 | [进行中 Implementation 与未保存声明编辑](../../packages/language-server/test/stdio.test.ts) | 大型独立 Composer 项目的 Implementation 已开始候选扫描时，不取消请求而将方法改名；旧请求返回内容已变更或空结果，新版本 Definition 指向新声明 | `stdio.test.ts` 的 F04-NAV-11 |
| F04-NAV-12 | [四类查询的进行中未保存编辑](../../packages/language-server/test/stdio.test.ts) | 测试模式在 Completion、Hover、Signature Help、Definition 捕获文档后暂停请求；提交新版本诊断再释放旧请求，旧请求返回空结果，新请求分别返回新接收者的成员、签名或落点 | `stdio.test.ts` 的 F04-NAV-12 |
| F04-NAV-13 | [关闭并同版本重新打开文档](../../packages/language-server/test/stdio.test.ts) | Completion、Hover、Signature Help、Definition 请求捕获旧文档后暂停；关闭并以相同版本号打开不同内容，旧请求不返回过期结果，新请求使用新接收者；覆盖 `onDemand`、`experimental`、`progressive` | `stdio.test.ts` 的 F04-NAV-13 |
| F04-NAV-14 | [双根 Composer 查询与版本隔离](../../packages/language-server/test/stdio.test.ts) | 两个项目使用相同 FQCN、不同方法签名；各根的六项查询分别命中本项目，首根未保存类型切换后第二根不受影响；PHP 7.2/8.5 的版本诊断与 `str_contains` 补全各按本根版本返回 | `stdio.test.ts` 的 F04-NAV-14；[多根报告](reports/c1-multiroot-2026-09-24.md)；[异版本报告](reports/c1-multiroot-versions-2026-09-24.md) |
| F04-NAV-15 | [嵌套 Composer 项目](../../packages/language-server/test/stdio.test.ts) | experimental 与 onDemand 均把同名类补全归属子项目，父项目 PHP 7.2 和子项目 PHP 8.5 的诊断分别正确 | `stdio.test.ts` 的 F04-NAV-15；[嵌套项目报告](reports/c1-nested-composer-2026-09-24.md) |
| F04-NAV-16 | [已安装 vendor 包的项目归属](../../packages/language-server/test/stdio.test.ts) | onDemand 打开带自身 `composer.json` 的 vendor 声明后，从声明查找引用仍能找到父项目调用 | `stdio.test.ts` 的 F04-NAV-16；[嵌套项目报告](reports/c1-nested-composer-2026-09-24.md) |
| F04-NAV-17 | [Composer path repository 符号链接](../../packages/language-server/test/stdio.test.ts) | 同一已安装本地包经 vendor 符号链接及真实路径打开时，声明 References 均找到父项目调用；独立嵌套项目仍按自己的根隔离 | `stdio.test.ts` 的 F04-NAV-15–17；[路径仓库报告](reports/c1-path-repository-2026-09-24.md) |
| F04-NAV-18 | [未打开的 Composer vendor 实现](../../packages/language-server/test/stdio.test.ts) | 项目只打开接口调用文件；Implementation 按需遍历已安装依赖，找到 vendor 内实现，重复查询仍准确 | `stdio.test.ts` 的 F04-NAV-18；[真实依赖树报告](reports/c1-real-composer-vendor-2026-09-24.md) |
| F04-NAV-19 | [Implementation 索引预算边界](../../packages/language-server/test/stdio.test.ts) | 小预算使依赖扫描不完整时，Implementation 返回专用错误与索引设置提示，不返回误导性的空结果 | `stdio.test.ts` 的 F04-NAV-19；[真实依赖树报告](reports/c1-real-composer-vendor-2026-09-24.md) |
| F04-HOST-01 | [隔离 VS Code Core 编码链](../../test/extension/suite/c1.ts) | VS Code 中实际请求补全、Hover、参数提示、定义、实现、引用；未保存切换接收者后六项都按新类型返回，无旧接口引用或实现；内建 PHP 基础提示默认关闭，`abs` 仅返回一个候选 | `pnpm test:extension:c1`；[未保存全链报告](reports/c1-unsaved-full-chain-2026-09-24.md)；[Provider 与等待报告](reports/c1-provider-ownership-latency-2026-09-24.md) |
| F04-HOST-02 | [Composer vendor 查询链](../../test/extension/suite/c1.ts) | 已安装 PSR-4 vendor 接口经项目 `use` 后，未完成成员补全、Hover、参数提示、Definition、Implementation、References 归属正确，排除无关同名调用；隔离 Core 宿主覆盖 auto、PHP 7.2、8.1、8.5 | [vendor 宿主报告](reports/c1-vendor-host-2026-09-24.md) |
| F04-HOST-03 | [双根 VS Code Core 查询链](../../test/extension/suite/c1.ts) | `.code-workspace` 中两个独立 Composer 项目使用相同 FQCN、不同签名；第二根六项查询只返回第二根事实；显式版本用例给两根不同 PHP 版本，运行中更改第二根设置后诊断更新；auto 用例从两根 Composer 解析 7.2/8.5，平台版本变化后更新诊断与内建补全 | [多根报告](reports/c1-multiroot-2026-09-24.md)；[异版本报告](reports/c1-multiroot-versions-2026-09-24.md)；[auto 版本报告](reports/c1-auto-composer-version-2026-09-24.md) |
| F04-HOST-04 | [VS Code Core 嵌套项目](../../test/extension/suite/c1.ts) | auto 模式下同一工作区的子项目用独立 Composer 平台 8.5；子项目补全、定义、引用和诊断不混入父项目，随后父项目新文件仍按 7.2 诊断 | [嵌套项目报告](reports/c1-nested-composer-2026-09-24.md) |
| F04-HOST-05 | [VS Code Core 运行时版本探测](../../test/extension/suite/c1.ts) | 第三独立 Composer 根不声明 PHP 约束，`auto` 使用工作区配置的 PHP 可执行文件；版本诊断和内建补全随探测版本变化 | [运行时探测报告](reports/c1-configured-runtime-2026-09-24.md) |
| F04-HOST-06 | [VS Code 可见补全列表](../../test/extension/suite/c1Ui.ts) | 隔离宿主逐个打开独立 PHP 文件、输入成员字符，Chromium Workbench DOM 观察器记录建议列表实际可见时间，并核对当前文件的精确候选；旧弹窗不能计入下一次样本 | [可见补全报告](reports/c1-visible-completion-2026-09-24.md) |
| F04-HOST-07 | [1,000 文件 Composer vendor 可见补全](../../test/extension/suite/c1Ui.ts) | 独立测试根预置 1,000 个 PSR-4 vendor 类，通过项目中 `use` 引入六个不同 vendor 接收者；逐次键入后建议列表包含当前声明的方法 | [vendor 可见补全报告](reports/c1-vendor-visible-completion-2026-09-24.md) |
| F04-HOST-08 | [未保存类型切换的可见补全](../../test/extension/suite/c1Ui.ts) | 同一 PHP 缓冲区内 A→B→A 修改参数类型且不保存，逐次重新键入未完成成员；Workbench 首次可见弹窗只含当前类型方法 | [未保存弹窗报告](reports/c1-unsaved-visible-completion-2026-09-24.md) |
| F04-HOST-09 | [PATH 中默认 PHP 的 auto 版本](../../test/extension/suite/c1.ts) | 无 Composer PHP 约束、无显式 PHP 路径时，`auto` 先采用 PATH 的 `php`；版本化命令只在该命令不可用时兜底。诊断与内建补全跟随实际选择 | [PATH 版本报告](reports/c1-path-php-version-2026-09-24.md) |
| F04-HOST-10 | [连续输入中的未保存类型切换](../../test/extension/suite/c1Ui.ts) | 同一缓冲区连续 10 轮输入 `r`、改接收者类型、再输入 `e`/`n`；可见建议最终只包含当前类型方法，记录轮询中出现的旧候选 | [连续输入报告](reports/c1-rapid-unsaved-completion-2026-09-24.md) |
| F04-HOST-11 | [锁定的真实 Composer 依赖树](../../test/extension/real-vendor/composer.json) | 30 个安装包、1,029 个 PHP 文件；PSR 接口六项查询命中 vendor 声明与实现，未保存切到 Logger 再切回后成员候选、定义和实现随之更新；可选 Workbench 模式确认真实候选可见 | `pnpm test:extension:c1:real-vendor`；[真实依赖树报告](reports/c1-real-composer-vendor-2026-09-24.md) |
| F04-HOST-12 | [带 Attribute 的箭头函数实参](../../test/extension/suite/c2.ts) | PHP 8.5 的外层调用在第一个实参中输入 `fn(#[\SensitiveParameter] ...)` 后，未保存地继续输入第二个命名实参前缀 `se`；补全给出 `second:`，参数提示指向外层第二个参数；真实 `#` 注释内不提供建议 | [C2 修复与宿主报告](reports/c2-attributed-arrow-named-arguments-2026-09-26.md) |
| F04-HOST-13 | [锁定的本地 Composer PSR-0 依赖](../../test/extension/real-psr0/composer.lock) | path repository 包安装到独立项目 `vendor/` 后，PHP 自动加载、未打开类型补全与导入、首次查询且未先补全的 Definition、Workbench 可见建议均指向 `Legacy_Component_Widget` | `PHP_COMPANION_TEST_CORE_ONLY=1 PHP_COMPANION_TEST_C1_ONLY=1 PHP_COMPANION_TEST_C1_UI=1 PHP_COMPANION_TEST_C1_PSR0_DEPENDENCY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js`；[PSR-0 报告](reports/c1-psr0-portable-type-completion-2026-09-26.md) |
| F08-EI-01 | [公开抽象与具体方法](../../packages/semantic/test/fixtures/acceptance/f08-extract-interface-valid.php) | 生成同 namespace 接口，保留 import 与两种公开签名；不包含 protected 方法；原类可加 `implements` | `acceptance-f08-extract-interface.test.ts` |
| F08-EI-02 | [合法的接口名别名冲突](../../packages/semantic/test/fixtures/acceptance/f08-extract-interface-alias-conflict.php) | PHP 源码有效，但新接口名被 import alias 占用，拒绝编辑 | 同上 |
| F08-EI-03 | [未完成的方法声明](../../packages/semantic/test/fixtures/acceptance/f08-extract-interface-incomplete.php) | 语法树含错误，拒绝编辑 | 同上 |
| F08-EM-01 | [完整 if/else 局部输出](../../packages/semantic/test/fixtures/acceptance/f08-extract-method-valid.php) | 提取私有方法并传入实际使用的布尔参数；调用处接回必有字符串输出；生成源码语法有效且输出类型保持 string | `acceptance-f08-extract-method.test.ts` |
| F08-EM-02 | [合法但缺少初值的部分分支输出](../../packages/semantic/test/fixtures/acceptance/f08-extract-method-counterexample.php) | 不生成可能改变未定义值路径的提取编辑 | 同上 |
| F08-EM-03 | [未完成的分支赋值](../../packages/semantic/test/fixtures/acceptance/f08-extract-method-incomplete.php) | 语法树含错误，拒绝提取 | 同上 |
| F08-EM-04 | `extract-method-branch-outputs.test.ts` 的 3／4／8／32 输出矩阵 | 完整 if/elseif/else 输出列表按顺序接回；生成语法、PHPDoc 与最后一项类型正确 | `extract-method-branch-outputs.test.ts`；三版本实际 PHP CLI；C3 三／四输出预览与一次 Undo/Redo |
| F08-EM-05 | 同一矩阵的九项拒绝输入 | 重复名、缺失、错序、类型差异、依赖、引用、已有名、无最终 else、超过预算时不提供动作 | 同上；PHP 7.2／8.5 stdio 未保存编辑往返 |
| F08-EM-06 | `extract-method-local-chain.test.ts` 的顺序赋值矩阵 | 标量局部依赖、单／多输出、整数溢出类型、闭包捕获和参数遮蔽对应正确；引用／未知／动态观察等拒绝 | 同名 27 项语义；PHP 7.2／8.5 stdio 未保存编辑与动作撤回；三版本 48 条实际 PHP 路径 |
| F08-EM-07 | `extract-method-local-return.test.ts` 的末尾返回矩阵 | 连续赋值和最后 return 提取，输入、表达式、数值溢出及原方法返回合同保持；未知／引用／除法等拒绝 | 同名 18 项语义；PHP 7.2／8.5 stdio；三版本 strict／非 strict 72 条实际 PHP 路径 |
| F08-RP-01 | [有效的直接调用](../../packages/semantic/test/fixtures/acceptance/f08-remove-parameter-valid.php) | 删除 private 形参、PHPDoc 与位置/命名标量实参；生成源码语法有效 | `acceptance-f08-remove-parameter.test.ts` |
| F08-RP-02 | [合法的间接 callable](../../packages/semantic/test/fixtures/acceptance/f08-remove-parameter-indirect.php) | PHP 源码有效，但无法同步编辑间接调用实参，拒绝操作 | 同上 |
| F08-RP-03 | [未完成的方法调用](../../packages/semantic/test/fixtures/acceptance/f08-remove-parameter-incomplete.php) | 同文件含语法错误，拒绝操作 | 同上 |
| F08-RP-04 | [方法家族的有副作用/嵌套/可选缺口实参](../../packages/semantic/test/reorder-effectful-method-arguments.test.ts)、[正常 stdio](../../packages/language-server/test/reorder-effectful-arguments-stdio.test.ts)与[实际编辑器流程](../../test/extension/suite/reorderEffects.ts) | 明确 PHP8.0–8.5 且参数名稳定时补名称而不移动表达式；PHP7/未知目标及名称不稳定拒绝，六真实 PHP 版本结果/副作用一致；三文件预览/并发输入保护/应用及一次 UndoRedo | [48语义/14协议/60真实PHP对照和两Linux模式定向编辑器](reports/reorder-effectful-arguments-2026-10-11.md)，新bundle a1730fb9；新完整LSP/C3/其它平台尚未执行 |
| F08-RP-05 | [默认值求值与行号](../../packages/semantic/test/reorder-default-evaluation.test.ts)、[正常 stdio](../../packages/language-server/test/reorder-default-evaluation-stdio.test.ts)、[编辑器流程](../../test/extension/suite/reorderDefaults.ts) | 拒绝省略的对象默认值倒序及行号默认值换行；保留多行声明/实参分隔符；核对可能实现，安全默认值与显式提供继续支持 | [63语义/20协议/九版本90真实PHP场景](reports/reorder-default-evaluation-2026-10-11.md)，正常bundle76236252；新增完整C3覆盖接入，当前完整验收待执行 |
| F08-MOVE-01 | 当前完整C3 onDemand的三文件Move Member；取消、新调用者、预览用户输入、实际验证响应延迟中的caller/target/disk修改及最终应用 | 前六次拒绝且保留原文/并发输入，末次移动三个文件；一次Undo/Redo精确恢复，磁盘未自动保存；第三次preview/beforeApply确实出现，输入保留于实际编辑器快照 | [原完整场景](../../test/extension/suite/c3.ts#L313)及[当前完整C3 onDemand验收](reports/current-full-c3-ondemand-observed-2026-10-11.md)；Linux被动观测宿主，原progressive失败未证明修复，全平台/模式仍开放。 另见[progressive完整C3守卫/协议观测](reports/c3-progressive-guard-protocol-observation-2026-10-11.md)：原完整progressive断言通过并捕获真实帧/参与者取消路径，仅私有内存诊断资格，原失败根因及无观测资格未证明。 |
| F09-SVC-01 | [有效服务声明与引用](../../packages/framework-symfony/test/fixtures/acceptance/f09-service-valid.yaml) | `@app.mailer` 的精确 ID 范围对应唯一 `app.mailer` 声明 | `acceptance-f09-services.test.ts` |
| F09-SVC-02 | [合法的转义与表达式字面量](../../packages/framework-symfony/test/fixtures/acceptance/f09-service-literal-counterexample.yaml) | YAML 仍有效，但 `@@app.mailer` 和 `@=service(...)` 不发布精确服务 ID 引用 | 同上 |
| F09-SVC-03 | [未完成的服务 YAML](../../packages/framework-symfony/test/fixtures/acceptance/f09-service-incomplete.yaml) | 配置图标记不完整，不发布服务事实或引用 | 同上 |
| F09-ROUTE-01 | [有效路由和 Controller](../../packages/framework-symfony/test/fixtures/acceptance/f09-route-valid.yaml) | 字面量名称、路径和 Controller 类/方法范围精确 | `acceptance-f09-routes.test.ts` |
| F09-ROUTE-02 | [合法的 Attribute 目录导入](../../packages/framework-symfony/test/fixtures/acceptance/f09-route-counterexample.yaml) | 保留导入事实，不捏造目录内的路由 | 同上 |
| F09-ROUTE-03 | [动态路径](../../packages/framework-symfony/test/fixtures/acceptance/f09-route-incomplete.yaml) | 路由图不完整，不发布该路由的推测事实 | 同上 |
| F09-ROUTE-04 | [YAML Controller 来源](../../packages/language-server/test/stdio.test.ts) | 约定入口和路由导入图确认的子文件可跳转；普通 YAML 即使有相同 `path`/`controller` 字段也不跳转 | [来源回归](reports/symfony-yaml-controller-provenance-2026-09-26.md) |
| F09-ROUTE-05 | [通配导入预算](../../packages/provider-symfony-routes/test/unit/provider-symfony-routes.test.ts) | 通配导入只扫描到部分 Controller 时，输入证据和路由表都标为不完整，不发布权威遗漏 | [预算回归](reports/symfony-glob-budget-completeness-2026-09-26.md) |
| F09-ROUTE-06 | [130 个 Controller 的通配导入](../../packages/provider-symfony-routes/test/unit/provider-symfony-routes.test.ts) | 默认 256 项预算中每个匹配文件只计一次；130 个 Controller 的路由图完整且路由名正确 | [规模回归](reports/symfony-glob-budget-completeness-2026-09-26.md) |
| F09-ROUTE-07 | `stdio.test.ts`：输入完整的未完成路由快照 | 不发布部分路由；复用不可用状态；已观察文件/目录的磁盘变更和无路由词元PHP的打开/修改/关闭均刷新；五类不可用输入证据仍在下一查询重试 | 两项文件/目录正例与五类证据恢复、原完整快照/权威/并行引用协议；[报告](reports/observed-incomplete-route-cache-2026-10-11.md)，不代替全量/编辑器/Remote资格 |
| F09-ROUTE-08 | `stdio.test.ts`：首次发现已打开的路由输入 | 首次文件/目录证据发现无路由词元的未保存PHP时，采用实时内容；只重取一次，连续扩展输入拒绝旧快照，下一查询恢复后重复查询复用 | 文件/目录 × 完整/未完成 × 一层/两层八项正常bundle协议；[报告](reports/route-discovered-open-inputs-2026-10-11.md)，不代替完整LSP/编辑器/Remote或性能资格 |
| F09-DOC-01 | [Entity、关联与 Repository](../../packages/framework-doctrine/test/fixtures/acceptance/f09-doctrine-valid.php) | 精确识别 Entity、Nullable ManyToOne 及 Repository 查询返回类型 | `acceptance-f09-doctrine.test.ts` |
| F09-DOC-02 | [合法的非 Doctrine Entity Attribute](../../packages/framework-doctrine/test/fixtures/acceptance/f09-doctrine-counterexample.php) | 不发布 Doctrine Entity 或 Repository 事实 | 同上 |
| F09-DOC-03 | [同文件中的完整与未闭合 Entity](../../packages/framework-doctrine/test/fixtures/acceptance/f09-doctrine-incomplete.php) | 保留完整 `Team`，抑制未闭合 `User` | 同上 |

执行 F04：`pnpm --dir packages/semantic exec vitest run test/acceptance-f04-references.test.ts`。这组验证有类型函数参数、文件顶层赋值的成员调用及全局函数引用；顶层场景另有真实 Language Server stdio Definition/References 回归，见[顶层导航报告](reports/f04-global-references-2026-09-23.md)。

执行 F08：`pnpm --dir packages/semantic exec vitest run test/acceptance-f08-extract-interface.test.ts test/acceptance-f08-extract-method.test.ts test/acceptance-f08-remove-parameter.test.ts`。这些测试验证语义计划、编辑后源码语法与拒绝边界；Extract Interface 的真实 VS Code 应用、Undo/Redo 和 PHP 7.2/8.5 加载证据见 [P7 Extract Interface 报告](reports/p7-extract-interface-2026-09-23.md)，Extract Method 的隔离宿主预览／应用／Undo/Redo 见[C3 源码宿主复核](reports/post-stubs-c1-c2-source-host-2026-10-01.md)，private 参数删除的间接调用与 stdio 证据见[专项报告](reports/p7-private-parameter-callables-2026-09-23.md)。

执行 F09：`pnpm --dir packages/framework-symfony exec vitest run test/acceptance-f09-services.test.ts test/acceptance-f09-routes.test.ts`。这两组测试验证静态 YAML 事实提取与精确范围；[F09 Provider 链路报告](reports/f09-provider-completeness-2026-09-23.md)还记录了 F09-SVC-01/03 和 F09-ROUTE-01/03 经真实 Provider 与 Language Server 的正例和不完整快照验证。扩展宿主、框架版本和真实项目动态边界仍需单独编号与验证。其余 F01–F14 场景映射也仍待补齐。

Winstar 当前 Symfony 7.4.17 的运行时路由另由 `pnpm check:f09:winstar-routes` 验证首次路径参数补全、显式路由及默认生成路由的精确 Definition；它读取真实项目和运行时 Router，属于环境限定的集成探针，范围见[Winstar 报告](reports/f09-winstar-framework-probe-2026-09-23.md)。

执行 F09 Doctrine：`pnpm --dir packages/framework-doctrine exec vitest run test/acceptance-f09-doctrine.test.ts`。该组验证静态事实和未完成类抑制；[Doctrine 未完成输入报告](reports/f09-doctrine-incomplete-2026-09-23.md)记录既有真实 Language Server 集成回归的范围。完整编辑器工作流仍待验收。

实际安装版本的按需查询补充检查使用 `pnpm check:f09:doctrine`：它在 CoreRepo 的 Doctrine 2.20.13 与 Winstar 的 3.6.8 源码上分别验证首个成员补全请求和动态类反例，具体范围见[双版本报告](reports/f09-doctrine-version-matrix-2026-09-23.md)。这项真实项目探针不属于可移植 fixture，也不代替 WSL Remote 编辑器验收。

2026-10-03 F03-BUILTIN-07／08 已补齐当前 Core Windows 原生隔离宿主的 PHP 8.5 目标证据，磁盘与未保存编辑断言通过；D39 的未保存 Trait final 崩溃恢复也已通过 Windows 不同 PID 检查。当前 Windows 完整 Core C2 65 条证明另有终态，见 [记录](reports/phpstorm-stubs-current-windows-2026-10-03.md)，不作为真人 WSL 或完整外部 Pack 验收。

## 诊断、生成、恢复与兼容性编号

以下编号绑定已有输入和精确测试身份；同一案例可支持多个编号，不能重复计入通过数量。对应当前构建结果在映射报告中逐项记录。自动测试、源码宿主、打包 VSIX 和真人验收保持各自范围。

| 编号 | 输入 | 预期 | 自动验证与范围 |
| --- | --- | --- | --- |
| F06-DIAG-01 | 唯一 private／protected 构造器，在不可访问位置实例化 | 仅报告精确列出的六个不可访问构造；保留声明所有者和可见性 | [semantic.test.ts](../../packages/semantic/test/semantic.test.ts)；语义夹具；不声明所有未知／不完整诊断已完成。 |
| F06-DIAG-02 | 同一个构造器矩阵中的类内 private 调用、合法 protected 类族调用、重复类身份 | 合法调用及歧义身份不混入不可访问构造诊断 | [semantic.test.ts](../../packages/semantic/test/semantic.test.ts)；与 F06-DIAG-01 绑定同一案例，不增加测试案例数。 |
| F06-DIAG-03 | 构造器调用者继承尚未加载的 MissingParent | 继承覆盖不足时不猜测当前作用域的构造访问权限 | [semantic.test.ts](../../packages/semantic/test/semantic.test.ts)；缺失层级证据；不能代替未完成 PHP 输入。 |
| F06-DIAG-04 | 嵌套 (void) 表达式后有未完成的 function unfinished( | 语法诊断范围只保留未完成声明；8.4／8.5 版本诊断分别按四项／零项检查 | [analysis.test.ts](../../packages/language-server/test/analysis.test.ts)；只覆盖固定恢复输入及两个版本，不替代全部错误恢复。 |
| F06-DIAG-05 | 外层 `??`／`empty` 包裹闭包或箭头函数；内部未定义变量、合法捕获与局部安全读取；未保存修改、恢复及关闭重开 | 外层安全读取不能抑制函数内部诊断；内部 `??`／`empty`／`isset`、合法捕获及精确 UTF-16 范围保持 | [语义测试](../../packages/semantic/test/undefined-variable-scope-boundary.test.ts)、[正常协议测试](../../packages/language-server/test/undefined-variable-scope-boundary-stdio.test.ts)；PHP 7.2/8.5、onDemand/progressive 的 Linux/Windows 协议；不替代全部版本、编辑器或真人验收。 |
| F07-GEN-01 | 具名 Plain 类的未初始化 name／owner 属性及已初始化／static 属性 | 构造生成只选择 name 与 owner，类型分别为 string 与 ?User | [semantic.test.ts](../../packages/semantic/test/semantic.test.ts)；语义候选；应用／选区／UndoRedo 仍由原完整 C3 证明。 |
| F07-GEN-02 | 合法 Child、已有构造器 Existing、带 hook 的 Hooked 类 | 三种不适用上下文均拒绝生成构造器 | [semantic.test.ts](../../packages/semantic/test/semantic.test.ts)；与 F07-GEN-01 共享一个真实案例；不将保守拒绝视为通用生成完成。 |
| F07-GEN-03 | 有普通、final、private、魔术及已重写方法的父类；另有缺失父类的 Broken | 仅提供 label 的精确签名；不提供被禁止或已实现的方法，Broken 无建议 | [semantic.test.ts](../../packages/semantic/test/semantic.test.ts)；该编号同时记录不完整父类反例；未完成语法的生成仍待专项编号。 |
| F07-IMPORT-01 | 两个外部同名 Service 与当前 namespace 的 Service；显式别名 ExternalService／Service | 冲突时要求 alias；ExternalService 可插入，省略或使用冲突别名 Service 时拒绝 | [semantic.test.ts](../../packages/semantic/test/semantic.test.ts)；语义 import 计划；异步命令的完整编辑器工作流由 C3 单独证明。 |
| F13-QNAME-01 | [限定原生类型补全](../../packages/semantic/test/qualified-native-type-completion.test.ts)：版本/保留树、限定/绝对/alias/namespace、类型上下文、Latin-1、长前缀及负例 | 原 namespace/候选与源前缀保持；五场景五轮100查询均低于原150ms，正常八运行时匹配已测候选 | [80公开控制、23862正常完整语义与25轮原矩阵](reports/qualified-type-completion-suffix-2026-10-11.md)；不外推完整性能、其它平台或真实长期。 |
| F13-LONG-01 | 1,000文件真实LS协议会话：连续编辑/五结果检查、真实进程退出、实际缓存manifest损坏与新符号候选准备 | 精确Beta结果与关闭后的Alpha恢复、重发未保存缓冲区首查询正确、磁盘不变、坏manifest重建；testkit冻结预算，7200秒实际时长才可判多小时通过 | [脚本](../../scripts/benchmark-long-session.mjs)及[长期编辑与恢复首轮验收](reports/long-session-runner-initial-qualification-2026-10-11.md)；60秒控制及[两小时终态](reports/long-session-two-hour-terminal-2026-10-11.md)通过，23629轮/118145结果、陈旧0及两次实际故障恢复；Linux合成/协议范围，不替代编辑器、取消、真实项目或全矩阵。 |
| F13-REF-LIFETIME-01 | PHP 7.2／8.5 的 cold、cached、legacy、corrupted 引用准备与缓存 | 每轮恰好一个 progress end；非取消轮正常 100% 结束；缓存命中为 41／41，损坏轮为 40／41，精确补全保持 | [reference-progress-lifecycle-stdio.test.ts](../../packages/language-server/test/reference-progress-lifecycle-stdio.test.ts)；一个参数化案例内部多阶段；不把阶段数或重复编号增加为案例数，不证明峰值 RSS 或长期预算。 |
| F13-REF-LIFETIME-02 | 同一测试的 overlay 未保存 onlyEdited 与 cancelled 进度阶段 | overlay 只返回当前缓冲区候选且磁盘不变；取消轮结束进度且不发布 references ready | [reference-progress-lifecycle-stdio.test.ts](../../packages/language-server/test/reference-progress-lifecycle-stdio.test.ts)；与上一编号共享 PHP 7.2／8.5 两个案例；不证明所有取消路径均在 100 ms 内。 |
| F14-CONFIG-01 | Rename／Paste 默认值、全部已发布旧模式、新旧配置同时显式设置、语言覆盖 | 默认与旧值翻译保持；显式新配置优先；最终采用有效语言覆盖值 | [rename-settings-migration.test.ts](../../test/unit/rename-settings-migration.test.ts)；八个单元案例；不证明真实 VS Code 配置迁移 UI 或未知非法值策略。 |
| F14-MANIFEST-01 | Core／Symfony manifest、英中命令与设置描述、已冻结公开合同 | 公开合同按基线和显式新增 Move Member 保持；命令身份唯一、分类为 SoPHP、设置描述本地化键及中文值完整 | [public-manifest-baseline.test.ts](../../test/unit/public-manifest-baseline.test.ts)；两个单元案例，不代替当前 VSIX 的最终打包验收。 |
| F14-LOCALE-01 | VS Code locale 为 en／zh-cn 的动作、类型名、动态插值文本 | 英文和简中各返回固定动作标签及正确插值，简中类型名称进入同一消息路径 | [runtime-localization.test.ts](../../test/unit/runtime-localization.test.ts)；两个单元案例；未知 locale、真人弹窗和全部 UI 文本仍不由本编号关闭。 |



## F05 高级类型与控制流补充编号

以下 12 个编号绑定当前完整语义结果中的 12 个已有案例，没有新增或重复计数测试。仅表示相应语义输入与正反例可追踪；未完成输入恢复、协议、编辑器、性能及完整 F05 仍需分别验收。精确测试身份和源码摘要见[映射报告](reports/advanced-type-numbered-fixtures-2026-10-11.json)。

| 编号 | 输入 | 预期 | 自动验证 |
| --- | --- | --- | --- |
| F05-TEMPLATE-01 | Producer 协变／Consumer 逆变与 Box 不变 | 协变及逆变合法转发不误报；Box<Child> 到 Box<Parent> 只产生对应的不兼容诊断；快照保留模板方差 | [semantic.test.ts:10995](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-TEMPLATE-02 | 直接／递归／参数重排与不匹配 PHPDoc 父类 | Pair／Reversed／Mirrored 和接口参数沿真实父链替换；明确不兼容的实参报错，不凭伪造 @extends 推断关系 | [semantic.test.ts:11025](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-SHAPE-01 | 联合数组形状的固定、动态与引用写入 | 固定 meta.flag 写入保留无关 item 联合成员；确定覆盖 object 可缩窄；动态键与引用别名撤回无法证明的事实 | [semantic.test.ts:864](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-SHAPE-02 | 可选或缺失中间形状的固定键写入 | 写入 meta.flag 后保留 item 公共成员；可选 meta 的 object 不被伪造为确定存在 | [semantic.test.ts:900](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-SHAPE-03 | 两层引用别名及未证明调用副作用 | 四种引用／调用变体撤回旧对象类型和成员候选；不以写入文本假定最终类型 | [semantic.test.ts:929](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-CALLABLE-01 | 显式闭包／箭头函数参数与返回方差 | 合法参数逆变和返回协变不误报；确定不兼容参数／返回分别报错；未注明或动态 callable 不伪造确定错误 | [semantic.test.ts:10976](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-CONDITIONAL-01 | 布尔／模板条件、默认／具名参数、静态／实例调用 | 已证明条件选择对应成员；未知布尔仅保留两个结果的公共成员，不猜测任一分支专有成员 | [semantic.test.ts:11769](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-FLOW-01 | 断言与 &&／\|\|／取反／嵌套及中途 mutation | 仅逻辑蕴含的后续操作数获得目标成员；不成立分支与 mutation 后撤回 | [semantic.test.ts:5668](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-FLOW-02 | while／for／do 与循环内 mutation | while／for 已证明循环体及短路操作数获得成员；循环退出、写入后及 do 首次循环体不泄漏事实 | [semantic.test.ts:5695](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-FLOW-03 | return／throw／exit／switch／try-finally 与嵌套、循环守卫 | 仅完整终止路径允许守卫后缩窄；非终止分支、break／goto、缺失 default、动态循环及 mutation 不误保留事实 | [semantic.test.ts:5727](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-BOUND-01 | 层级变更往返与 300 层 list 展开 | 父子关系变更使冲突出现／撤销；超过类型预算时保持保守，不伪报类型冲突；不据此宣称性能达标 | [semantic.test.ts:9278](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |
| F05-MIXIN-01 | 泛型 mixin 的有效／错数／越界／缺失类型及缓存恢复 | 合法模板成员特化并可导航；错误参数／bound／缺失目标无候选；有效快照恢复，损坏参数拒绝 | [semantic.test.ts:2647](../../packages/semantic/test/semantic.test.ts)，精确身份见报告；完整语义 23,776 项当前通过 |


## 生成类体与未完成输入的编号

| 编号 | 输入 | 预期 | 自动验证与范围 |
| --- | --- | --- | --- |
| F07-GEN-BODY-01 | 五类生成入口的完整 class、嵌套方法括号与注释括号 | 返回当前类的正确插入位置；实际生成的方法属于所选类 | [语义回归](../../packages/semantic/test/generation-body-boundary.test.ts)、[生产协议](../../packages/language-server/test/generation-body-boundary-stdio.test.ts)、[C3 工作流](../../test/extension/suite/generationBodyBoundary.ts)；正常语义、生产协议与 C3；共享同一组回归，不重复计数。 |
| F07-GEN-BODY-02 | 方法已闭合但 class 缺失右括号、注释伪括号，以及未完成方法 | 不提供五类生成动作，不借用内部方法或注释中的右括号 | [语义回归](../../packages/semantic/test/generation-body-boundary.test.ts)、[生产协议](../../packages/language-server/test/generation-body-boundary-stdio.test.ts)、[C3 工作流](../../test/extension/suite/generationBodyBoundary.ts)；拒绝仅针对所选 class；不声称所有未完成输入均已覆盖。 |
| F07-GEN-BODY-03 | 有效 class 后方的无关未完成函数，以及上述合法生成动作 | 保留生成能力及无关错误文本；预览取消不改原文，应用后可一次 Undo/Redo | [语义回归](../../packages/semantic/test/generation-body-boundary.test.ts)、[生产协议](../../packages/language-server/test/generation-body-boundary-stdio.test.ts)、[C3 工作流](../../test/extension/suite/generationBodyBoundary.ts)；完整 C3 两模式各40组；该编号复用前两编号的语义/协议案例，不新增测试案例。 |

## 返回语句注释与闭包合同

| 编号 | 输入 | 预期 | 自动验证与范围 |
| --- | --- | --- | --- |
| F05-GEN-06 | Generator 返回语句注释、裸 return、未知调用与不完整语法 | 即时及延迟声明模式使用真正的返回表达式；注释不遮蔽已知类型，未知调用和不完整语法不伪造 Generator 或对象成员证明 | [当前编号绑定](reports/commented-return-numbered-fixtures-2026-10-09.md)，即时/延迟声明模式，保留合法反例与未完成输入；不关闭完整F05。 |
| F05-CALLABLE-02 | 闭包返回语句注释下的模板成员导航、合法尾随注释与未知／不完整反例 | 即时及延迟声明模式使用真正的返回表达式；注释不遮蔽已知类型，未知调用和不完整语法不伪造 Generator 或对象成员证明 | [当前编号绑定](reports/commented-return-numbered-fixtures-2026-10-09.md)，即时/延迟声明模式，保留合法反例与未完成输入；不关闭完整F05。 |

## F02 PHPDoc AST 基础编号

以下编号绑定已有包内案例和本次独立消费检查，不新增或重复计数测试，仅关闭 P2 独立 AST 的基础合同，不替代版本语法、全部 PHPDoc/类型传播或最终 F02/F05 验收。[当前证据](reports/phpdoc-ast-foundation-contract-2026-10-10.md)绑定完整 28 项包内测试。

| 编号 | 可运行输入 | 期望结果 | 执行证据 |
| --- | --- | --- | --- |
| F02-DOC-AST-01 | [PHPDoc 包测试](../../packages/phpdoc/test/phpdoc.test.ts)中的 typed tags、nested types、variadic/reference 参数及 conditional 类型输入 | AST 结构化保存类型，variable/name 与 description 分离，复杂类型不吞掉参数及说明 | 完整包内测试；报告的隔离 package exports 消费核对复杂 param/return |
| F02-DOC-AST-02 | 同文件的 ignored extensions、deprecated descriptions、Unicode/CRLF 加 base offset 输入 | 说明不作为类型；已支持 param-out 与未知 param-out-extra 区分，UTF-16 范围指向原文 | 完整包内测试及隔离消费 |
| F02-DOC-AST-03 | 同文件的 incomplete generic、Callable 和缺失 param/return 类型输入 | 返回结构化错误，保留已有合法标签，未知标签不伪装成支持标签 | 完整包内正反例；隔离消费核对不完整泛型/param |

执行：`pnpm --dir packages/phpdoc test`。基础报告保留历史单行限制；当前多行支持与范围见下节。

## F02/F05 多行 PHPDoc 编号

[当前证据](reports/phpdoc-multiline-types-2026-10-10.md)绑定新增12项解析、11项语义及4项生产协议；以下编号复用这些案例，不增加或重复计算测试数量。

| 编号 | 可运行输入 | 期望结果 | 执行证据 |
| --- | --- | --- | --- |
| F02-DOC-MULTI-01 | [解析回归](../../packages/phpdoc/test/multiline.test.ts)：LF/CRLF/CR、嵌套shape、Callable、条件类型、模板、magic method、引用标签的字符串及说明中的括号 | 跨行类型与说明分离，绝对UTF-16节点范围对应原文，不把引用字符串识别为标签；单行magic method参数范围也保持 | 完整PHPDoc40项 |
| F02-DOC-MULTI-02 | 同文件：未完成类型与后续已支持/未知物理标签行 | 局部AST保留并标记invalid，错误范围不跨入下一标签，后续合法标签保持 | 完整PHPDoc40项 |
| F05-DOC-MULTI-01 | [语义回归](../../packages/semantic/test/phpdoc-multiline.test.ts)：跨文件返回/同文件参数shape、owner切换、未完成return shape、继承泛型构造器 | 立即/延迟事实模式查询正确，撤销旧owner；未完成return不发布对象成员；名称绑定保留键/字面量/原注释装饰 | 完整语义23,720项 |
| F05-DOC-MULTI-CACHE-01 | 同文件及[持久缓存回归](../../packages/language-server/test/project-facts.test.ts)：完整/声明/源码声明恢复与旧版本快照 | 新90/8快照保留类型传播，旧89/7快照拒绝且不污染当前事实 | 完整语义与LSP |
| F05-DOC-MULTI-LSP-01 | [生产协议](../../packages/language-server/test/phpdoc-multiline-stdio.test.ts)：PHP7.2/8.5 × onDemand/progressive，未保存跨文件owner替换、未完成return及恢复 | 补全、精确声明范围与Hover同步更新，原四磁盘文件不变；不额外等待或重试索引 | 完整LSP1,468项，新增4项均通过 |

## F02/F05 Magic method 参数编号

[当前证据](reports/phpdoc-magic-method-parameters-2026-10-10.md)绑定新增26项解析、5项语义和4项生产协议；以下编号复用案例，不重复计数，不替代当前未通过的完整LSP门禁。

| 编号 | 可运行输入 | 预期结果 | 验证范围 |
| --- | --- | --- | --- |
| F02-DOC-METHOD-01 | [参数解析](../../packages/phpdoc/test/method-parameters.test.ts)：转义/逗号字符串、数值、常量、短/长嵌套数组、后续参数与嵌套Callable | 具体默认值文本与所有后续参数保留；原始类型UTF-16范围正确；Callable可选标记保持 | 完整PHPDoc66项 |
| F02-DOC-METHOD-02 | 同文件：缺失shape/generic括号、缺失默认值、非法数组/数字和额外表达式 | 方法标签invalid，错误限制在参数源码范围；后续property保持合法 | 完整PHPDoc66项 |
| F05-DOC-METHOD-01 | [语义回归](../../packages/semantic/test/phpdoc-method-parameters.test.ts)：即时/延迟、真实默认值、错误参数与恢复、三种快照恢复 | 签名保留三参数与默认文本；错误方法不发布签名/返回成员，相邻property保持；91/9可恢复且90/8拒绝 | 完整语义23,725项 |
| F05-DOC-METHOD-LSP-01 | [生产协议](../../packages/language-server/test/phpdoc-method-parameters-stdio.test.ts)：PHP7.2/8.5 ×两模式、未保存默认值修改、错误参数/默认数组及恢复 | Signature Help显示真实默认值，补全/精确Definition按当前合同撤销和恢复，磁盘不变 | 四项通过；原完整stdio案例两处真实默认值期望也验证 |

## F09 Controller 同epoch换代编号

[当前证据](reports/controller-context-generation-refresh-2026-10-10.md)绑定新增四项受控协议，复用原Controller及完整LSP案例，不额外计数。

| 编号 | 可运行输入 | 预期结果 | 验证范围 |
| --- | --- | --- | --- |
| F09-CTX-GEN-01 | [受控协议](../../packages/language-server/test/controller-context-generation-stdio.test.ts)：两PHP版本，watcher已发布、旧代Provider未完成时progressive新代启动，epoch不变 | 有效请求自动按原预算准备当前代，模板与snapshotVersion对应新代，不返回null或旧模板 | 新四项与完整LSP1,476项 |
| F09-CTX-GEN-02 | 同文件：两请求共享准备，取消一位后索引换代 | 取消请求返回null，未取消请求获得当前上下文，后续查询稳定；不扩大恢复预算 | 新四项、原共享取消及完整LSP |

## PHPDoc解析资源边界（2026-10-10）

| 编号 | 场景与证据 |
| --- | --- |
| F02-DOC-BUDGET-01 | `packages/phpdoc/test/complexity.test.ts`：深/宽类型、精确深度与节点边界、UTF-16错误范围、有效后续标签及独立说明文字；`packages/semantic/test/phpdoc-complexity.test.ts`：完整/延迟事实撤销、相邻声明与三种缓存恢复，旧91/9事实拒绝。 |
| F05-DOC-BUDGET-01 | `packages/language-server/test/phpdoc-complexity-stdio.test.ts`：PHP7.2/8.5 × onDemand/progressive，正常→过深括号→过深后缀→恢复，补全、精确Definition/Hover及磁盘保持；原四组失败与新四组通过独立保留。 |

见[解析复杂度报告](reports/phpdoc-parsing-complexity-2026-10-10.md)。其余原场景/平台保持，未关闭大项。

## 混合 PHP/HTML 边界补充（2026-10-10）

- F02-MIXED-01：`packages/parser/test/mixed-document-edits.test.ts`，11项；纯HTML/短echo、UTF-16、LF/CRLF、file/Remote身份、增量/冷解析与恢复的精确事实和范围。
- F04-MIXED-01：`packages/semantic/test/mixed-html-references.test.ts`，8项；类型/常量精确引用和Rename、HTML导航拒绝、未完成输入与实现缓存失效。
- F04-MIXED-02：`packages/language-server/test/mixed-html-boundaries-stdio.test.ts`，8项；两版本/两模式/两换行，生产协议实际应用Rename与恢复、HTML导航拒绝、未完成成员及磁盘不变。

[验收报告](reports/mixed-html-symbol-boundaries-2026-10-10.md)。这批不关闭完整P2混合区域条目或真实编辑器/Remote验收。

## F01/F10/F11/F12 工作流编号（2026-10-11）

四个此前缺少编号的家族补充16项；原136项保持。精确测试身份、AST范围、当前通过层级及限制见[映射报告](reports/workflow-numbered-fixtures-2026-10-11.json)。这些编号仅绑定已有可运行输入，不关闭任何完整最终验收项。

| 编号 | 输入 | 预期 | 自动验证 |
| --- | --- | --- | --- |
| F01-PACK-01 | 冻结Open Source Pack、Core默认启用、无Intelephense的干净源码Profile | 十个默认成员保持；内置PHP补全关闭，Core按onDemand启动，真实Definition/References可用 | [源码](../../test/unit/extension-pack.test.ts#L65)；源码宿主与manifest证据；不能代替当前VSIX、真实WSL或长期编码验收。 |
| F01-ACTIVATION-01 | 仅安装SoPHP且未显式改语言服务器设置 | 默认启动，不标记竞争服务器阻止 | [源码](../../test/unit/language-server-policy.test.ts#L25)；注入状态的策略单元；实际启动由完整Profile另证。 |
| F01-ACTIVATION-02 | Intelephense已安装、显式启用或显式关闭SoPHP | 未作选择时保留旧工作流；显式启用/关闭分别生效 | [源码](../../test/unit/language-server-policy.test.ts#L30)；策略单元；不声称竞争Profile真实UI或所有第三方LS均完成。 |
| F01-LIFECYCLE-01 | 一分钟内连续四次关闭及超过窗口后的再次关闭 | 前三次重启，第四次拒绝循环；窗口结束后重新允许 | [源码](../../test/unit/language-server-policy.test.ts#L5)；注入时钟与状态，不替代真实崩溃、恢复或多小时会话。 |

## Unicode方法token与语法恢复

| 编号 | 场景/源码 | 预期 | 验证范围 |
| --- | --- | --- | --- |
| F02-UTF8-01 | [补充平面语法恢复](../../packages/parser/test/supplementary-identifiers.test.ts)及[方法token](../../packages/semantic/test/unicode-method-reference-tokens.test.ts) | 原名字、UTF-16范围、缓存树与后续编辑保持；字符串/注释及其它语法错误不被掩盖；Definition和移除后的References精确 | 3项Parser、6项Semantic；九版本36次独立实际PHP调用，[报告](reports/prepared-reference-identifier-normal-2026-10-11.md)；[当前完整Parser/Semantic/LSP](reports/prepared-reference-identifier-full-qualification-2026-10-11.md)通过；不代表完整Unicode语言支持 |
| F10-CONTEXT-01 | named render/renderView、compact、局部/多变量/assigned参数及Template属性 | 完整上下文提供真实变量类型和PHP来源；各模板与属性路径保持独立 | [源码](../../test/extension/suite/index.ts#L14)；当前Core/Symfony/Twig源码组合；其它框架版本和所有上下文仍待验证。 |
| F10-CONTEXT-02 | assigned参数的未保存key编辑及Undo | Twig补全和Definition刷新并在Undo后恢复 | [源码](../../test/extension/suite/index.ts#L179)；同一完整Profile流程，不重复算测试；未运行的route Rename分支不计为通过。 |
| F10-CONTRACT-01 | 有效上下文、无来源、空union及反向valueLocation范围 | 接受有效结构，拒绝缺失或损坏结构 | [源码](../../packages/interop/test/interop.test.ts#L11)；包级协议合同，不替代真实跨仓UI或全部恶意输入。 |
| F10-CONTRACT-02 | 共有能力、错误协议版本与未知capability | 只协商共有能力；错误版本和未知能力拒绝 | [源码](../../packages/interop/test/interop.test.ts#L22)；仅记录此案例实际断言，不扩展为所有project/snapshot协商已验收。 |
| F10-CONTRACT-03 | 多个控制器、条件变量、unknown/incomplete与不同模板 | 合并保留可选性及来源；未知不猜测；不同模板拒绝合并 | [源码](../../packages/interop/test/interop.test.ts#L29)；合同级已有四项，不替代全F10或受限跨语言Rename。 |
| F11-FORMAT-01 | PHP8.5 wrapper、项目PSR12配置及有空格错误的PHP类 | PHP CS Fixer真实提供并应用编辑；一次Undo恢复原文 | [源码](../../test/extension/suite/index.ts#L826)；该场景只验应用/Undo，失败恢复另见F11-FORMAT-03；保存/Undo/Redo另见F11-FORMAT-04，版本/平台矩阵仍开放。 |
| F11-FORMAT-02 | 同一组合中的Profile.html.twig及PHP默认formatter | PHP选择junstyle.php-cs-fixer；Twig格式化入口返回编辑 | [源码](../../test/extension/suite/index.ts)；本场景只验入口返回编辑，实际应用/Save/Undo/Redo见F11-FORMAT-05；Twig失败恢复见F11-FORMAT-09，全部Provider唯一性仍开放。 |
| F11-FORMAT-03 | 同一完整12扩展源码Profile中的真实PHP8.5.9、抛异常的项目formatter配置、独有PHP执行见证及恢复配置 | CLI实际失败、零编辑；缓冲区/版本/dirty/磁盘不变；逐字恢复配置后真实格式化应用并单步Undo精确恢复，磁盘保持 | [持久场景](../../test/extension/suite/formatterFailure.ts)及[完整宿主报告](reports/formatter-failure-recovery-2026-10-11.md)；Linux/VSCode1.140.0，本场景只验PHP失败恢复，保存/重做见F11-FORMAT-04/05；保存中PHP失败恢复见F11-FORMAT-08，Twig失败恢复见F11-FORMAT-09；全矩阵仍开放。 |
| F11-FORMAT-04 | 同一完整12扩展源码Profile中的未格式化PHP与PHP CS Fixer默认formatter | 实际Format Document改变缓冲区不写磁盘；Save逐字保存；一次Undo恢复原文并dirty，磁盘保持格式化内容；一次Redo恢复格式化缓冲区并清除dirty | [持久场景](../../test/extension/suite/formatterSave.ts)及[完整宿主报告](reports/formatter-save-undo-redo-2026-10-11.md)；PHP8.5.9/Linux/VSCode1.140.0，自动保存另见F11-FORMAT-06；全版本/平台矩阵继续。 |
| F11-FORMAT-05 | 同一完整12扩展源码Profile中的未格式化Twig与TwigPlus默认formatter | 实际Format Document生成Twig预期词法内容；Save逐字保存；一次Undo/Redo精确恢复原文/格式化文，dirty与磁盘状态逐项保持 | [持久场景](../../test/extension/suite/formatterSave.ts)及[完整宿主报告](reports/formatter-save-undo-redo-2026-10-11.md)；Linux/VSCode1.140.0，自动保存和失败恢复另见F11-FORMAT-07/09；全平台矩阵继续。 |
| F11-FORMAT-06 | 同一完整12扩展源码Profile中的PHP自动保存场景 | 语言format-on-save开启时Save自动格式化并逐字保存；一次Undo/Redo精确恢复保存前/格式化缓冲区，dirty与已保存磁盘状态保持；原语言设置恢复 | [持久场景](../../test/extension/suite/formatterOnSave.ts)及[完整宿主报告](reports/formatter-on-save-failure-recovery-2026-10-11.md)；Linux/PHP8.5.9/VSCode1.140.0，仅上述输入；全版本/平台及其它失败矩阵继续。 |
| F11-FORMAT-07 | 同一完整12扩展源码Profile中的Twig自动保存场景 | 语言format-on-save开启时Save自动格式化并逐字保存；一次Undo/Redo精确恢复保存前/格式化缓冲区，dirty与已保存磁盘状态保持；原语言设置恢复 | [持久场景](../../test/extension/suite/formatterOnSave.ts)及[完整宿主报告](reports/formatter-on-save-failure-recovery-2026-10-11.md)；Linux/PHP8.5.9/VSCode1.140.0，仅上述输入；全版本/平台及其它失败矩阵继续。 |
| F11-FORMAT-08 | 同一完整12扩展源码Profile中的PHP失败保存恢复场景 | 真实PHP异常配置见证/CLI失败；Save原样保存用户输入，缓冲区/版本保持；纠正配置/源码后自动保存格式化恢复，设置恢复 | [持久场景](../../test/extension/suite/formatterOnSave.ts)及[完整宿主报告](reports/formatter-on-save-failure-recovery-2026-10-11.md)；Linux/PHP8.5.9/VSCode1.140.0，仅上述输入；全版本/平台及其它失败矩阵继续。 |
| F11-FORMAT-09 | 同一完整12扩展源码Profile中的Twig失败保存恢复场景 | 实际Twig服务器拒绝非法嵌入JS；Save原样保存用户输入，缓冲区/版本保持；纠正配置/源码后自动保存格式化恢复，设置恢复 | [持久场景](../../test/extension/suite/formatterOnSave.ts)及[完整宿主报告](reports/formatter-on-save-failure-recovery-2026-10-11.md)；Linux/PHP8.5.9/VSCode1.140.0，仅上述输入；全版本/平台及其它失败矩阵继续。 |
| F11-FORMAT-10 | 隔离formatter候选1948676a的原完整套件；两个Composer根、空格/Tab配置、带空格PHP/入口路径，实际PHP8.5.9/8.4.23并发 | 项目配置独立，输出各自缩进；PHP运行时见证与两份探测一致；原格式化/UndoRedo/保存/幂等保持 | [既有完整套件](../../test/extension/suite/formatterCandidateAcceptance.ts)及[当前实测](reports/formatter-dual-runtime-project-config-2026-10-11.md)；仅隔离候选/Linux/VSCode1.140.0，不转移为默认formatter或全矩阵资格。 |
| F11-FORMAT-11 | 同一隔离候选的原真实延迟CLI：分号/括号各新版本、焦点、选区和当前结果四态 | 八次实际CLI均退出0；新版本/焦点/选区三类旧结果拒绝，当前结果正常应用；用户编辑、选区与焦点保护保持 | [既有控制](../../test/extension/suite/formatterAutoFixAcceptance.ts)及[完整套件实测](reports/formatter-dual-runtime-project-config-2026-10-11.md)；首个PHP8.5运行时/Linux范围，两个版本的全部自动修复矩阵仍开放。 |
| F11-FORMAT-12 | 同一隔离候选的后台文件变更与第二项目禁用自动修复 | 背景输入或禁用目录不调用实际CLI、不格式化别的文档、不移动其他光标；原两项目设置分别生效 | [既有控制](../../test/extension/suite/formatterAutoFixAcceptance.ts)及[完整套件实测](reports/formatter-dual-runtime-project-config-2026-10-11.md)；不推断所有Provider注册唯一性或默认安装支持域。 |
| F12-DEBUG-01 | php类型launch会话，真实项目PHP执行路径及debug-profile.php | 启动事件出现、会话在原期限内结束，清除active session | [源码](../../test/extension/suite/index.ts)；本场景只验入口/会话生命周期；实际断点/变量/step另见F12-DEBUG-02，Remote及全矩阵仍开放。 |
| F12-DEBUG-02 | 原完整12扩展源码Profile中启用既有真实debugBreakpoints；PHP8.5.9/Xdebug3.5.3/PHP Debug1.40.1，带空格程序路径与独立端口 | 第3行breakpoint/调用栈路径正确，scope变量和watch为40；next后第4行step、watch为42；continue实际结果42/cwd正确、会话和自有断点清理 | [既有完整场景](../../test/extension/suite/debugBreakpoints.ts)及[完整组合实测](reports/profile-real-xdebug-breakpoints-2026-10-11.md)；显式PROFILE_REAL_DEBUG=1、SOPHP_DEBUG_PHP/PORT；仅Linux自动宿主范围，真人/全版本/平台/Remote继续。 |
| F12-PHPUNIT-01 | PHP CLI执行真实ProfileTest及未认证PHPUnit扩展命令 | 真实测试写入passed；默认Pack无phpunit.run-all命令 | [源码](../../test/extension/suite/index.ts#L933)；CLI入口与真实结果，不替代编辑器Test Explorer或所有运行时矩阵。 |
| F12-PHPUNIT-02 | 原完整12扩展源码Profile中的真实ProcessExecution Tasks；PHP8.5.9/PHPUnit11.5.56、带空格测试路径、环境值42/41/42 | 通过/真实断言失败/恢复退出码0/1/0；实际进程见证cwd/PHP_BINARY/version/SAPI，task与process事件结束，无遗留任务/子进程 | [持久场景](../../test/extension/suite/phpunitTasks.ts)及[PHPUnit编辑器任务验收](reports/profile-phpunit-editor-tasks-2026-10-11.md)；Linux自动编辑器Tasks范围，不替代Test Explorer/Core runner或全版本平台/Remote。 |
| F12-RUNTIME-01 | 注入进程依赖的php72/81/82/84/85版本输出 | 返回对应minor及完整版本 | [源码](../../test/unit/executables.test.ts#L6)；五个已有参数化单元；实际CLI仅由其它原运行时证据证明。 |
| F12-RUNTIME-02 | 不存在命令、坏输出、相同可执行文件、Composer目标、PATH优先与缺失PATH | 无效结果忽略，路径去重；Composer已确定目标不启动PHP；优先PATH并支持版本命令回退 | [源码](../../test/unit/executables.test.ts#L23)；注入进程依赖的单元，不声称真实环境所有发现路径。 |
| F12-PAYLOAD-01 | 带扩展事实的PhpRuntime及command/path/minor客户端字段 | 扩展事实传到LS；客户端专有字段不进入payload | [源码](../../test/unit/php-runtime-payload.test.ts#L6)；序列化边界单元，不代替全部扩展启用矩阵。 |

2026-10-11 [持久缓存进程验收脚本修正](reports/persistent-process-rss-measurement-2026-10-11.md)：schema2不可变blob损坏注入及清理后整worker RSS修正；1k五轮/20进程通过，最大151.11/384 MiB。完整三规模五轮矩阵尚未终态，与两小时LS会话同期；只计包API范围，原失败及完整F13/P9/R4继续，正常资产/Profile保持，166编号/14家族、未完成大项26。

2026-10-11 [原四阶段同进程缓存控制](reports/persistent-process-rss-measurement-2026-10-11.md)：当前1k控制退出0，整体峰值153.51/384 MiB、热缓存5.48/64 MiB，原断言/清理保持；三规模各五轮完整复测排队，待独立worker矩阵终态后串行执行。原历史失败/完整规模/长期及其余范围继续，166编号/14家族、未完成大项26，Profile未更新。

2026-10-11 [当前真实项目首次引用基准未通过](reports/current-real-reference-baseline-mismatch-2026-10-11.md)：原174位置断言得到188/不同摘要，退出1；同时五个项目输入与git状态变化，不能证明产品或基线原因，原基线/失败保持。230工具输入/实际进程与自有缓存终态核对，正常资产/Profile保持；规模/长程继续，166编号/14家族、未完成大项26。


## foreach 值变量断言的补充编号

| 编号 | 输入 | 预期 | 自动验证与范围 |
| --- | --- | --- | --- |
| F05-FLOW-04 | 按值 foreach 元素、真假条件断言、终止 guard、泛型跨 namespace；重赋值、未知调用、引用、循环退出与嵌套重绑定反例 | 循环内有效断言收窄成员和实参类型；旧事实在不安全边界撤回，不将循环前参数断言套用到新元素 | [语义测试](../../packages/semantic/test/foreach-phpdoc-assertions.test.ts) 30 项；[正常协议测试](../../packages/language-server/test/foreach-phpdoc-assertions-stdio.test.ts) PHP7.2/8.5 × 两模式共4项、44次版本更新，覆盖补全、精确Definition及版本关联诊断。正常构建4eb4a28b完整语义23896通过，完整协议1533/1534（既有取消门禁一项失败），新增四协议全过；后续eeeb904e正常Linux完整C2含八次未保存/UndoRedo查询通过，见[编辑器流程](../../test/extension/suite/foreachAssertions.ts)。本轮新增否定断言52语义（原实现28失败）、完整Semantic23948、八正常协议与原完整Linux C2十四次foreach查询通过，见[否定断言验证](reports/foreach-negative-assertions-2026-10-12.md)。当前完整LSP、其余编辑器/组合/性能/平台/长期/真人及完整F05保持开放。 进一步覆盖循环/switch break/continue实际目标、非法层级撤回及v80拒绝/新暖缓存关闭目标References，见[循环退出验证](reports/loop-exit-assertions-2026-10-12.md)。 |

| F05-FLOW-05 | 参数接收者上PHPDoc `$this` 真假断言与return/break/continue退出guard；重赋值、未知调用、引用、nullsafe和循环退出反例 | 有效guard后的实参消费同一断言；不安全路径保留原诊断 | [24项语义正反例](../../packages/semantic/test/receiver-guard-argument-assertions.test.ts)、[四组正常协议/48版本](../../packages/language-server/test/receiver-guard-argument-assertions-stdio.test.ts)；[当前修复报告](reports/receiver-guard-argument-assertions-2026-10-12.md)。仅这组自动化范围，不代替完整F05/版本/编辑器验收。 |

| F05-FLOW-06 | return/throw/循环退出及try/catch/finally之后的不可达尾部；非全退出、继续catch、内层跳转与语法错误反例 | 有效guard保留成员、精确导航及实参断言；无证明的路径不缩窄，旧v81缓存拒绝 | [Parser16项](../../packages/parser/test/unreachable-guard-continuations.test.ts)、[Semantic28项](../../packages/semantic/test/unreachable-guard-continuations.test.ts)、[四协议64版本](../../packages/language-server/test/unreachable-guard-continuations-stdio.test.ts)、[暖缓存References](../../packages/language-server/test/unreachable-guard-cache-stdio.test.ts)；[当前修复报告](reports/unreachable-guard-continuations-2026-10-12.md)。仅这组自动化范围，完整F05/版本/编辑器/性能继续。 |

| F05-FLOW-07 | return/throw后不可达调用与引用实参；条件返回、活跃finally、继续调用和goto反例 | 不可达效应不撤回已证明断言，活跃及不安全路径仍撤回；恢复缓存保留当前语义 | [16项语义](../../packages/semantic/test/unreachable-call-effects.test.ts)、[四协议40版本](../../packages/language-server/test/unreachable-call-effects-stdio.test.ts)、[当前暖缓存References](../../packages/language-server/test/unreachable-call-cache-stdio.test.ts)；[当前修复报告](reports/unreachable-call-effects-2026-10-12.md)。完整F05/版本/编辑器及性能范围继续。 |
