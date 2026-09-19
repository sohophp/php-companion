# 独立 Symfony 事件关系迁移证据

日期：2026-09-20

功能提交：`ca600a637caa51f84c21235e3dd116fc8bd68e7e`

## 交付边界

- 新增可独立发布的 `@php-companion/provider-symfony-events`，由 `sohophp.php-companion-symfony` 打包为 `dist/event-provider.js` 并通过核心 plugin API 注册。
- Provider 静态读取有界项目 PHP 源码，并消费核心已经建立的有效公开方法、继承关系和独立服务 Provider 返回的服务目录；不启动 Kernel、不执行项目 PHP，也不加载项目 autoloader。
- 覆盖直接 subscriber map、方法级 `#[AsEventListener]`、父类/Trait 提供的监听方法与 subscriber map，以及字面量事件派发候选。核心继续负责通用 PHP 方法身份、可见性和 Symfony EventDispatcher 接收者验证，因此 Messenger 与同名业务 API 不会混入事件关系。
- semantic-provider schema 1 新增有效方法、直接父类、超类型、完整服务目录和事件事实；`replacesEventRelations` 建立单一权威所有权。Provider 失败、超时、协议无效、输入越界或结果不完整时，核心保留原静态实现作为 Alpha 回退。
- 项目源码最多 10,000 个文件、单文件最多 1,000,000 字符、合计最多 128 MiB；打开文档快照沿用 128 份和 8 Mi 字符总预算。用户配置的通用 Provider 不能取得 Symfony 容器或事件关系的权威所有权。

## 性能修正

初版 Provider 在自身进程重复建立完整语义工作区，真实 Winstar 用时 64.852 秒，超过 30 秒 Provider 门限。最终实现改为复用核心已经计算的项目类型、有效公开方法和继承目录，同一项目源码运行降至 3.008 秒，并保持 20 条订阅和 4 条派发候选不变。覆盖安装后的最终 bundle 独立运行用时 3.947 秒。

## 自动验证

- 全仓 TypeScript、ESLint、`git diff --check` 和完整 `pnpm test` 通过。
- 23 个组件共 725 项测试通过；其中 semantic 269 项、Language Server 191 项、`provider-symfony-events` 1 项。独立 Symfony 扩展 2 项、根扩展 44 项通过。
- Language Server 子进程集成回归证明服务目录和有效方法目录会传给事件 Provider，Provider 成功时使用权威事件事实，失败时回退核心实现；References 仍需通过真实 PHP 方法和 EventDispatcher 接收者门禁。
- 23 个组件 tarball 在仓库外消费者中完成安装、导入和 smoke；输出确认实际验证数量为 23。
- 四份 VSIX 内容门禁通过；Symfony VSIX 含 `event-provider.js`、`service-provider.js`、两类路由 Provider、扩展入口和两份 Tree-sitter WASM。
- VS Code 1.138.0 隔离 Profile 同时加载打包后的核心与 Symfony VSIX，完整索引、导航、References、Rename、Safe Move 和 Undo/Redo 回归通过，Extension Host 退出码为 0。

## 真实 Winstar 审计

最终安装 bundle 对 Winstar 执行完整静态审计：

| 事实 | 数量 |
| --- | ---: |
| 索引项目文件 | 2,265 |
| 项目类型 | 2,279 |
| 已注册服务 | 844 |
| 事件订阅/监听关系 | 20 |
| 事件派发候选 | 4 |

安装目录中的 `event-provider.js` SHA-256 为 `cd147a1d8f5987ed3ccd3f3a55880c794d6c1c300a7751263f193278acdf644a`，运行耗时 3.947 秒，项目源码集合完整。核心只会把派发候选用于已证明属于 Symfony EventDispatcher 的调用，候选数量不等同于无条件发布的引用数量。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-ca600a63/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `f74a26d7b70077e421a47f7699e0e3ef519249bd4945548edc3cfcff09c0d382` |
| `php-companion-symfony-0.4.5.vsix` | `7d8961e317472449ff5d137e2a6f43a6ddfd8063aedb83fc3342e27218dadb9b` |
| `php-companion-open-source-pack-0.4.5.vsix` | `ae8c25be6fbbf3f9cddf127740488daa7e03990f3dc9b0588311bee4e7f459fd` |
| `php-companion-recommended-pack-0.4.5.vsix` | `3e95029fa24b2dcd2328ca07167a780991b6c297a1baa3b1d4e890fd2114927e` |

Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性预检均通过且没有失败项。核心与 Symfony 候选已覆盖安装到 WSL RockyLinux8；构建和安装目录中的核心入口、Language Server、Symfony 入口、四个 Provider 与两份 WASM 摘要逐项一致。

## 剩余边界

实际 Alpha Profile 仍需执行 Reload Window。Controller/Twig 上下文编排、独立扩展升级和 API 不兼容门禁，以及迁移完成后移除核心兼容回退仍待完成。Marketplace 发布与 Winstar/CoreRepo 各两小时人工编辑验收尚未执行。
