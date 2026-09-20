# Symfony 运行时权威路由目录验收

日期：2026-09-21

## 结果

独立 `PHP Companion: Symfony` 扩展现在明确区分路由全集所有权与源码位置补充：

- 启用 Winstar 运行时 Provider 时，实际 Symfony Router 输出是路由名称和路径的唯一权威目录；
- 静态 Symfony Provider 只为运行时已确认且名称、路径都唯一一致的路由补充源码位置和 Controller；
- 运行时存在但无法映射到唯一 YAML 声明的路由继续参与 Completion 和 PHP References，不提供虚假 Definition；
- 权威 Provider 失败、输出不完整、出现多个权威所有者，或打开文档快照超过协议上限时，整次路由查询返回无结果并记录原因；
- 没有运行时权威 Provider 时，静态路由图必须完整才可提供能力。

`RouteFact` 的源码三元组 `uri/start/end` 改为整体可选，协议校验拒绝只提供其中一部分。Provider Host 保留合法的 `complete: false`，由 Language Server 按所有权决定能否安全消费，不再把“有效但不完整”误报为协议损坏。

## 真实项目证据

对 Winstar 工作区执行两类独立探针：

| 数据源 | 完整性 | 路由数 | 有唯一源码位置 | 仅运行时确认 |
| --- | --- | ---: | ---: | ---: |
| Symfony 静态分析 | `false` | 17 | 17 | 0 |
| Winstar `debug:router` 运行时 Provider | `true` | 704 | 362 | 342 |

静态图不完整是项目自定义 `ModuleRouteLoader` 的预期结果。342 条运行时独有路由证明不能用静态扫描结果判断“不存在”或“没有引用”。新的合并规则保留全部 704 条实际启用路由，同时只对 362 条可唯一追溯的路由发布源码导航。

## 自动验证

- route-provider 3 项、route-provider-host 2 项、Symfony 静态路由 Provider 3 项、Winstar 路由 Provider 3 项通过；
- Language Server 198 项通过，覆盖运行时无源码路由、静态不完整补充、权威不完整拒绝和 Provider 失败；
- Symfony 扩展 3 项、根扩展 45 项、全仓共 805 项通过；
- TypeScript、ESLint 与 24 个 monorepo 组件的隔离 tarball 消费通过。
- VS Code 1.138.0 双扩展开发宿主和隔离打包宿主均以退出码 0 完成完整编辑回归；
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL 预检通过，见 [Winstar JSON](alpha-preflight-winstar-route-catalog.json) 和 [CoreRepo JSON](alpha-preflight-corerepo-route-catalog.json)。

## 候选产物

功能提交为 `e29a89b`，候选目录为 `artifacts/php-companion-alpha-0.4.5-e29a89b0/`：

| 角色 | SHA-256 |
| --- | --- |
| PHP 核心 | `f39e8c69bfb304024d4e60837ffef4134d810b2aed964b5163e5e204adc906a1` |
| Symfony | `52a1cfd5e7d1ee08cceb91b8b02be863434797c43a9e2b233b979f121ede3748` |
| Open Source Pack | `3831540f5d5d509d8b4d70dfdfe2b40bb5599733512edf3ba502fe7e27b4fe2b` |
| Recommended Pack | `e2ee7e0aca15ead2bd94a0cb024fec2e50e9f1d69db074d269a89e7889ab6ae0` |

四份 VSIX 内容门禁和 `SHA256SUMS` 均通过。Alpha Profile 仍需安装核心与 Symfony 两份候选并 Reload Window；自动宿主与确定性预检不替代 Windows 客户端连接 WSL Remote 的持续人工编辑验收。

## 后续边界

本增量建立路由 Rename 所需的完整性基础，但没有把 Rename 宣称为完成。PHP 字符串中的路由引用可由 PHP Companion 规划；Twig 中的 `path()`/`url()` 仍由 twig-plus 解析，跨扩展原子 Rename 需要先定义双方可验证的引用与编辑计划协议，不能在 PHP Companion 中重复实现 Twig parser。
