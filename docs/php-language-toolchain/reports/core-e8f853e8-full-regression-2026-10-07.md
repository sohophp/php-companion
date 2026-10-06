# 当前 Core 完整 LSP 组合（D199）

## 结果：通过

固定源码提交 `e8f853e8f9ddd97df5391cfd79df1752c893e794`，Core bundle SHA-256 `6cf4d4c8892342f04cd3ee1d7bea8351b38b2754564ea8edb183c03137c6a26a`。当前生产源码包括 `a5ec1db7` 的 local native-never 快速排除及缓存恢复旧树修复；`e8f853e8` 只追加连续编辑基准和文档。本轮运行没有修改产品或放宽预算。

原进程实际退出 0，耗时 **2249.329 秒**。98 文件／1303 项，1303 通过、0 失败、0 pending、0 TODO。资格以原终态、全部断言身份及输入审计共同判定，详见 [结构化报告](core-e8f853e8-full-regression-2026-10-07.json)。

命令（`packages/language-server`）：

```sh
pnpm exec vitest run --reporter=json --outputFile=/tmp/sophp-d199-current-lsp-full.json
```

正式环境显式提供当前 reference bundle、两类计时输出目录，以及 `PHP_COMPANION_TEST_PHP_BINARIES` 的九个运行程序路径。原配置和超时保持，未过滤测试；正式性能项目仍依原配置在其它 LSP workers 完成后串行执行。

## 案例与输入

冻结收集共 98 文件／1,303 项；D175 原全部 1,294 项保留，新增九项是实际 CLI 的参数化语法案例。D175 的冻结收集只包含本文件的独立 void 检查；当时对六份 CLI 的身份审计不能当作这些动态 CLI 案例已在整轮执行。此前 D185 九版本单文件通过与本轮完整组合分别保存。

4881 份输入、Node、HEAD、工作树、收集文件及九份运行程序经原审计核对；源码、生成资产和隔离 wrapper／实际二进制均纳入输入摘要。缺失／额外案例及输入变化以 JSON 中的 audit 为准。Symfony 四份 Provider 使用 D180 正常刷新后的资产，旧 D175 全量证据不重标为当前结果。

| 目标 | 实际 CLI | ini 状态 | 本轮参数化案例 |
| --- | --- | --- | --- |
| 7.2 | 7.2.34 | ini-loaded | passed |
| 7.3 | 7.3.33 | no-ini | passed |
| 7.4 | 7.4.33 | ini-loaded | passed |
| 8.0 | 8.0.30 | no-ini | passed |
| 8.1 | 8.1.34 | ini-loaded | passed |
| 8.2 | 8.2.32 | ini-loaded | passed |
| 8.3 | 8.3.35 | no-ini | passed |
| 8.4 | 8.4.23 | ini-loaded | passed |
| 8.5 | 8.5.9 | ini-loaded | passed |

六份既有 CLI 使用正常 ini，三份独立提取的 CLI 使用 `-n`，保持既有差异。九案例覆盖原文件的 20 类语法边界及 void 正反例；不能扩展为九次完整语言服务、全部 PHP 语义或平台矩阵通过。

## 失败与跳过

无失败、跳过或 TODO 项。

D190 首次完整语义的单项 STACK_TRACE_ERROR 及 D194 基准对照前提错误仍保留在各自原报告，本轮不改写历史失败。

## 资格边界与下一步

本轮只证明当前冻结组合的完整 LSP 结果。正常 C1、连续编辑与损坏缓存恢复分别引用 [D187–D193](real-project-never-editing-2026-10-07.md) 和 [D194–D198](current-editing-recovery-2026-10-07.md)，不把不同范围计时混成整体性能资格。真实大 Controller P95 **166.28 ms > 150 ms** 继续未通过；50k 缓存内存、其它平台／模式／Remote、完整组件组合、长期使用与真人 WSL 均未由本轮关闭。

下一步在本轮终态审计后，对当前 Core 的同一真实 Controller 输入作一次 CPU 诊断，映射正文必须与正式 bundle 逐字节一致，主线程／worker 分别保存；采样计时不作为普通热门槛。原 C1–C4／R4、P0–P9／F01–F14 范围保持，Goal active。未打包、更新 Profile 或推送。

## D200–D201 后续 CPU 诊断

D200 在启动 benchmark 前发现 Winstar Composer 内容已不同于 D189，准备检查失败；原脚本、失败流及元数据摘要保留，没有 benchmark 或计时结果。Controller 源码仍是原 46,273 字节及同一摘要。D201 改为绑定当前 Composer，生产 Core 及 Controller 原文不变；这是一份新的诊断输入，不能与原 166.28 ms 作同输入性能对比。

一次 100 轮诊断退出 0，16.821 秒；原首位／共享候选断言及磁盘不变检查通过，运行前后源输入、Node、HEAD、工作树和项目 metadata 保持。精确 source map 的正文与 `6cf4d4c8` 逐字节相同。主线程 16615.76 ms、独立 worker 采样分别保留；采样时长覆盖整个进程。

主线程全部 9 个 structuredClone frame 的自身采样合计 **3149.85 ms**，其中四个主要 frame 为 3123.02 ms；这些是累计自身成本，不是单次请求延迟。parseDocument／递归 walk 的 inclusive frame 会重叠，不能累加为独立总成本。当前事实缓存已经复用树及解析事实，接下来评估一次序列化加独立反序列化读取的私有缓存原型；保持 URI／源码匹配、事实深层独立性和树所有权。原型尚未实现，没有新的普通性能资格。

D199 全量结果继续绑定其原冻结输入；本节只追加后续诊断证据，旧普通 166.28 ms 缺口与原全部范围保持。
