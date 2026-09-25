# @php-companion/provider-symfony-routes

SoPHP Symfony 的静态路由进程。它只读取受限的 Composer、Bundle 注册和路由配置，不启动项目 PHP；快照通过 `@php-companion/route-provider` 协议返回。资源预算耗尽、配置无法读取或声明分析不完整时明确标记 `complete: false`。

该组件由 `sohophp.php-companion-symfony` 打包和注册。普通 Symfony 项目由完整静态快照拥有路由名称；启用 Winstar 运行时路由时，它只为运行时已确认的同名、同路径路由补充精确源码位置。

约定入口包含 `config/routes.yaml`、`config/routes.yml` 和 `config/routes.php`。PHP `RoutingConfigurator` 的确定性 Controller 数组、类常量和完整类名字符串可提供类/方法来源；导入别名保留源码范围，动态 Controller 不推断。打开文档的未保存内容优先于磁盘，路由与来源随文件变化失效。
