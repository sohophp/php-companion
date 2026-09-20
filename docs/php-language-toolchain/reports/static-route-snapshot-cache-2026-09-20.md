# Symfony 静态路由快照缓存

日期：2026-09-20

功能提交：`ff41aa03aa3493da343239975e91f799af257483`

## 行为边界

- 路由 Provider 契约新增显式 `cacheUntilInvalidated` 元数据；未声明的自定义 Provider 与 Winstar 运行时 Provider 仍在每次查询时执行。
- 独立 `PHP Companion: Symfony` 的静态路由 Provider 选择复用完整快照，核心不再为 Completion、Definition 或 References 的每次请求重新创建进程和遍历路由配置。
- Provider 描述、Symfony 环境、工作区 PHP/YAML、打开 PHP 文档或插件提供的打开文档快照发生变化时，缓存立即失效；失效期间正在运行的旧结果不会写回缓存。
- 缓存按工作区根和 Provider 身份隔离，仍要求恰好一个完整权威静态路由 Provider。

## 自动验证

- `@php-companion/route-provider` 3 项、`@php-companion/plugin-api` 2 项、Symfony 扩展 3 项测试通过。
- Language Server 5 个文件共 191 项测试通过，其中新增用例证明连续查询只执行一次选择缓存的 Provider，磁盘状态变化在通知前不泄漏，`workspace/didChangeWatchedFiles` 后重新执行并返回新快照；既有动态 Provider 用例继续证明默认逐次执行。
- 24 个组件 tarball 在仓库外隔离消费者中完成安装、导入和 smoke。
- 四份 VSIX 内容门禁通过；VS Code 1.138.0 打包 Extension Host 同时加载核心与 Symfony VSIX，完整语义/重构回归通过，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的候选摘要、Composer 根、运行时版本和 WSL 确定性预检均通过。

## 真实 Winstar 审计

使用覆盖安装后的核心与 Symfony 扩展，对真实 `src/Health/HealthController.php` 的类 References 连续发起三次 LSP 请求，并通过计数包装器记录真实静态路由 Provider 进程次数：

| 阶段 | Provider 累计执行次数 | 用时 | References | 静态路由配置引用 |
| --- | ---: | ---: | ---: | --- |
| 首次查询 | 1 | 9537.65 ms | 2 | 有 |
| 未变化的第二次查询 | 1 | 6.26 ms | 2 | 有 |
| 路由 YAML 变更通知后的第三次查询 | 2 | 914.47 ms | 2 | 有 |

首次用时包含该真实工作区的按需 PHP 语义加载，不能视为纯 Provider 时间；第三次用时代表缓存失效后的静态路由重建量级，并与上一候选 903.30 ms 的独立 Provider 基线一致。第二次查询没有创建 Provider 进程，仍保留完全相同的类引用与静态 YAML 来源关系。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-ff41aa03/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `3c847da7cedc29d2a4172bc44d5379b7e3e91eb447619e63de62a6965c0d0dd4` |
| `php-companion-symfony-0.4.5.vsix` | `64b0921261e1dfa9332e45cc18ddc3ba6146be65a93683beea84ebc26eb304b5` |
| `php-companion-open-source-pack-0.4.5.vsix` | `4d1c0072ea72bc430cfac8d17fe87f4422a0c7a9192579857714dd8c689537ab` |
| `php-companion-recommended-pack-0.4.5.vsix` | `27d518684cef759be98f0380018ec9e498b7044efd98eb1ffd45296cd85f8b6b` |

核心与 Symfony VSIX 已覆盖安装到 WSL RockyLinux8。候选构建与安装目录中的核心扩展、Language Server、Symfony 扩展及静态路由 Provider 摘要逐项一致。

## 剩余边界

Alpha Profile 需要执行 Reload Window 才会加载新安装产物。自动化已经证明进程复用、文件失效和语义结果；严格编辑器预检及两小时 Winstar/CoreRepo 编辑会话仍需从 VS Code WSL 集成终端完成。Marketplace 发布仍须单独确认。
