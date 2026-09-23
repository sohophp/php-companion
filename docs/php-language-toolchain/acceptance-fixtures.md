# 编号验收 fixtures

本表把 [最终验收 F01–F14](acceptance.md)中的场景绑定到可运行输入。编号固定；新增支持范围时，在同一组中补正例、合法反例及未完成输入。当前建立了 F08 Extract Interface、F09 Symfony 服务与路由 YAML 的首组，不能据此判定 F08、F09 或 P0 全部完成。

| 编号 | 输入 | 预期 | 自动验证 |
| --- | --- | --- | --- |
| F08-EI-01 | [公开抽象与具体方法](../../packages/semantic/test/fixtures/acceptance/f08-extract-interface-valid.php) | 生成同 namespace 接口，保留 import 与两种公开签名；不包含 protected 方法；原类可加 `implements` | `acceptance-f08-extract-interface.test.ts` |
| F08-EI-02 | [合法的接口名别名冲突](../../packages/semantic/test/fixtures/acceptance/f08-extract-interface-alias-conflict.php) | PHP 源码有效，但新接口名被 import alias 占用，拒绝编辑 | 同上 |
| F08-EI-03 | [未完成的方法声明](../../packages/semantic/test/fixtures/acceptance/f08-extract-interface-incomplete.php) | 语法树含错误，拒绝编辑 | 同上 |
| F09-SVC-01 | [有效服务声明与引用](../../packages/framework-symfony/test/fixtures/acceptance/f09-service-valid.yaml) | `@app.mailer` 的精确 ID 范围对应唯一 `app.mailer` 声明 | `acceptance-f09-services.test.ts` |
| F09-SVC-02 | [合法的转义与表达式字面量](../../packages/framework-symfony/test/fixtures/acceptance/f09-service-literal-counterexample.yaml) | YAML 仍有效，但 `@@app.mailer` 和 `@=service(...)` 不发布精确服务 ID 引用 | 同上 |
| F09-SVC-03 | [未完成的服务 YAML](../../packages/framework-symfony/test/fixtures/acceptance/f09-service-incomplete.yaml) | 配置图标记不完整，不发布服务事实或引用 | 同上 |
| F09-ROUTE-01 | [有效路由和 Controller](../../packages/framework-symfony/test/fixtures/acceptance/f09-route-valid.yaml) | 字面量名称、路径和 Controller 类/方法范围精确 | `acceptance-f09-routes.test.ts` |
| F09-ROUTE-02 | [合法的 Attribute 目录导入](../../packages/framework-symfony/test/fixtures/acceptance/f09-route-counterexample.yaml) | 保留导入事实，不捏造目录内的路由 | 同上 |
| F09-ROUTE-03 | [动态路径](../../packages/framework-symfony/test/fixtures/acceptance/f09-route-incomplete.yaml) | 路由图不完整，不发布该路由的推测事实 | 同上 |

执行 F08：`pnpm --dir packages/semantic exec vitest run test/acceptance-f08-extract-interface.test.ts`。该测试验证语义计划与生成文件语法；真实 VS Code 应用、Undo/Redo 和 PHP 7.2/8.5 加载证据见 [P7 Extract Interface 报告](reports/p7-extract-interface-2026-09-23.md)。

执行 F09：`pnpm --dir packages/framework-symfony exec vitest run test/acceptance-f09-services.test.ts test/acceptance-f09-routes.test.ts`。这两组测试只验证静态 YAML 事实提取与精确范围；Provider、Language Server、扩展宿主、框架版本和真实项目动态边界仍需单独编号与验证。其余 F01–F14 场景映射也仍待补齐。
