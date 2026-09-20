# Symfony 编辑器能力独立扩展所有权验收

日期：2026-09-21

## 结果

Symfony 的 YAML、XML 和 PHP Configurator 编辑器能力已经从核心 VS Code 扩展迁入 `sohophp.php-companion-symfony`。独立扩展现在注册：

- YAML 路由控制器与服务 Definition；
- YAML/XML/PHP Configurator 服务 References；
- YAML/XML/PHP Configurator 服务 ID Completion；
- YAML/XML 服务 ID Rename。

PHP 文件的标准 LSP Rename 继续由核心拥有，因为它需要与普通 PHP Rename 使用同一协议入口和编辑计划；只有独立 Symfony Provider 提供完整服务图时，服务器才会生成服务 ID 编辑。

核心 plugin API v1 新增可选 `requestLanguageServer<T>()`。它只接受 `phpCompanion/` 命名空间请求，让受信任的独立扩展复用核心 Language Server 的启动、重启和关闭生命周期，而不取得 Language Client，也不能发送任意 LSP 通知。旧 API v1 核心缺少该可选方法时，Symfony 扩展不重复注册客户端 Provider，保留旧核心自己的兼容路径。

## 所有权证据

开发双扩展宿主报告 Symfony API 的 `languageFeaturesRegistered: true`，并继续通过跨 YAML/XML/PHP 的 Definition、References、Completion、Rename、Apply 和 Undo 场景。

新增 `pnpm test:extension:core-only` 只加载核心扩展并打开同一 Symfony YAML fixture。Definition 与 References 返回空集合，Completion 不包含服务 ID，Rename 不产生编辑，同时确认独立 Symfony 扩展未被加载。核心源码也不再注册 YAML/XML DocumentSelector 或 Symfony 编辑器 Provider。

## 自动验证

- TypeScript 与 ESLint 通过。
- plugin API 2 项、IntegrationRegistry 3 项、Symfony 扩展 3 项通过。
- Language Server 198 项及全仓 26 组共 804 项通过。
- 24 个 monorepo 组件从隔离 tarball 安装消费通过。
- VS Code 1.138.0 的 core-only 开发宿主、双扩展开发宿主及双扩展打包宿主均以退出码 0 结束。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性 WSL 预检通过，见 [Winstar JSON](alpha-preflight-winstar-symfony-feature-ownership.json) 和 [CoreRepo JSON](alpha-preflight-corerepo-symfony-feature-ownership.json)。

## 候选产物

功能提交为 `762f7a1`，候选目录为 `artifacts/php-companion-alpha-0.4.5-762f7a1e/`：

| 角色 | SHA-256 |
| --- | --- |
| PHP 核心 | `c8624298d4756577d04cab1c27516c810669a24e396933b89b8c9be93695fe51` |
| Symfony | `ecfbb466adcc974600fb5c2174a486dac5c9b9a70ae7a86f3dcda93f474c5ebe` |
| Open Source Pack | `67e96dd58cd0e2c43231bb38df34b6e8cbded45ac0db67955157151a3ae00464` |
| Recommended Pack | `e4c8cdabfa0d127298ae5e1247e2caabd7837caa0a7be20f4e48fe7603ea498a` |

四份 VSIX 内容门禁和 `SHA256SUMS` 均通过。Alpha Profile 仍需安装核心与 Symfony 两份候选并 Reload Window；后台门禁不替代 Windows 客户端连接 WSL Remote 的持续人工编辑验收，Marketplace 发布未执行。
