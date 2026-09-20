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
- TwigPlus Language Server 59 项及 VS Code adapter 63 项通过；新增回归覆盖 `path()`/`url()`、打开缓冲区覆盖磁盘、文件数上限和 WSL Remote URI 映射。

打包 VSIX、Extension Host、Winstar 实际项目和 Alpha 候选摘要将在功能提交后补充。自动测试不替代 Windows 客户端连接 WSL Remote 的人工 Apply、Undo/Redo 验收。
