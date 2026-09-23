# C1 PHP Provider 所有权与等待分层

日期：2026-09-24。检查本地 VS Code 1.139.0 的内建 PHP Language Features manifest 与实现：`php.suggest.basic` 默认 `true`，内建扩展注册 PHP Completion、Hover、Signature Help Provider，三者的提供逻辑均受该设置控制。SoPHP Core 也提供这三项。为使默认组合只有一个通用 PHP 提示所有者，Core 与 Open Source Pack 的 `configurationDefaults` 都设为 `"php.suggest.basic": false`；用户显式设置仍可覆盖。此改动不关闭 VS Code 的 `php.validate.enable`。

隔离 Core Extension Host 在没有工作区显式 `php.suggest.basic` 的条件下读取到 `false`，`abs` 内建函数只有一个补全候选；六项编辑请求和未保存 Definition 均通过，退出码 0。Pack manifest 对齐测试 4/4 通过；本轮没有生成 VSIX，也没有完整 Pack 安装证据。

同一宿主用测试模式计时服务器 Completion/Hover handler，并通过公开的 SoPHP API v1 请求桥取回样本。两次运行各有 12 次 VS Code 命令和 12 条相应服务器记录：

| 运行 | Completion 命令中位/最大 | Completion 服务器中位/最大 | Hover 命令中位/最大 | Hover 服务器中位/最大 | Language Client 轻量往返中位/最大 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 内建提示默认开启 | 49/134 ms | 1/3 ms | 5/23 ms | 0/1 ms | 1/1 ms |
| Core 默认关闭内建提示 | 49/248 ms | 1/4 ms | 27/54 ms | 0/1 ms | 1/1 ms |

测试中曾用工作区设置临时关闭内建提示，六项请求也通过，但 Completion/Hover 仍有等待波动；因此不能把默认设置调整写成性能修复。端到端命令时间包括 VS Code 调度、Provider 汇总与语言客户端通信，服务器 handler 计时只覆盖请求处理；上述数据说明这组较长的命令等待没有出现在对应服务器 handler，也没有出现在轻量请求往返，不能单靠它归因于某个 VS Code 内部阶段。12 次顺序小样本不是长期 P95，也不能代替实际键入到建议列表显示的 UI 测量。
