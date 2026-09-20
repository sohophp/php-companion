# Symfony YAML 服务 ID 补全

日期：2026-09-21

## 行为

在独立 Symfony 容器 Provider 确认属于服务配置图的 YAML 文件中，精确 `@service` 与 `@?service` 标量现在按光标前的 ID 前缀补全唯一权威服务。补全项显示服务 class、静态/编译来源和 public/private 状态；一次最多返回 200 项，超出时使用 VS Code incomplete completion 继续按前缀收窄。

编辑范围只覆盖 `@` 或 `@?` 后面的 ID 段，保留 marker、单双引号和外围 YAML。Provider 仅以 `@`/`?` 触发或响应手动补全，不接管 Red Hat YAML 的通用键、Schema、语法补全和格式化。

服务目录来自独立 `PHP Companion: Symfony` Provider。普通业务 YAML、服务声明键、`@@` 转义、`@=` 表达式、参数化或含空白值、损坏 YAML、容器 Provider 缺失及多个权威注册位置均不提供 Companion 补全。

## 验证

- framework-symfony 3 个测试文件、43 项通过；前缀范围覆盖合法 `@service`，并拒绝声明键、转义值、表达式和损坏 YAML。
- Language Server 5 个测试文件、198 项通过；真实独立 Provider 返回 `app.service`，补全范围只覆盖 `app.service`，在声明键位置返回空列表。
- VS Code 1.138.0 开发与隔离打包双扩展宿主通过；标准 `vscode.executeCompletionItemProvider` 在 `@App\\Service\\Mailer` 返回权威服务项，替换范围只包含 ID，Extension Host 状态码为 0。
- 全仓 24 个组件共 754 项、独立 Symfony 扩展 3 项、根扩展 44 项，共 801 项通过；TypeScript、ESLint 与 24 个隔离消费 tarball 通过。
- 真实 Winstar `config/symfony/services.yaml` 的 `@app.current_language_entity` 在光标位于 `@`、`@app.` 与 `@app.current_` 后时，分别得到空、`app.`、`app.current_` 前缀，并始终保留同一 ID 替换范围 `18603..18630`。

功能提交为 `ea3aaaa2d62dc5f1f101c4ca0c58a89850c739a2`。私有候选位于 `artifacts/php-companion-alpha-0.4.5-ea3aaaa2/`；四份 VSIX 内容验证、`SHA256SUMS`、VS Code 1.138.0 隔离打包宿主、Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL preflight 均通过。Core、Symfony、Open Source Pack、Recommended Pack 的 SHA-256 分别为 `7fb042d0e09317e72d1313e33de13e853d4c6ce58d48f4beeb1b50dbf89dc220`、`38f5c42407a39e2a870eccacf22e277ae47ab3c489a981e5fbc7651f3334ee57`、`393009ed692e6e07284aa62d6ee5fdd909e9ec5bbedc98ff53a48c658ff7ddfc`、`1af7f5d6c372f1e7c7d07f3d7ea9a90cc11bf314da4fda53e24d1e88abfc10ef`。

## 边界

本增量只补全 YAML 中带 `@` 的精确服务值。XML/PHP Configurator 服务引用、YAML `alias`/`decorates`/`parent` 等不带 marker 的关系及服务 ID Rename 仍须单独建立位置与身份门禁。
