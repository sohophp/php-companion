# Symfony 静态路由仅由独立 Provider 提供

日期：2026-09-20

功能提交：`b8386e8489204893fee7a6134f59bae3751340b0`

## 所有权边界

- 核心 Language Server 不再读取或遍历 Symfony YAML 路由、PHP Configurator、Route Attribute、Kernel 导入、Bundle 资源、环境块、本地化前缀及 glob/exclude。
- 删除核心路由遍历所需的 Bundle 注册解析和 `minimatch` 依赖；静态路由图只由可独立发布的 `@php-companion/provider-symfony-routes` 建立，并由 `sohophp.php-companion-symfony` 注册。
- 恰好一个 `replacesStaticRoutes` Provider 才能取得静态路由所有权。Provider 缺失、冲突、失败、超时、输入越界或返回不完整时不产生静态路由事实，也不扫描项目配置作为回退。
- 非权威运行时 Provider 仍可提供独立动态路由；核心继续负责框架中立的 Provider 宿主、Symfony 路由调用身份验证、名称唯一性、Completion、Definition、References 和路径参数补全。
- 打开的 PHP/YAML 文档继续以有界快照覆盖磁盘；VS Code 开发宿主门禁现同时加载核心与 Symfony 两个扩展，避免把插件能力误归给核心。

## 自动验证

- TypeScript、ESLint 和 `git diff --check` 通过。
- Language Server 5 个文件共 190 项测试通过。完整路由大样本改为运行真实独立 Provider，并覆盖打开 YAML 快照、Provider 失败、运行中撤销以及两个权威 Provider 冲突后均不执行核心回退。
- `provider-symfony-routes` 2 项、Symfony 扩展 3 项测试通过。
- VS Code 1.138.0 开发 Extension Host 同时加载核心与 Symfony 扩展，完整索引、路由补全、导航、References、Rename、Safe Move 和 Undo/Redo 回归通过，Extension Host 退出码为 0。
- 24 个组件 tarball 在仓库外隔离消费者中完成安装、导入和 smoke；四份 VSIX 内容门禁通过。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的候选摘要、Composer 根、运行时版本和 WSL 确定性预检均通过。

## 真实 Winstar 审计

覆盖安装后的独立静态路由 Provider 在 `dev` 环境直接读取真实 Winstar 配置，不启动 Kernel、不执行项目 PHP，也不加载项目 Composer autoloader。结果为 17 条有来源静态路由，与迁移前独立 Provider 基线一致；其中包括 `application_fallback`、`health_live`、`health_ready` 和 Symfony profiler 路由。

已安装 `static-route-provider.js` 的 SHA-256 为 `2e3ebbbed2b63c47b330735bb30bde56ec86b0cf8127744e8e07e3391aa20886`，用时 903.30 ms，低于 30 秒门限。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-b8386e84/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `efb838b610db363d2defc9403456160515432ba5cfb1c0a0a9d18e1fb77d29e2` |
| `php-companion-symfony-0.4.5.vsix` | `1df9e4c2f973d00a425d2099c689535090571d6608e8dbe5c07a64e5d6458e40` |
| `php-companion-open-source-pack-0.4.5.vsix` | `f748ec341e29e09d0d9d19e2cd21be9f53c478ad67d61837996d16868368df5b` |
| `php-companion-recommended-pack-0.4.5.vsix` | `8db387dbd1a4ddacb1a69e653bc7780837eb4a40354870c4627d235bb077c29f` |

核心与 Symfony VSIX 已覆盖安装到 WSL RockyLinux8。候选、构建目录和安装目录中的核心扩展、Language Server、Symfony 扩展及静态路由 Provider 摘要一致。

## 剩余边界

Alpha Profile 需要执行 Reload Window 才会加载新安装产物。Symfony 项目事实已全部脱离核心扫描；下一步集中完成独立扩展的人工编辑验收、性能观察和 Alpha 发布门禁。严格编辑器预检仍需从 VS Code WSL 集成终端执行；Marketplace 发布仍须单独确认。
