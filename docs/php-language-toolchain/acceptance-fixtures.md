# 编号验收 fixtures

本表把 [最终验收 F01–F14](acceptance.md)中的场景绑定到可运行输入。编号固定；新增支持范围时，在同一组中补正例、合法反例及未完成输入。当前建立了 F04 References、F08 Extract Interface、private 参数删除，以及 F09 Symfony 服务、路由 YAML 和 Doctrine Entity 的首组，不能据此判定这些最终验收项或 P0 全部完成。

| 编号 | 输入 | 预期 | 自动验证 |
| --- | --- | --- | --- |
| F04-REF-01 | [有类型接收者与全局函数调用](../../packages/semantic/test/fixtures/acceptance/f04-references-valid.php) | 方法和函数分别返回唯一真实调用；`includeDeclaration` 决定是否包含声明 | `acceptance-f04-references.test.ts` |
| F04-REF-02 | [字符串、nowdoc 与块注释](../../packages/semantic/test/fixtures/acceptance/f04-references-counterexample.php) | PHP 源码有效，调用样式文本不产生代码引用 | 同上 |
| F04-REF-03 | [调用后的未完成成员输入](../../packages/semantic/test/fixtures/acceptance/f04-references-incomplete.php) | 保留前面完整调用的引用，不捏造未完成位置 | 同上 |
| F04-REF-04 | [文件顶层变量改赋与闭包隔离](../../packages/semantic/test/fixtures/acceptance/f04-references-global.php) | 第一次 `Printer::render` 调用属于 `Printer`，改赋及闭包内的 `Other::render` 不混入；缓存恢复保持结果 | 同上及 `stdio.test.ts` |
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
