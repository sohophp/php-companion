# 编号验收 fixtures

本表把 [最终验收 F01–F14](acceptance.md)中的场景绑定到可运行输入。编号固定；新增支持范围时，在同一组中补正例、合法反例及未完成输入。当前建立了 F04 References、F08 Extract Interface、private 参数删除，以及 F09 Symfony 服务、路由 YAML 和 Doctrine Entity 的首组，不能据此判定这些最终验收项或 P0 全部完成。

| 编号 | 输入 | 预期 | 自动验证 |
| --- | --- | --- | --- |
| F02-VERSION-01 | [同一独立 Composer 文件的 PHP 7.2、8.1、8.5 版本设置](../../packages/language-server/test/stdio.test.ts) | 7.2 对 `match`、`enum`、`(void)` 转换报版本诊断；8.1 只报 `(void)`；8.5 均不报；三者均无 parser 语法错误，隔离 Core 宿主可见相同结果 | `stdio.test.ts` 的 F02-VERSION-01；`test/extension/suite/c1.ts` 的三版本宿主流程 |
| F04-REF-01 | [有类型接收者与全局函数调用](../../packages/semantic/test/fixtures/acceptance/f04-references-valid.php) | 方法和函数分别返回唯一真实调用；`includeDeclaration` 决定是否包含声明 | `acceptance-f04-references.test.ts` |
| F04-REF-02 | [字符串、nowdoc 与块注释](../../packages/semantic/test/fixtures/acceptance/f04-references-counterexample.php) | PHP 源码有效，调用样式文本不产生代码引用 | 同上 |
| F04-REF-03 | [调用后的未完成成员输入](../../packages/semantic/test/fixtures/acceptance/f04-references-incomplete.php) | 保留前面完整调用的引用，不捏造未完成位置 | 同上 |
| F04-REF-04 | [文件顶层变量改赋、闭包与条件赋值](../../packages/semantic/test/fixtures/acceptance/f04-references-global.php) | 第一次 `Printer::render` 调用属于 `Printer`，改赋及闭包内的 `Other::render` 不混入；仅在条件分支赋值的接收者不被猜成 `Printer`；缓存恢复保持结果 | 同上及 `stdio.test.ts` |
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
| F04-NAV-13 | [关闭并同版本重新打开文档](../../packages/language-server/test/stdio.test.ts) | Completion 请求捕获旧文档后暂停；关闭并以相同版本号打开不同内容，旧请求返回空结果，新请求返回新接收者成员 | `stdio.test.ts` 的 F04-NAV-13 |
| F04-HOST-01 | [隔离 VS Code Core 编码链](../../test/extension/suite/c1.ts) | VS Code 中实际请求补全、Hover、参数提示、定义、实现、引用；未保存切换接收者后六项都按新类型返回，无旧接口引用或实现；内建 PHP 基础提示默认关闭，`abs` 仅返回一个候选 | `pnpm test:extension:c1`；[未保存全链报告](reports/c1-unsaved-full-chain-2026-09-24.md)；[Provider 与等待报告](reports/c1-provider-ownership-latency-2026-09-24.md) |
| F08-EI-01 | [公开抽象与具体方法](../../packages/semantic/test/fixtures/acceptance/f08-extract-interface-valid.php) | 生成同 namespace 接口，保留 import 与两种公开签名；不包含 protected 方法；原类可加 `implements` | `acceptance-f08-extract-interface.test.ts` |
| F08-EI-02 | [合法的接口名别名冲突](../../packages/semantic/test/fixtures/acceptance/f08-extract-interface-alias-conflict.php) | PHP 源码有效，但新接口名被 import alias 占用，拒绝编辑 | 同上 |
| F08-EI-03 | [未完成的方法声明](../../packages/semantic/test/fixtures/acceptance/f08-extract-interface-incomplete.php) | 语法树含错误，拒绝编辑 | 同上 |
| F08-RP-01 | [有效的直接调用](../../packages/semantic/test/fixtures/acceptance/f08-remove-parameter-valid.php) | 删除 private 形参、PHPDoc 与位置/命名标量实参；生成源码语法有效 | `acceptance-f08-remove-parameter.test.ts` |
| F08-RP-02 | [合法的间接 callable](../../packages/semantic/test/fixtures/acceptance/f08-remove-parameter-indirect.php) | PHP 源码有效，但无法同步编辑间接调用实参，拒绝操作 | 同上 |
| F08-RP-03 | [未完成的方法调用](../../packages/semantic/test/fixtures/acceptance/f08-remove-parameter-incomplete.php) | 同文件含语法错误，拒绝操作 | 同上 |
| F09-SVC-01 | [有效服务声明与引用](../../packages/framework-symfony/test/fixtures/acceptance/f09-service-valid.yaml) | `@app.mailer` 的精确 ID 范围对应唯一 `app.mailer` 声明 | `acceptance-f09-services.test.ts` |
| F09-SVC-02 | [合法的转义与表达式字面量](../../packages/framework-symfony/test/fixtures/acceptance/f09-service-literal-counterexample.yaml) | YAML 仍有效，但 `@@app.mailer` 和 `@=service(...)` 不发布精确服务 ID 引用 | 同上 |
| F09-SVC-03 | [未完成的服务 YAML](../../packages/framework-symfony/test/fixtures/acceptance/f09-service-incomplete.yaml) | 配置图标记不完整，不发布服务事实或引用 | 同上 |
| F09-ROUTE-01 | [有效路由和 Controller](../../packages/framework-symfony/test/fixtures/acceptance/f09-route-valid.yaml) | 字面量名称、路径和 Controller 类/方法范围精确 | `acceptance-f09-routes.test.ts` |
| F09-ROUTE-02 | [合法的 Attribute 目录导入](../../packages/framework-symfony/test/fixtures/acceptance/f09-route-counterexample.yaml) | 保留导入事实，不捏造目录内的路由 | 同上 |
| F09-ROUTE-03 | [动态路径](../../packages/framework-symfony/test/fixtures/acceptance/f09-route-incomplete.yaml) | 路由图不完整，不发布该路由的推测事实 | 同上 |
| F09-DOC-01 | [Entity、关联与 Repository](../../packages/framework-doctrine/test/fixtures/acceptance/f09-doctrine-valid.php) | 精确识别 Entity、Nullable ManyToOne 及 Repository 查询返回类型 | `acceptance-f09-doctrine.test.ts` |
| F09-DOC-02 | [合法的非 Doctrine Entity Attribute](../../packages/framework-doctrine/test/fixtures/acceptance/f09-doctrine-counterexample.php) | 不发布 Doctrine Entity 或 Repository 事实 | 同上 |
| F09-DOC-03 | [同文件中的完整与未闭合 Entity](../../packages/framework-doctrine/test/fixtures/acceptance/f09-doctrine-incomplete.php) | 保留完整 `Team`，抑制未闭合 `User` | 同上 |

执行 F04：`pnpm --dir packages/semantic exec vitest run test/acceptance-f04-references.test.ts`。这组验证有类型函数参数、文件顶层赋值的成员调用及全局函数引用；顶层场景另有真实 Language Server stdio Definition/References 回归，见[顶层导航报告](reports/f04-global-references-2026-09-23.md)。

执行 F08：`pnpm --dir packages/semantic exec vitest run test/acceptance-f08-extract-interface.test.ts test/acceptance-f08-remove-parameter.test.ts`。这些测试验证语义计划、编辑后源码语法与拒绝边界；Extract Interface 的真实 VS Code 应用、Undo/Redo 和 PHP 7.2/8.5 加载证据见 [P7 Extract Interface 报告](reports/p7-extract-interface-2026-09-23.md)，private 参数删除的间接调用与 stdio 证据见[专项报告](reports/p7-private-parameter-callables-2026-09-23.md)。

执行 F09：`pnpm --dir packages/framework-symfony exec vitest run test/acceptance-f09-services.test.ts test/acceptance-f09-routes.test.ts`。这两组测试验证静态 YAML 事实提取与精确范围；[F09 Provider 链路报告](reports/f09-provider-completeness-2026-09-23.md)还记录了 F09-SVC-01/03 和 F09-ROUTE-01/03 经真实 Provider 与 Language Server 的正例和不完整快照验证。扩展宿主、框架版本和真实项目动态边界仍需单独编号与验证。其余 F01–F14 场景映射也仍待补齐。

Winstar 当前 Symfony 7.4.17 的运行时路由另由 `pnpm check:f09:winstar-routes` 验证首次路径参数补全、显式路由及默认生成路由的精确 Definition；它读取真实项目和运行时 Router，属于环境限定的集成探针，范围见[Winstar 报告](reports/f09-winstar-framework-probe-2026-09-23.md)。

执行 F09 Doctrine：`pnpm --dir packages/framework-doctrine exec vitest run test/acceptance-f09-doctrine.test.ts`。该组验证静态事实和未完成类抑制；[Doctrine 未完成输入报告](reports/f09-doctrine-incomplete-2026-09-23.md)记录既有真实 Language Server 集成回归的范围。完整编辑器工作流仍待验收。

实际安装版本的按需查询补充检查使用 `pnpm check:f09:doctrine`：它在 CoreRepo 的 Doctrine 2.20.13 与 Winstar 的 3.6.8 源码上分别验证首个成员补全请求和动态类反例，具体范围见[双版本报告](reports/f09-doctrine-version-matrix-2026-09-23.md)。这项真实项目探针不属于可移植 fixture，也不代替 WSL Remote 编辑器验收。
