# F09 Winstar 框架版本与静态事实探针

日期：2026-09-23。只读检查 `/var/www/php/8.5/winstar2024` 当前 `composer.lock`：`symfony/framework-bundle`、`symfony/routing`、`symfony/dependency-injection` 均为 7.4.17，`doctrine/orm` 为 3.6.8。此记录只覆盖这一组实际安装版本，不代表其它框架版本矩阵。

在当前 `dev` 环境，对构建后的独立 Provider 直接运行只读收集，路由预算为 2048 项，服务导入预算为 2048 项，服务项目类型目录传入空数组：

| 静态快照 | `complete` | `inputEvidenceComplete` | 结果 | 输入 |
| --- | --- | --- | --- | --- |
| Symfony 服务 | `true` | `true` | 4,665 条服务、15 条参数声明 | 90 个已尝试文件 |
| Symfony 路由 | `false` | `true` | 17 条无冲突静态路由 | 33 个已尝试文件 |

直接分析 `config/symfony/routes.yaml` 得到 `health_live`、`health_ready`、`application_fallback` 三条字面量路由，但该文件还声明由 `App\Bridge\ModuleRouteLoader` 服务生成的 `module_routes`，所以自身 `complete=false`。同文件两次导入的 `config/symfony/sofinder_routes.php` 返回 `SymfonyRouteCollectionFactory::create()` 的结果；静态 PHP Configurator 分析无法证明该工厂的路由集合，返回 `complete=false`。Provider 因此正确拒绝把 17 条静态路由当成完整运行时路由表。

Doctrine 静态分析直接读取 `SolutionArticle.php`、`SolutionCategory.php`、`SolutionPage.php`。三者均识别为 Entity；`SolutionArticle` 的 `translations` 指向 `SolutionArticleTranslation`、`category` 指向 `SolutionCategory` 且均为非空，后两者的 `translations` 分别指向对应 Translation Entity。`SolutionArticle::category` 源码含 `#[ORM\JoinColumn(nullable: false)]` 与非空属性类型。本探针未验证 Repository 查询、Doctrine 运行时映射或真实编辑器操作。

边界：服务收集的项目类型目录为空，服务资源展开和自动装配关系不能据此作最终验收；静态路由只代表已证明的子集。Winstar 的模块路由需与独立运行时 Provider 组合验证，SoFinder 工厂路由也需以运行时事实确认。当前没有执行 Symfony Kernel、数据库访问或 VSIX 打包。

## 运行时路由与源码位置复核

随后通过显式 Winstar Provider 调用项目 `bin/php-runtime bin/console debug:router --format=json --env=dev`；这一步会启动 Symfony Console，与上面的纯静态探针分开记录。当前 Router 返回 690 条路由。发现 `src/Modules/README.md` 会使源码扫描在排序遍历中提前 `break`，导致 `README.md` 之后的模块失去 YAML 来源。改为跳过普通文件后，690 条运行时路由全部保留，其中 477 条有唯一 YAML 来源、213 条只保留运行时名称和路径。在**同一次运行时结果集**中，`README.md` 之后的模块贡献 129 条有源码位置的路由；例如 `admin.SolutionArticles.add` 指向 `src/Modules/Solutions/Routes/admin_defaults.yaml` 中 `SolutionArticles` 的精确范围。历史报告的 704 条路由来自较早项目状态，不能直接用作本次数量差值。

Winstar Provider 4 项测试、类型检查及相关 ESLint 通过。此复核没有打包 VSIX，也没有执行编辑器中的 Definition/References/Rename 操作。

随后补充真实 Language Server stdio 链路测试：临时项目的模块根含 `README.md`，后续 `Zulu/Routes/routes.yaml` 声明 `zulu.route`；独立 Winstar Provider 进程读取模拟的 `debug:router` JSON 后，PHP `RouterInterface::generate('zulu.route')` 的 Definition 返回 YAML 名称的精确范围。该定向测试、Language Server 类型检查和 ESLint 通过。它验证 Provider 到导航的集成，但模拟了 Router 输出，尚不等同 Winstar 编辑器会话中的人工导航验收。

最后在真实 Winstar 根启动当前源码构建的 Language Server stdio，使用 `onDemand`、独立静态路由 Provider 和显式 Winstar 运行时 Provider，环境为 `dev`。未向项目写文件；仅 `didOpen` 一个内存中的 PHP 文档，调用 `RouterInterface::generate('admin.SolutionArticles.add')` 的 Definition。服务返回 `src/Modules/Solutions/Routes/admin_defaults.yaml` 第 19 行字符 10–26，读取目标文件核对切片正好为 `SolutionArticles`。探针正常退出（0）。这是当前项目运行时和 LSP 请求的直接证据；Windows 客户端连接 WSL Remote 的 VS Code 操作仍待人工验收，没有生成 VSIX。

对该生成路由补充 Rename 安全检查：`admin_defaults.yaml` 的源码名称为 `SolutionArticles`，并非完整运行时名称 `admin.SolutionArticles.add`。真实 Winstar 的只读 LSP 请求中，`prepareRename` 与将其改为 `admin.SolutionArticles.changed` 的 `rename` 均返回 `null`，探针退出码 0；不会把运行时后缀误写入共享的 YAML 名称。临时项目的独立 Winstar Provider → Language Server stdio 回归也覆盖同类生成路由拒绝，定向测试、类型检查和 ESLint 通过。没有应用编辑或生成 VSIX。

## Doctrine ORM 3.6.8 查询链

真实 Winstar 的 `onDemand` Language Server 探针使用未写入磁盘的 PHP 文档与项目 vendor/Entity 源码。`EntityManagerInterface::getRepository(SolutionPageTranslation::class)->findOneBy([])` 返回 `SolutionPageTranslation|null`，后续 `?->getIntroTi` 补全 `getIntroTitle`。首次探针因临时 JavaScript 字符串吞掉 PHP 命名空间反斜线而返回空；修正输入后该 Repository 路径即通过。

同一有效输入发现 QueryBuilder 默认对象水合链原先失去实体泛型：`getRepository(SolutionPageCard::class)->createQueryBuilder('card')->getQuery()->getResult()` 的 foreach 元素无法补全。按需加载现在从已加载的真实 `Doctrine\ORM\EntityRepository` 声明建立通用查询事实，并补载 `QueryBuilder`、`Query` 以及实际声明的 `AbstractQuery` 父类；生成事实时只传来源位置，避免类型对象的 `name` 覆盖方法名。复测中 `getResult()` Hover 为 `array<int, SolutionPageCard>`，foreach 元素补全 `SolutionPageCard::getLinkUrl()`，退出码 0。合成按需加载回归及既有完整索引回归共 2 项、Language Server 类型检查和相关 ESLint 均通过。此项不宣称其它 Doctrine 映射或水合模式全部完成，也没有生成 VSIX。

后续把 foreach 查询结果补全改为打开文件后的**首个**请求，发现此前的成功依赖先请求 Repository 成员造成的预热。冷路径现会在识别到 `createQueryBuilder()` 与 `getQuery()` 查询链时按 Composer PSR-4 精确加载 Doctrine 的 `EntityManagerInterface` 和 `EntityRepository`，再建立查询事实；请求取消或文档版本变化时丢弃结果。合成 `onDemand` 首请求回归通过。另在真实 Winstar 根启动当前源码构建的 Language Server，以未落盘 PHP 文档直接请求 `$queried->getLi` 补全，首次请求返回 `SolutionPageCard::getLinkUrl(): ?string`，探针退出码 0。该验证仍是 stdio 探针，不代替 VS Code WSL Remote 人工编辑验收，也未生成 VSIX。

## 模块路由来源与冷导航复核

同一 `dev` Router 的 690 条运行时路由中，569 条带 `_module_route_file=symfony-module-routes` 和匹配自身名称的 `_module_route_name`。来源映射现在要求这两个运行时标记；`admin_defaults` 只匹配项目 `ModuleRouteDefinitionProvider::routesForActions()` 中实际列出的 16 个动作，不再把 `admin.CompanyPage.workflowStatus` 等显式 YAML 名称误当成默认生成名称。带唯一 YAML 来源的路由由此前的 477 条增至 568 条；其余 121 条无模块来源标记，`home` 则在模块 YAML 中重复声明，保留运行时名称/路径而不提供猜测的 Definition。268 条附带 Controller 来源的路由与 Router 的 `_controller` 全部一致。

合成 Language Server stdio 回归把 `RouterInterface` 放在 Composer vendor 中，不经预热即从 PHP 路由字面量导航到显式 `admin.ZuluPage.workflowStatus` 的精确 YAML 范围；同时覆盖模块根中的普通文件、默认生成路由 Rename 拒绝。真实 Winstar 的 `onDemand` stdio 首次 Definition 请求从 `RouterInterface::generate('admin.CompanyPage.workflowStatus')` 返回 `src/Modules/Company/Routes/admin.yaml` 第 11 行字符 8–40，目标切片完整等于路由名。首次临时探针误将路由标为 `external=true`，核心按所有权规则返回空；改为正确的核心 Provider 所属配置后通过。合成回归还验证未预载 RouterInterface 时按需加载其精确 Composer 声明。此记录不代替 VS Code WSL Remote 人工导航验收，也没有打包 VSIX。
