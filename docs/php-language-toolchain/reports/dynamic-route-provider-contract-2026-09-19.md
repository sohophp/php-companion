# 动态路由 Provider 契约

日期：2026-09-19

## 问题与边界

Winstar 的 `ModuleRouteLoader` 会读取 `src/Modules/*/Routes/*.yaml`，按应用配置过滤条目，并从 `admin_defaults`、Controller 方法和 route profile 生成路由。静态扫描私有 YAML 无法同时证明配置选择和生成结果，因此不能把这些文件直接当成 Symfony 标准路由声明。

本增量增加两个可独立发布组件：`@php-companion/route-provider` 定义完整、有来源位置的 schema 1 路由快照；`@php-companion/route-provider-host` 运行用户显式配置的可信命令。语言服务器通过 `phpCompanion.routeProviders` 接入，并只在路由调用已经唯一解析到受支持 Symfony API、且该工作区未交给外部 Symfony runtime provider 时请求动态事实。

## 精准性规则

- 每次补全、Definition 或 References 查询都使用新进程和新 generation，不复用旧动态快照。
- 响应必须完整，且请求 ID、providerId 与 generation 全部匹配；超时、崩溃、非 JSON、超限输出和不完整响应均不提交。
- 静态与动态事实合并后，名称出现多次即保持歧义，不提供该名称的导航。
- Provider 必须返回声明 URI 和精确范围；核心不把运行时路由名伪装成无来源声明。
- 命令不会从项目自动发现；进程隔离限制故障范围，但不是 OS 安全沙箱。

## 已执行验证

- route-provider 契约测试：3 项通过。
- route-provider-host 进程测试：2 项通过，覆盖完整快照、身份/完整性拒绝和超时。
- Language Server：186 项通过。新增真实 stdio 用例验证动态路由补全、Definition 精确范围，以及修改 provider 输入后下一查询立即得到新名称。
- 全仓 TypeScript 类型检查及相关 ESLint 通过。

下一步实现明确配置的 Winstar 适配器，由项目自身的 `ModuleRouteDefinitionProvider` 或 Router 输出实际启用路由，并把生成路由映射回对应模块 YAML 的来源范围；不会把 Winstar 私有格式写入通用语言服务器。
