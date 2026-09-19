# Symfony YAML 控制器 Definition

日期：2026-09-20

## 实现与所有权

PHP Companion 现在为 VS Code 的 YAML 文档追加一个窄 Definition Provider。它只把光标所在的 Symfony 路由控制器类段或方法段交给自研 Language Server，不订阅 YAML 文档到 PHP LSP，也不发布 YAML 诊断、补全、Schema 或格式化；这些能力继续由 Red Hat YAML 独占。

`framework-symfony` 使用有界 YAML 节点遍历，只接受带 `path` 的 route map 内字面量 `controller` 或 `defaults._controller`。标准键值路由和 Winstar 模块使用的 sequence 路由都受支持。服务 ID、转义后才得到 FQCN 的双引号值、动态值、缺少 `path` 的普通配置和结构错误文档保持无结果。

Language Server 接收当前编辑器源码快照和版本，只按项目 Composer PSR-4 映射加载目标类。类段必须对应唯一类声明；方法段还须解析为该控制器的有效公开实例方法，并可导航到继承或 Trait 组合后的真实声明。请求取消或编辑器版本变化时不采用旧结果。Symfony Language Tools 的外部 runtime 所有权启用时，Companion 返回空结果。

验证过程中还定位到一个既有索引状态错误：默认 `onDemand` 模式下，Twig interop 只检查 dependency-complete 状态，却没有启动项目扫描；这个状态按设计只属于 `experimental`，所以请求会持续返回 `null`。现在首次 interop 请求会启动并等待有界的项目源码扫描，发布 Controller context 后立即返回；它不会因此扫描 vendor。Extension Host 的完整语义基线显式使用 `experimental`，默认 `onDemand` 行为由独立 stdio 用例覆盖。

## 当前验证

- `@php-companion/framework-symfony` 42 项测试通过，新增正例覆盖标准与 sequence 模块路由，反例覆盖普通 `_controller` 键和服务 ID。
- Language Server 6 个文件、187 项测试通过；定向 stdio 用例证明 YAML 未作为 PHP 文档同步，`onDemand` interop 会完成项目扫描，类和方法分别返回 PHP 精确范围，外部 runtime 所有权切换后结果为空。
- 打包核心 VSIX 在隔离的 VS Code 1.138.0 Extension Host 完整通过；YAML 类段与方法段都经 `vscode.executeDefinitionProvider` 落到 PHP 文件。测试同时适配 VS Code 1.138 文件移动后保留 dirty 缓冲区的行为，以精确 namespace/import 结果而非自动保存状态作为 Safe Move 完成条件。
- 真实 Winstar `config/symfony/routes.yaml` 的 `HealthController::live`，以及 sequence 形式 `src/Modules/Http/Routes/routes.yaml` 的 `RegionController::countriesAndProvinces`，类段和方法段共 4 次查询均各返回 1 个目标 PHP 文件。
- 全仓 TypeScript、ESLint 与 `git diff --check` 通过。

组件 tarball、候选目录、三份 VSIX 哈希与已安装 bundle 证据将在功能提交后补入本报告。
