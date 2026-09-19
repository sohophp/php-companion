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
- `pnpm test` 全仓门禁通过：除上述 Symfony 与 Language Server 外，语义内核 268 项、根扩展 39 项及其余组件全部通过；全仓 TypeScript、ESLint 与 `git diff --check` 通过。19 个组件 tarball 通过隔离消费者验证。
- 功能提交为 `602be7e`。候选目录为 `artifacts/php-companion-alpha-0.4.5-602be7ef/`；核心、Open Source Pack、Recommended Pack SHA-256 分别为 `a7a0a66ffff0ea661495b9795b7d1c61f532eec6ee0d2e1bd1225aa5ca8e0f9a`、`a4eb4acde5176e1ce5d192f868520f4b8b17751fa94a78d98011d263c76e3675`、`b66e4968f829d91209bdb85c432eabadff9021b3162a43ef48ebd31ce1aaacb3`。Winstar PHP 8.5 与 CoreRepo PHP 7.2 的 WSL 确定性预检均通过。
- 核心候选已通过 Remote CLI 覆盖安装到 WSL RockyLinux8。已安装 `language-server.js` 与 `extension.js` 的 SHA-256 分别为 `c7ea172e67bed15d1de6ca381b21e14006016a9ccce8e9956253dfdd4797e0fb`、`116c624e95589f504f6b30821db1aa830a586deb2982e0134a1de5f41705babd`，与构建输出一致。已安装 bundle 重跑上述 4 个 Winstar Definition 查询全部唯一命中；无持久缓存的 `onDemand` 冷启动项目扫描在 54.428 秒完成并返回 9 个 Controller context。
- 已安装 bundle 的既有用户场景回归继续通过：`$callable` References 精确返回 5 个同名变量范围，promoted readonly `$urlGenerator` F2 Rename 返回 3 处编辑，`AdminSecuritySubscriber` 从 `src/Bridge` 移到 `src` 的目标 namespace 为 `App`，最终文本为 `namespace App;`。

编辑器需执行 Reload Window 才会加载刚覆盖安装的 bundle；两小时 Winstar/CoreRepo 人工编辑会话仍属于 Alpha 人工验收项。
