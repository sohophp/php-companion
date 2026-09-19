# Symfony 路由控制器 References

日期：2026-09-19

## 实现范围

`framework-symfony` 现在从 YAML 路由的直接 `controller` 和 `defaults._controller` 字面量中提取控制器 FQCN、可选方法名及各自的精确源码范围。本地化路径展开会保留同一控制器关系。只有源码内部文本与解析值完全一致、类名为带命名空间的 PHP FQCN 时才发布；服务 ID、转义后才成立的双引号字符串、动态值和结构不完整的声明保持 unknown。

框架无关的 `@php-companion/route-provider` schema 1 增加可选 `controller` 元数据，并完整校验 URI、类范围及成组的方法字段。Winstar 适配器只为直接模块 YAML 路由发布该关系；`admin_defaults` 等只有生成来源、没有直接控制器文本的路由不会虚构位置。

Language Server 在 PHP 类或方法 References 中加载当前可用路由图。类关系按完整 FQCN 匹配；方法关系还必须通过语义工作区解析到该类的有效公开实例方法，避免同名方法混入。外部 Symfony runtime provider 拥有工作区路由能力时，PHP Companion 继续让出该功能，不启动自定义 provider。

当前不覆盖 import 层注入的控制器默认值、PHP RoutingConfigurator 的动态控制器表达式、服务 ID 到类的容器解析，以及没有直接源码文本的生成路由。这些场景会保持无结果。

## 自动验证

- `@php-companion/route-provider` 3 项测试验证合法控制器关系及缺字段拒绝。
- `@php-companion/framework-symfony` 41 项测试覆盖直接/`defaults` 控制器、本地化继承、invokable 类、服务 ID 和转义标量拒绝。
- `@php-companion/provider-winstar-routes` 3 项测试验证模块 YAML 的精确类/方法源码切片。
- `@php-companion/language-server` 186 项测试通过；静态 Symfony 图和一次性动态 provider 均通过真实 stdio References 请求返回精确范围。

真实 Winstar 源码中 `config/symfony/routes.yaml` 使用直接 `controller`，多个 `src/Modules/*/Routes/*.yaml` 使用 `defaults._controller`，因此两条实现路径都有实际项目样本。Winstar Provider 对 dev Router 的 362 条已发布模块路由得到 151 条直接控制器关系；`RegionController::countriesAndProvinces` 的类和方法切片与源码逐字一致。

功能提交为 `0db9711`。全仓 TypeScript 与 ESLint 通过；19 个组件 tarball 已从隔离消费者安装并执行 smoke test。Winstar PHP 8.5 和 CoreRepo PHP 7.2 的 WSL 确定性预检通过。

Alpha 候选目录为 `artifacts/php-companion-alpha-0.4.5-0db97115/`：

- 核心 VSIX：`6c61ea4ce66f2b076f2f5daa661ae7750a8f33845820fb7fb8aefaa28ac5885d`
- Open Source Pack：`bd4f36e5949b71090a72b24ebc99f83ceebb37e4eb47075f0191287b3a65d45b`
- Recommended Pack：`425ceeb162307b8de1123606a177f7da1350af40a419cc321325faf3cf801286`

三份 VSIX 的清单、内容和 `SHA256SUMS` 均通过。核心候选已由 Remote CLI 成功覆盖安装到 WSL RockyLinux8；已安装 Language Server 和 Winstar Provider 的 SHA-256 分别为 `d56398e810a9405442b7bd807a89534b8aac31d7805547aef07635b7256205ad`、`c1ac36f6008f46f1f9dcc0101b28ccbaff3db5eff6965efb5e89ee2779c6a226`，与构建输出逐项一致。

直接启动已安装 Language Server 的真实 Winstar stdio 探针得到：标准 `HealthController::live` 的类和方法 References 精确落到 `config/symfony/routes.yaml` 第 3 行；启用内置 Winstar Provider 后，`RegionController::countriesAndProvinces` 精确落到模块 YAML 第 5 行。既有 `admin.CompanyPage.edit` 唯一 `id` 参数补全、YAML 本地化直接/导入路由以及 none/dev/prod 环境筛选继续通过。VS Code 需要 Reload Window 才会让当前 Extension Host 加载新版本。
