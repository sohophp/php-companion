# 独立 Symfony Controller 上下文迁移证据

日期：2026-09-20

功能提交：`17faf4d3bdc563ea9d797beb4178c563b1daf8d1`

## 交付边界

- 新增可独立发布的 `@php-companion/provider-symfony-controller-contexts`，由 `sohophp.php-companion-symfony` 打包为 `dist/controller-context-provider.js` 并通过核心 plugin API 注册。
- Provider 静态读取有界 Composer 项目 PHP 源码及打开文档快照，输出字面量 `$this->render()` 的模板、变量序列化类型和精确 PHP 来源位置；不启动 Symfony Kernel、不执行项目 PHP、不加载项目 autoloader。
- Twig 解析、补全、导航、格式化和跨语言 Rename 继续由 twig-plus 独占实现；Symfony Provider 只通过既有 interop 协议提供 PHP Controller 上下文。
- semantic-provider schema 1 新增 `controllerContexts` 与 `replacesControllerContexts` 单一权威所有权；interop 导出有界运行时验证器。核心只接受来自项目类型 URI 且范围不越过对应源码的完整贡献。
- 完整项目成功快照替换核心上下文；打开 PHP 文档只刷新该文件。新建文件尚未进入完成的 Composer URI 集时直接使用核心精确分析，避免把空类型目录误解释为无上下文。Provider 失败、超时、协议无效、输入越界或结果不完整时也回退核心实现。
- 项目源码最多 10,000 个文件、单文件最多 1,000,000 字符、合计最多 128 MiB；打开文档沿用 128 份和 8 Mi 字符总预算。

## 恢复性能修正

打包 Extension Host 会主动令语言服务器以退出码 70 崩溃并验证自动恢复。重启后 74 个已经打开的文档原先串行重发诊断；加入第三个 Symfony semantic Provider 后，该队列跨过动态属性诊断的 5 秒门禁。索引根完成时的只读文档诊断现使用并发发布，保留原 5 秒门禁且完整打包宿主回归通过。PHP 文档不含 `render` 时不会启动 Controller Provider 子进程。

## 自动验证

- 全仓 TypeScript、ESLint、`git diff --check` 和完整 `pnpm test` 通过。
- 24 个核心组件共 729 项测试通过；其中 semantic 269 项、Language Server 192 项、`provider-symfony-controller-contexts` 1 项。独立 Symfony 扩展 2 项、根扩展 44 项通过，总计 775 项。
- Language Server 真实 stdio 回归证明权威 Provider 可覆盖核心模板结果，打开文档快照会只刷新对应上下文；新建未索引 Controller 则使用核心精确回退。
- 24 个组件 tarball 在仓库外空白消费者中完成安装、导入和 smoke；输出确认实际验证数量为 24。
- 四份 VSIX 内容门禁通过；Symfony VSIX 含 services、events、controller contexts、static routes、Winstar routes 五个 Provider、扩展入口和两份 Tree-sitter WASM。
- VS Code 1.138.0 隔离 Profile 同时加载打包后的核心与 Symfony VSIX，完整索引、诊断、进程崩溃恢复、导航、References、Rename、Safe Move 和 Undo/Redo 回归通过，Extension Host 退出码为 0。

## 真实 Winstar 审计

安装后的 Controller 上下文 Provider 对 Winstar 执行完整静态审计：

| 事实 | 数量 |
| --- | ---: |
| 索引项目文件 | 2,265 |
| 项目类型 | 2,279 |
| Controller 上下文 | 11 |
| 唯一 Twig 模板 | 9 |

安装目录中的 `controller-context-provider.js` SHA-256 为 `f6c3769f1cf68da2759556ec8db7232a67900c59ff06e7ccc79178a1bc8988c1`，Provider 阶段用时 6.794 秒，项目源码集合完整。源码构建的前置审计为 5.301 秒，并返回相同的 11 个上下文和 9 个模板。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-17faf4d3/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `b61c2b67d7fd1fd6099a2e108e6d9b8193d504fc79298e4bc13e252862ac0aad` |
| `php-companion-symfony-0.4.5.vsix` | `c38300ebf9d450b6fc7f975a46f143cad2e1c8b33f90fed62e31e69d6e1f4463` |
| `php-companion-open-source-pack-0.4.5.vsix` | `7f79a251c0cfec1cd56230f3780431b39224bbc36bba4890a61e341a43c76e6f` |
| `php-companion-recommended-pack-0.4.5.vsix` | `ad6b04f5ef7a0a638899750d147289c198c78885d96d7ede12f000201eb3f743` |

Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性预检均通过且没有失败项。核心与 Symfony 候选已覆盖安装到 WSL RockyLinux8；构建和安装目录中的核心入口、Language Server、Symfony 入口、五个 Provider 与两份 WASM 摘要逐项一致。

## 剩余边界

实际 Alpha Profile 仍需执行 Reload Window。独立扩展升级、卸载、缺失和 plugin API 不兼容门禁，以及全部迁移完成后移除核心 Symfony 兼容回退仍待完成。Marketplace 发布与 Winstar/CoreRepo 各两小时人工编辑验收尚未执行。
