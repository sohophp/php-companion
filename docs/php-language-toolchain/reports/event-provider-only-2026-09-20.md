# Symfony 事件关系仅由独立 Provider 提供

日期：2026-09-20

功能提交：`747819b97d21e53b0ea56fb04dc52ba120ea64ec`

## 所有权边界

- 核心 Language Server 不再扫描 Symfony subscriber map、`#[AsEventListener]`、父类/Trait 监听方法或 `dispatch()` 候选。
- 事件发现只由可独立发布的 `@php-companion/provider-symfony-events` 完成，并由 `sohophp.php-companion-symfony` 注册。
- 核心继续负责框架中立的 Provider 宿主、PHP 方法身份与可见性验证，以及 EventDispatcher 接收者类型验证；Messenger 和同名业务方法不会因此成为事件引用。
- 恰好一个完整的 `replacesEventRelations` Provider 才能提交事件事实。Provider 缺失、冲突、失败、超时、输入越界或返回不完整时，核心清空订阅与派发候选，不回退扫描项目 PHP，也不保留陈旧结果。
- 服务配置中的事件监听标签仍来自独立服务 Provider；核心只消费并验证其目标 PHP 方法。

## 自动验证

- TypeScript、ESLint 和 `git diff --check` 通过。
- Language Server 190 项真实 stdio 测试通过。覆盖独立 Provider 的 listener/dispatch References，以及运行中撤销事件 Provider 后结果清空且不执行核心回退。
- `provider-symfony-events` 1 项、Symfony 扩展 3 项、根扩展 44 项测试通过。
- 24 个组件 tarball 在仓库外隔离消费者中完成安装、导入和 smoke；四份 VSIX 内容门禁通过。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的候选摘要、Composer 根、运行时版本和 WSL 确定性预检均通过。

## 真实 Winstar 审计

已安装的独立事件 Provider 使用完整项目类型目录和独立服务 Provider 结果执行静态审计；没有启动 Kernel、执行项目 PHP 或加载项目 autoloader：

| 事实 | 数量 |
| --- | ---: |
| 索引项目文件 | 2,265 |
| 项目类型 | 2,279 |
| 已注册服务 | 844 |
| 事件订阅/监听关系 | 20 |
| 事件派发候选 | 4 |

项目源码集合完整。已安装 `event-provider.js` 的 SHA-256 为 `ca21d408432df2f83d3f00c17405ce0a03397fc620d281df986ece373272f20c`，Provider 用时 4,023.83 ms，低于 30 秒门限。派发候选仍须在核心中通过真实 EventDispatcher 接收者验证后才能成为 References。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-747819b9/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `abd7f0805699a865b119aefbe2eb3d27875b998dfce8d6cb163806564a94ff11` |
| `php-companion-symfony-0.4.5.vsix` | `ee67bb84889c11f23b452a248890c6bfcd4e45363c8107752d1353e36a6bcadf` |
| `php-companion-open-source-pack-0.4.5.vsix` | `cd02aaff2e2f14ccd58bb86782e7d72cf30507974dd55129f0c611a8919e3a4e` |
| `php-companion-recommended-pack-0.4.5.vsix` | `f9382919398198325fd3d0b4469af7ddf754d62adc9ca17d775161878894ed12` |

核心与 Symfony VSIX 已覆盖安装到 WSL RockyLinux8。候选、构建目录和安装目录中的核心扩展、Language Server、Symfony 扩展及事件 Provider 摘要一致。

## 剩余边界

Alpha Profile 需要执行 Reload Window 才会加载新安装产物。静态 Symfony 路由仍有核心兼容扫描，下一阶段继续移除。严格编辑器预检仍需从 VS Code WSL 集成终端执行；Winstar 与 CoreRepo 各两小时人工编辑验收及 Marketplace 发布尚未执行。
