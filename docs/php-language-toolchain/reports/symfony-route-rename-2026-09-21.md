# Symfony 路由名原子 Rename 验收

日期：2026-09-21

## 结果

独立 `PHP Companion: Symfony` 扩展现在从 YAML/PHP 路由声明和精确 PHP 路由调用提供路由名 Rename。Language Server 只接受权威完整路由全集中的唯一名称，并要求唯一、可编辑且原文本完全一致的源码声明。

一次 WorkspaceEdit 包含：

- 唯一路由声明；
- 语义证明属于 Symfony `generate()`、`generateUrl()` 或 `redirectToRoute()` 的全部 PHP 字面量调用；
- TwigPlus 有界扫描返回的全部精确 `path()`/`url()` 字面量引用。

Twig 语法仍只由 TwigPlus 分析。PHP Companion 仅检测项目是否可能包含 Twig，并通过内部请求取得完整编辑集；它会再次验证每个 URI、范围和原文本。路由全集不完整、运行时路由没有源码、目标名冲突、源码范围不是完整有效名称、PHP 候选扫描不完整、TwigPlus 缺失/取消/超限/读取失败或返回无效范围时，整次 Rename 返回空结果，不生成部分编辑。

## 自动验证

- PHP Companion 全仓 26 组共 806 项测试通过；Language Server 198 项、独立 Symfony 扩展 4 项；
- TypeScript 与 ESLint 通过；
- stdio 回归覆盖运行时权威全集加静态源码、从 PHP 调用与 YAML 声明 Prepare、PHP/声明/Twig 合并、无 Twig 项目、Twig 不完整拒绝和非法名称拒绝；
- TwigPlus Language Server 60 项及 VS Code adapter 63 项通过；新增回归覆盖 `path()`/`url()`、打开缓冲区覆盖磁盘、文件数上限、符号链接不完整扫描拒绝和 WSL Remote URI 映射；
- VS Code 1.138.0 隔离 Profile 的打包宿主测试通过：核心、独立 Symfony 与本地 TwigPlus VSIX 同时加载，YAML 声明、PHP 调用和两个 Twig 引用作为一个 WorkspaceEdit 应用，一次 Undo 全部恢复；
- Winstar2024（PHP 8.5）与 CoreRepo（PHP 7.2）Alpha preflight 均通过 WSL、候选摘要、Composer 根目录和项目 PHP 包装器确定性检查。

## Alpha 候选

候选目录：`artifacts/php-companion-alpha-0.4.5-bef09212/`，源码提交 `bef0921229296ee7e2a202640c5b7bcb043e9b73`。

| 文件 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `f646ce39db4eb2a32b6418d646e73ead03a510c74428090b2d9013a7c91c3554` |
| `php-companion-symfony-0.4.5.vsix` | `5147ccff3b644308b6a5cf514f46f37f6996f3929b25f50c262ece0928ed8546` |
| `php-companion-open-source-pack-0.4.5.vsix` | `7e01c227091bfe4606aa445f67ca78b4408e49939800b59ff6f2550a21fbf6d7` |
| `php-companion-recommended-pack-0.4.5.vsix` | `b6fc25eb5ff9050b16406fbaf12c4f31e8d58e72a5e5131806ab1be8201a095d` |
| `twig-plus-1.3.7-496f514.vsix` | `0162f5151972faee4a68f57a2d49bd749d743a0f70211422eec6302a99c7ae05` |

TwigPlus 桥接代码位于提交 `901b7c0`，符号链接完整性修复位于 `496f514`。Marketplace 的同版本包在正式发布前不包含这些提交，因此当前候选明确附带本地 TwigPlus VSIX，安装说明要求覆盖 Marketplace 版本。

自动测试不替代 Windows 客户端连接 WSL Remote 的人工 Apply、Undo/Redo 和持续真实编码验收。
