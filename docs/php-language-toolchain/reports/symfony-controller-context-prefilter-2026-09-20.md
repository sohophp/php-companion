# Symfony Controller 上下文触发收窄

日期：2026-09-20

## 问题

真实 WSL Alpha 日志显示，2,265 个项目 PHP 文件的全索引在 71.348 秒后正常结束；用户看到的持续忙碌还包含索引完成后的框架刷新。此前每次打开或修改 PHP 文档，只要语义快照发生变化，Language Server 都会启动独立 Symfony Controller 上下文 Provider。普通实体、服务和测试文件即使不含 `render()`，也会承担一次外部进程启动和请求编排。

## 修改

- 局部 Controller 上下文请求先按独立 Provider 已有的保守条件检查源码是否包含 `render`。
- 全部局部快照均不符合条件时，不启动 Provider 进程。
- 文件由含 `render()` 改为不含时，立即删除该 URI 的旧上下文。
- 请求 revision 仍在预筛选前递增，因此更早启动的全量或局部 Provider 结果不能恢复已删除的上下文。
- watcher 同批次内同时包含符合与不符合条件的文件时，只把符合条件的快照和项目类型交给 Provider，并清理其余文件的旧上下文。

该条件与 `@php-companion/provider-symfony-controller-contexts` 的现有预筛选完全一致；实际语法判断仍由框架分析器完成，没有扩大或缩小已支持的 Controller 语义。

## 验证

- `pnpm --filter @php-companion/language-server build`
- `pnpm --filter @php-companion/language-server test`：5 个测试文件、198 项通过。
- 新增 stdio 回归先从独立 Provider 取得 `page.html.twig` 上下文，再打开删除 `render()` 的同一文档；结果上下文为空，Provider 调用次数不增加。
- `pnpm typecheck`
- `pnpm lint`
- `git diff --check`

## 剩余边界

含有字符串或注释文本 `render` 的文件仍可能进入 Provider；Provider 会继续通过 PHP AST 拒绝不匹配的调用。这是有意保留的低成本保守边界，避免在核心中复制 Symfony Controller 语法判断。实际 Alpha Profile 仍需安装包含本修改的候选并完成连续编辑验收。
