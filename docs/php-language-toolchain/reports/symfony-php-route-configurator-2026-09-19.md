# Symfony PHP 路由配置与自定义 Kernel 入口（2026-09-19）

## 目标

让 PHP `RoutingConfigurator` 源码声明、非标准但可证明的 Kernel 路由入口和通用 Bundle PHP 路由资源进入现有 Symfony 路由名称补全，同时保持环境与运行时边界。

## 实现边界

1. framework-symfony 只接受唯一返回的、参数原生类型解析为 `Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator` 的 closure；不 require PHP 文件。
2. 顶层字面量 `add(name, path)` 产生精确名称范围；`import(resource[, type])` 支持 PHP、YAML 和 Attribute loader，并叠加字面量 `prefix()` / `namePrefix()`。
3. Configurator 参数重赋值、动态参数和可能修改路由集合的未知调用撤销事实。条件内 add/import 不发布为无条件候选；条件 remove 或未知方法会撤销可能受影响的同文件事实。
4. 自定义 Kernel 入口要求类直接继承 Symfony Kernel、`configureRoutes()` 为非静态单参数方法且参数原生类型为 RoutingConfigurator；只读取方法体顶层 import 和确定性的 `__DIR__` / `dirname(__DIR__)` 路径拼接。
5. `@Bundle/...` 路由复用服务导入的证明链：通用静态注册、唯一类文件、继承链未声明构造器或 `getPath()`、最终到达基础 Bundle，并同时满足语法路径与 realpath containment。Bundle 证明只在路由图实际遇到别名时按需执行。
6. 约定入口和 Kernel 入口到达同一真实资源、且前缀/loader/exclude/namespace 上下文相同时去重；上下文不同的重复导入仍分别产生带各自前缀的声明。

环境条件、参数/glob Kernel 表达式、环境专属 Bundle、动态 RouteCollection factory 和 service loader 保持 unknown。启用 Symfony Language Tools runtime indexing 时，原有 provider 所有权切换继续让外部运行时路由表接管。

## 聚焦验证

- framework-symfony 3 个测试文件、35 项通过；新增用例覆盖 PHP add/import/prefix/namePrefix、重赋值和 Kernel 条件排除。
- 真实 stdio 路由测试同时证明标准 YAML、自定义 Kernel YAML、本地 PHP 和通用 Bundle PHP 声明进入精确补全；未保存 YAML、Attribute/glob/exclude 和 provider 切换回归继续通过。
- Winstar 只读探针从 `src/Kernel.php` 得到唯一无条件 `config/symfony/routes.yaml` 入口，主文件得到 3 个直接 YAML 路由和 2 个 PHP factory 导入；动态 SoFinder RouteCollection factory保持 unknown。
- Winstar onDemand 真实 LSP 探针返回 `health_live` 与 `health_ready`；冷查询 1851 ms（包含 parser 首次加载），同进程热查询 40 ms。
- Symfony 7.4 vendor 的 7 个含 RoutingConfigurator 参数的 PHP 文件中，5 个完整配置文件可证明，共提取 17 个路由声明；MicroKernelTrait 与测试 Kernel 的动态路径保持 unknown。WebProfiler 的 wdt/profiler 文件共提取 14 个源码声明，但 Winstar 的 `dev` 条件没有静态启用。

## 验收结果

- framework-symfony：3 个测试文件、35 项全部通过。
- Language Server：6 个测试文件、185 项全部通过，耗时 219.99 秒。
- 语义内核：1 个测试文件、268 项全部通过；根扩展：9 个测试文件、39 项全部通过。
- 全仓 TypeScript、ESLint 和三个 VSIX 内容校验通过；16 个 monorepo 组件 tarball 均在隔离消费者中安装验证通过。
- 重复入口修复后，语言服务器构建、ESLint 与包含“约定入口 + Kernel 同一路径”的真实 stdio 路由测试再次通过；修复后的三份 VSIX 重新打包并校验。

功能提交为 `864a38a6a0fe9be68fdd71a530d9749c2e48037c`，重复入口修复提交为 `6acb8e1a30ee3fb6735bd0d2835c1dc42078e536`，最终候选目录为 `artifacts/php-companion-alpha-0.4.5-6acb8e1a/`。核心、Open Source Pack、Recommended Pack 的 SHA-256 依次为 `77aa03ae74bad02a938e0ef2c5e8ecdbda72b08e429de4e6a5fa30c9ca08ba20`、`0394210356dcc80b71903db94989943893fe7d6b9616510ecb4e4462e2442d17`、`767b22b95124a7c74582fc26f5c4d9ee305a69e60f8e5805886fdeebd7c0386c`。候选语言服务器已原子覆盖到 WSL 现有扩展目录，源码 bundle 与安装目标均为 `87e2230da074b9efb78ae9ecd54293f08ccbf80c074110df8f253f5fb079a819`，Reload Window 后加载。
