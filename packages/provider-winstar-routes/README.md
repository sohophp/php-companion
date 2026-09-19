# @php-companion/provider-winstar-routes

PHP Companion 的可选 Winstar 模块路由 Provider。它通过项目 PHP 包装器执行 Symfony `debug:router --format=json`，以实际运行时集合决定启用路由，再把 `src/Modules/*/Routes/*.yaml` 中的直接名称和 `admin_defaults` 生成来源映射为可导航范围。

该进程会启动项目 Symfony Console，必须由用户通过 `phpCompanion.routeProviders` 显式启用。通用语言服务器不会自动发现或执行它。

PHP Companion VSIX 已内置该适配器。在确认工作区可信后设置：

```json
{
  "phpCompanion.symfony.winstarRoutes.enabled": true
}
```

适配器默认使用项目根的 `bin/php-runtime bin/console`；独立安装本包时也可通过 CLI 的 `--php`、`--console` 和 `--runtime-timeout-ms` 参数覆盖。
