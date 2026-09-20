# Changelog

## Unreleased

- 发布 `debug:router` 返回的完整运行时名称和路径；仅在模块 YAML 来源唯一时附加声明范围，无法定位的实际路由不再从补全目录消失。

- 为模块 YAML 中直接写出的 `controller` 或 `defaults._controller` 发布精确类/方法范围；生成路由不会虚构控制器来源。

## 0.1.0-alpha.1

- 以 Symfony 实际路由表过滤 Winstar 模块路由，并映射直接声明与 `admin_defaults` 生成来源。
