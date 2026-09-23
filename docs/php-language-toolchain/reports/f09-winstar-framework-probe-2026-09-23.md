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
