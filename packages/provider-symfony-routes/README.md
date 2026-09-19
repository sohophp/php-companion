# @php-companion/provider-symfony-routes

PHP Companion Symfony 的静态路由进程。它只读取受限的 Composer、Bundle 注册和路由配置，不启动项目 PHP；完整快照通过 `@php-companion/route-provider` 协议返回。

该组件由 `sohophp.php-companion-symfony` 打包和注册。成功快照接管核心的兼容静态扫描；进程失败时核心保留回退。
