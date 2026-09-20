# Symfony XML 服务引用导航

日期：2026-09-21。范围：独立 Symfony 容器 Provider 已确认配置图内的传统 `services.xml` 服务引用。

## 行为

- `argument`、`property`、`bind` 仅在 `type="service"` 或 `type="service_closure"` 时把 `id` 识别为服务引用。
- `service` 的 `alias`、`parent`、`decorates`，以及 `factory`/`configurator` 的 `service` 属性提供精确 Definition 和 References。
- Definition 只跳到唯一权威静态或编译注册；References 从 YAML 或 XML 任一入口返回配置图内全部精确 YAML/XML 用法。
- 声明 `id`、普通标量、参数表达式、注释、DOCTYPE、环境 `<when>`、损坏 XML、普通业务 XML 和歧义注册不产生结果。
- Red Hat XML 继续负责 XML 语言识别、Schema、通用补全和格式化；PHP Companion 只增加 Symfony 服务语义。

## 自动验证

- framework-symfony 44 项测试覆盖所有支持属性、精确原始范围和保守拒绝边界。
- Language Server 198 项通过；真实 stdio 回归证明 YAML/XML 双向查询都返回一处 YAML 和一处 XML 用法，XML Definition 落到 YAML 唯一注册。
- 全仓 24 个组件共 755 项、独立 Symfony 扩展 3 项、根扩展 44 项，共 802 项通过；TypeScript 与 ESLint 通过。
- 24 个组件 tarball 从隔离消费者通过构建和公开 API 验证。
- VS Code 1.138.0 开发与隔离打包 Extension Host 同时加载核心和 Symfony 扩展，验证 XML Definition、两个 YAML 引用和一个 XML 引用，退出码均为 0。

## 候选

功能提交为 `0b7bbf7fd1c94892a69366acd3f3e6931544c5bb`。私有候选位于 `artifacts/php-companion-alpha-0.4.5-0b7bbf7f/`；四份 VSIX 内容与 `SHA256SUMS` 验证通过，Winstar PHP 8.5 和 CoreRepo PHP 7.2 的确定性 WSL 预检通过。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `f9cc1f8bb347f6471b342c912a7927d7b1376ded5ea38f06afc5a55d989354ff` |
| `php-companion-symfony-0.4.5.vsix` | `a5057f0cfcfc6e11b676640da1c74a7e11b1e00285157287ade1d33f85c10755` |
| `php-companion-open-source-pack-0.4.5.vsix` | `45dff58669bf5fdb5a8856206c34bc1183a841766c1caa4e4899e0398154e730` |
| `php-companion-recommended-pack-0.4.5.vsix` | `5c5e334108f36dace9297ea375d8055e1811dd3e28767dd32638511d1a0a5844` |

## 人工门禁

后台 WSL shell 不是 VS Code WSL 集成终端，严格 `--check-editor` 探针因此以 `vscode-remote-terminal-required` 和 `code` CLI 超时明确失败；未把它记录为通过。候选目录保留该报告以及两份成功的确定性预检。需要从 `PHP Companion Alpha` Profile 的 WSL 集成终端安装核心、Symfony 与恰好一个 Pack，Reload Window 后完成实际编辑验收。
