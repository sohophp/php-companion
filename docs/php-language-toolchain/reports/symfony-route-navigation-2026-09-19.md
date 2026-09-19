# Symfony 路由 Definition 与 References 证据

日期：2026-09-19

## 支持域

- 从 PHP 单/双引号直接路由名称发起 Definition，目标为当前 provider、环境和静态导入图中名称唯一的 YAML、Attribute 或 PHP Configurator 声明。
- 从同一调用发起 References 时，只扫描包含完整名称的项目 PHP 候选；每个结果还必须解析到受支持的 Symfony 路由方法和正确路由参数。`includeDeclaration=true` 时附加静态声明。
- 调用所有权沿用路由补全门禁：FrameworkBundle `AbstractController::generateUrl()` / `redirectToRoute()`，以及 Routing `UrlGeneratorInterface::generate()` / `RouterInterface::generate()`。命名参数按真实首参名称验证。
- 同名业务方法、普通字符串、动态名称、重复路由、索引不完整和外部 runtime provider 所有权不会产生 Companion 导航结果。

## 自动与真实证据

- stdio 回归覆盖 YAML 声明、项目 PHP Configurator、通用 Bundle PHP Configurator、两个合法使用点、同名业务方法反例、`includeDeclaration` 和外部 provider 抑制；Language Server 185/185 通过，耗时 222.37 秒，TypeScript 与 ESLint 通过。
- 构建后的服务器在 Winstar onDemand 根中，从合成但语义完整的 `RouterInterface::generate('health_live')` 调用跳到 `config/symfony/routes.yaml` 第 1 行，范围精确覆盖 `health_live`。
- 同一 Winstar References 探针只返回该合法 PHP 调用和 YAML 声明。探针未写入项目文件；动态 `ModuleRouteLoader` 路由未被文本猜测为静态事实。

## 开放边界

Winstar 的模块路由由服务 loader 从 `src/Modules/*/Routes/*.yaml` 运行时汇总。当前静态 Symfony 图不会声称理解该自定义格式；需要后续设计独立、可失效且能声明来源的 route provider 契约，或由外部 Symfony runtime provider 拥有这部分能力。

## 候选交付

- 功能提交：`bbdeb212c7e74865ba9fcc59f3e4212bdf81d965`；候选：`artifacts/php-companion-alpha-0.4.5-bbdeb212/`。
- 核心、Open Source Pack、Recommended Pack SHA-256：`dc3f20b06bbf1450ad611657a30aff344b6e1c947ff702a2df061e91a460b745`、`411ff8b912f917e70aac02f1a0612c420c4544cfb87069d2f80c968847503b02`、`98054c0c17c347008365f0c98369b7e14d3ea64abc4b3a8fcc1aadd1de1d685e`。
- 16 个组件 tarball 使用 npm 离线缓存完成仓库外安装/导入验证；最初在线安装停在远程元数据阶段且临时 `node_modules` 仍为空，主动中止后以相同 tarball 离线重跑通过，不属于产品测试失败。
- 核心 VSIX 已通过 Remote CLI 完整安装到 WSL RockyLinux8。已安装 adapter/server 与候选分别以 `f3195f639ab9f0d1f801c151468099acac0e69185e5c70fa1e4a357d774b8381`、`308d7977ec35ea1fbb5670a9caf3d033b48bcee3098af4b27330fe1bfc9ceec4` 核对；Reload Window 后加载。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 Alpha 预检通过。Extension Host 归属、竞争 provider 禁用状态和两小时真实编辑会话仍为人工门槛。
