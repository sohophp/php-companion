# Symfony YAML 服务引用查找

日期：2026-09-20

## 行为

已由独立 Symfony 容器 Provider 确认属于服务配置图的 YAML 文件，现在可从精确 `@service.id` / `@?service.id` 值或其权威注册位置执行 Find All References。结果只包含配置图内由成熟 YAML parser 证明的完整服务引用标量；请求包含声明时同时返回唯一权威静态或编译注册位置。

Core 通过 VS Code YAML Reference Provider 把当前未保存源码和位置交给 Language Server。Language Server 只遍历容器 Provider 返回的 `containerConfigurationUris`，优先使用当前文档、框架快照或已打开源码，再受文件大小和取消门禁约束读取磁盘。通用 YAML 语法、Schema、普通补全和格式化仍由 Red Hat YAML 唯一负责。

Definition 同步改为从完整注册集合判定唯一目标，不再让面向注入选择的服务目录去重掩盖不同注册位置。多个权威注册位置、普通业务 YAML、声明键作为引用、`@@` 转义、`@=` 表达式、参数化或带空白值、损坏 YAML 均保持无结果。

## 验证

- framework-symfony 3 个测试文件、43 项通过；完整枚举只返回两个合法标量，排除声明键、转义值、表达式和损坏 YAML。
- Language Server 5 个测试文件、198 项通过；真实 stdio Provider 证明从引用查询得到精确引用范围，从注册位置查询可同时得到引用和声明，Provider 撤销后不再产生框架结果。
- VS Code 1.138.0 开发与隔离打包双扩展宿主均通过：从 `services.yaml` 的 `@App\\Service\\Mailer` 执行标准 References，返回两处精确服务 ID 范围，并保留 `App\\:` resource 注册声明；Extension Host 状态码为 0。
- 全仓 24 个组件共 754 项、独立 Symfony 扩展 3 项、根扩展 44 项，共 801 项通过；TypeScript、ESLint 与 24 个隔离消费 tarball 通过。
- 真实 Winstar `config/` 下 39 个 YAML 文件得到 54 个精确服务引用、34 个唯一 ID；`app.current_language_entity` 在 `config/symfony/services.yaml` 中得到 13 处精确引用。

功能提交为 `36cabd5640907d71c69a87dd563decee8f4f4ebb`。私有候选位于 `artifacts/php-companion-alpha-0.4.5-36cabd56/`；四份 VSIX 内容验证、`SHA256SUMS`、VS Code 1.138.0 隔离打包宿主、Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL preflight 均通过。Core、Symfony、Open Source Pack、Recommended Pack 的 SHA-256 分别为 `7b1937e9d5db92746c1e65faae7ac7f3dd0b2e0de48d8c85020d888df4f46054`、`1209b0de63ee14b1f09bcf59aafbfd265285462cb5425f416081001957d665fc`、`e6bcab42953c8186770ab072f2042ae0a6f86b3b0c75fc2b70fb308f55baa0ac`、`f5781360e418c63e2da35bf1b9fc616b5a6432c6559f88d8a74c8ddff41f9c0d`。

## 边界

本增量只查询 YAML 中带 `@` 的精确服务引用。XML/PHP Configurator 的服务 ID References、YAML `alias`/`decorates`/`parent` 等不带 `@` 的关系、服务 ID Rename 和补全仍须分别建立语法与运行时身份门禁后接入。
