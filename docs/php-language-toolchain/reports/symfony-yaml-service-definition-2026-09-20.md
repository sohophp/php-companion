# Symfony YAML 服务引用导航

日期：2026-09-20

## 行为

PHP Companion 已有的窄 YAML Definition Provider 除路由 Controller 外，现在还能把 Symfony 服务配置值中的精确 `@service.id` 和 `@?service.id` 导航到唯一服务注册位置。服务目录仍由独立 `PHP Companion: Symfony` 容器 Provider 提供；核心不重新扫描服务配置。

导航只在容器 Provider 返回的 `containerConfigurationUris` 内启用。相同 ID 同时存在静态配置和新鲜 debug-container 事实时选择静态注册；多个不同静态注册保持无结果。声明键、`@@` 转义值、`@=` 表达式、含参数或空白的动态值、损坏 YAML 及普通业务 YAML 不会产生 Companion Definition。

当前文件和已同步的目标 YAML 使用未保存快照换算位置。Red Hat YAML 继续唯一拥有通用 YAML 语法、Schema、补全和格式化。

## 验证

- `@php-companion/framework-symfony`：3 个测试文件、43 项通过。
- `@php-companion/language-server`：5 个测试文件、198 项通过。
- 全仓门禁：24 个组件 754 项、独立 Symfony 扩展 3 项、根扩展 44 项，共 801 项通过；TypeScript 与 ESLint 通过。
- stdio 回归通过真实独立容器 Provider 契约返回 `app.service`，从同一 YAML 的 `@app.service` 精确跳到注册键；在声明键上请求返回空结果。
- 真实 Winstar `config/symfony/services.yaml` 中第一个 `@app.current_language_entity` 被解析为范围 `18603..18630`，并唯一对应 `App\\Modules\\LocalLanguages\\ORM\\Entity\\Language` 的显式注册键，注册范围起点 `44070`。

功能提交为 `d5db8aab0d74b6df921be6cf9843fc9008859c61`。私有候选位于 `artifacts/php-companion-alpha-0.4.5-d5db8aab/`；四份 VSIX 内容验证、`SHA256SUMS`、Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL preflight 均通过。Core、Symfony、Open Source Pack、Recommended Pack 的 SHA-256 分别为 `6b54078a1c5e3d0c31778b6d87b7c3e221b0810cbfcaf685feb36f944a3cf25e`、`e5107d5ee19da1c70246ab87676fa2d93da233024321fb28c80f9a2b06a9fc0a`、`6ee5af92e1a80604417bc3e944ce9aeb4f61c7c50c6ecffa42b01ed0a58480e1`、`789deea991c8f41d52841f522d9b7ca1f1220d4903fffca62632517df38683e4`。

## 边界

本增量只提供 Definition。服务 ID 补全、Find References、Rename、XML/PHP Configurator 中的服务引用导航及 YAML `alias`/`decorates`/`parent` 等未带 `@` 的关系仍分别验收后接入，避免用字符串搜索制造错误结果。
