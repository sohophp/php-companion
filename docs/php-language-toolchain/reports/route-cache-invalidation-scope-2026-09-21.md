# Symfony 路由缓存失效范围验收

日期：2026-09-21

## 结果

普通 PHP 文档的打开、输入和关闭不再无条件清空静态 Symfony 路由 Provider 缓存。以下来源仍会保守失效：

- 包含 Route、`configureRoutes` 或 `RoutingConfigurator` 线索的当前或上一版 PHP 源码；
- `src/Kernel.php`、`app/AppKernel.php`、`config/bundles.php` 与约定 PHP 路由配置路径；
- YAML/XML 文件变化和编辑器快照变化；
- 删除、不可读等无法确认内容的 PHP watcher 事件；
- Provider 配置、环境与集成注册变化。

发送给静态路由 Provider 的打开文档快照也只包含可能影响路由的 PHP 文件，降低普通编辑器标签页把有界快照挤满并关闭路由能力的风险。Winstar 运行时 Provider 仍保持每次查询新鲜执行，没有借此优化扩大缓存承诺。

运行时存在但没有唯一源码位置的路由补全现在显示 `runtime route`，不再错误显示 `source declaration`。

## 自动验证

- Language Server 198 项通过；
- 回归用例证明同一缓存 Provider 在普通 PHP 文档修改后的调用次数保持 1，YAML 路由变化后增至 2，打开 Route Attribute 文件后增至 3；
- 全仓 26 组共 805 项、TypeScript、ESLint 与 24 个 monorepo 组件的隔离 tarball 消费通过；
- VS Code 1.138.0 双扩展开发宿主和隔离打包宿主均以退出码 0 完成完整编辑回归；
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL 预检通过，见 [Winstar JSON](alpha-preflight-winstar-route-cache.json) 和 [CoreRepo JSON](alpha-preflight-corerepo-route-cache.json)。

## 候选产物

功能提交为 `8ff6a81`，候选目录为 `artifacts/php-companion-alpha-0.4.5-8ff6a817/`：

| 角色 | SHA-256 |
| --- | --- |
| PHP 核心 | `4cbfbbbfd887cc10fcd91fefa363b4f6f509875799f2fab51510678f1b749e9e` |
| Symfony | `0478830d5a0b3cfa206a6447a333a6f74f1ebeb75f9658d025b5858fb88e3ea7` |
| Open Source Pack | `ce01c21750518b426d739dbf624d9352dd63b488ad236b4a4479cee65dd5ea13` |
| Recommended Pack | `ccb9acbb17ed8e7162ab3c96bf8d007a14aae704cd9ceed95468d19aa4dd3029` |

四份 VSIX 内容门禁和 `SHA256SUMS` 均通过。自动宿主和确定性预检不替代 Windows 客户端连接 WSL Remote 的持续人工编辑验收。

本增量针对路由 Provider 查询缓存，不把它描述为 PHP 全项目符号索引性能修复。初次项目索引仍由独立的持久索引与候选扫描机制负责。
