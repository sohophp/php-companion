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
