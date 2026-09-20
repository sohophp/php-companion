# Symfony Controller 上下文仅由独立 Provider 提供

日期：2026-09-20

功能提交：`5a5f52fcc3e4183a1ab5900f0d33c6c6cfb29aa5`

## 所有权边界

- PHP Companion 核心 Language Server 不再导入或调用 `analyzeSymfonyControllerContexts`。源码搜索确认该分析器只由 `@php-companion/provider-symfony-controller-contexts` 调用，底层实现保留在可独立发布的 `@php-companion/framework-symfony`。
- 核心项目事实缓存从 schema 3 升至 schema 4，缓存 key 从 v51 升至 v52；Controller/Twig 上下文不再进入核心持久缓存，旧缓存不会在升级后伪装为有效的独立 Provider 结果。
- 独立 Provider 除已索引项目类型外，也分析位于 Composer 根内的打开 PHP 快照。因此新建文件尚未写入磁盘、也尚未进入项目类型目录时，仍能提供字面量 `$this->render()` 上下文。
- Provider 缺失、身份冲突、执行失败或结果无效时，核心清除相应上下文并报告能力不可用；不会静默执行另一份 Symfony Controller 扫描。
- Twig 解析、补全、格式化、导航及 Twig 侧 Rename 继续由 twig-plus 独占。

## 自动验证

- 全仓 TypeScript、ESLint、changeset、`git diff --check` 通过。
- 24 个组件共 730 项测试、独立 Symfony 扩展 3 项、根扩展 44 项通过，总计 777 项。
- Controller Provider 新增未落盘打开文档回归；Language Server 真实 stdio 同时证明：注册 Provider 时新建 Controller 返回 Provider 结果，未注册 Provider 时核心返回空上下文而不执行兼容扫描。
- Language Server 192 项完整回归通过；项目事实缓存测试证明 schema 4 不含 `controllerContexts` 并拒绝旧 schema 3。
- 四份 VSIX 内容门禁通过。VS Code 1.138.0 隔离 Profile 同时加载打包核心与 Symfony VSIX，插件生命周期、索引、诊断、崩溃恢复、导航、References、Rename、Safe Move 和 Undo/Redo 回归通过，Extension Host 退出码为 0。

## 真实 Winstar 审计

安装后的独立 Controller Provider 使用真实 Winstar 项目类型目录执行静态审计：

| 事实 | 数量 |
| --- | ---: |
| Composer 索引读取文件 | 9,999 |
| 项目类型 | 2,279 |
| Controller 上下文 | 11 |
| 唯一 Twig 模板 | 9 |
| Provider 用时 | 7.570 秒 |

结果与移除核心回退前的 11 个上下文、9 个模板一致。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-5a5f52fc/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d1d508addd0bd04a8144b8a2ca5232de149252fde6f9ac3c4457aecfb2b304d2` |
| `php-companion-symfony-0.4.5.vsix` | `971989725deb57db56554975681a4482009d2dae2ec34a34497bc8c377acaed8` |
| `php-companion-open-source-pack-0.4.5.vsix` | `0737e136419a1cef926a8a9a36ae4a731cc0884ac4a810e6d53e9f209995741c` |
| `php-companion-recommended-pack-0.4.5.vsix` | `6a24ee9b1f93d9f47ecfab10697601081dfe29a91ef9cf12c09ffee02d24c7dc` |

Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检均通过且没有失败项。核心与 Symfony 候选已覆盖安装到 WSL RockyLinux8，核心四个运行产物及 Symfony 八个运行产物与构建目录逐项一致。

| 已安装入口 | SHA-256 |
| --- | --- |
| 核心 `dist/extension.js` | `70879781df6b8a2bfaf3f1c9e2d28a904a4a46de35762d28da43e7655ff62929` |
| 核心 `dist/language-server.js` | `4ce0718bb949873e464d3aa7931991639a014f1baf22bb78de57b25be0709823` |
| Symfony `dist/controller-context-provider.js` | `9704dcee728fa7030e21572ea10460af2bb977f9e1816ede73d5a35257240f68` |
| Symfony `dist/extension.js` | `6a58964fce80b6bb4d7c5df338231643dc9bc4f10ef535e10ec4ca878c641edc` |

## 剩余边界

当前 Alpha Profile 需要 Reload Window。服务容器、事件关系和静态路由仍保留核心兼容扫描，下一阶段继续按相同原则移除。Winstar 与 CoreRepo 各两小时人工编辑验收及 Marketplace 发布尚未执行。
