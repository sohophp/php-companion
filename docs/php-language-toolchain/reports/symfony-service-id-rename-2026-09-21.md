# Symfony 服务 ID 原子重命名验收

日期：2026-09-21

## 结果

PHP Companion 现在可以从独立 Symfony Provider 确认的 YAML、XML 或 PHP Configurator 配置中重命名唯一显式字符串 service ID。YAML/XML 通过 Companion 的附加 Rename Provider 发起，PHP Configurator 使用标准 PHP LSP Rename；两条入口生成同一个跨文件 `WorkspaceEdit`。

支持范围限定为一个权威静态注册以及完整配置图中源码文本与解码后 ID 完全一致的用法。编辑同时覆盖注册和 YAML `@service`、传统 XML service 属性、PHP Configurator `service()`/`get()`/`remove()`、alias、parent 与 decorator 等已经由框架分析器确认的引用。VS Code 真实宿主验证四处编辑可以一次应用并通过一次 Undo 全部恢复。

注册歧义、resource 派生 ID、类常量或动态表达式、需要转义或解码才能成立的文本、非法新 ID、不可读或超出大小限制的配置文件都会拒绝整个操作。实现不会返回已经知道不完整的局部编辑。新 ID 当前接受字母、数字、下划线、点和连字符，并要求以字母、下划线或点开头。

## Provider 完整性修正

首次真实 Extension Host 运行发现独立容器 Provider 把不存在的传统候选 `app/config/services.php` 也发布在 `containerConfigurationUris` 中。普通 References 会跳过不存在文件，但安全 Rename 必须拒绝不完整图，因此返回 `No result`。

Provider 现在只在候选路径实际存在且通过真实路径包含性检查后发布该配置 URI。实际存在但无法读取或无法完整分析的文件仍保留保守边界；Bundle 类路径继续作为配置图失效输入，不会因本次修复失去刷新能力。专项 Provider 测试覆盖实际根配置、导入配置和缺失传统候选。

## 自动验证

- TypeScript 与 ESLint 通过。
- `@php-companion/provider-symfony-services` 2 项通过。
- Language Server 198 项通过；stdio 覆盖 YAML/XML/PHP 四处编辑、PHP 标准 LSP 入口和非法名称拒绝。
- 24 个 monorepo 组件从隔离 tarball 安装消费通过。
- 全仓 26 个测试组共 803 项通过；framework-symfony 45 项、semantic 274 项、Symfony 扩展 3 项、根扩展 44 项均包含在内。
- VS Code 1.138.0 开发宿主和从实际 VSIX 解包的双扩展宿主均退出码 0；跨格式应用与单步 Undo 通过。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性 WSL 预检均通过，见 [Winstar JSON](alpha-preflight-winstar-symfony-service-rename.json) 与 [CoreRepo JSON](alpha-preflight-corerepo-symfony-service-rename.json)。

## 候选产物

功能提交为 `bd748be`，候选目录为 `artifacts/php-companion-alpha-0.4.5-bd748be1/`。目录内 `SHA256SUMS` 四项通过：

| 角色 | SHA-256 |
| --- | --- |
| PHP 核心 | `92940a223b261e74cf0a9ae8047c149b053d78ce32d874bd37a211b9e5d46210` |
| Symfony | `8f8787c0eaca010bf7ded4bb0c49ddfb397667b3aa1b06b9f4bda80bbec01e2a` |
| Open Source Pack | `0c873812384e4449235118bf717fff6b7003ddb1ebbc6bccfe8cfb4888ca3676` |
| Recommended Pack | `58311088111131326154d786c0b6802ddcd4aaf7f22f3e13f639eccf2f09cf0a` |

后台自动门禁不等同于 Windows 客户端连接 WSL Remote 的人工持续编辑验收。Alpha Profile 仍需安装本候选的核心与 Symfony VSIX、Reload Window，并确认竞争 PHP Provider 已关闭；Marketplace 发布未执行。
