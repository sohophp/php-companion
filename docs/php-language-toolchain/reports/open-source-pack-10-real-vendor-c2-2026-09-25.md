# 当前 10 项 Open Source Pack 的真实 vendor C2 门禁

日期：2026-09-25。独立 VS Code 1.139.0 Linux x64 源码 Profile；当前 10 项 Open Source Pack、Core 与 Symfony 源码，8 个冻结外部成员。夹具为独立 Composer 项目，vendor 内有 1,029 个 PHP 文件，另加 9,100 个生成噪声文件及少量项目源文件。未修改业务项目，也未打包 VSIX。

完整日常组合和真实 vendor C2 门禁退出码 0，日志 `/tmp/sophp-pack-10-real-vendor-c2-20260925.log`。Profile 实际执行项目 PHPUnit CLI，并验证 PHP 格式化、Twig/YAML/XML、调试入口及 Core/Symfony 基础工作流。大项目结果：

| 场景 | 结果 |
| --- | --- |
| 未保存的跨文件原生 `string/int` 返回切换 | 50 轮 Hover 与参数诊断逐轮一致；定义查询 6 次首次命中，等待分别为 10/4/4/4/18/11 ms；反馈一致等待 P50 110 ms、P95 128 ms、最大 1,033 ms |
| 未保存的跨文件 PHPDoc 联合数组形状切换 | 30 轮 Definition、Hover、参数诊断逐轮一致；等待 P50 157 ms、P95 200 ms、最大 475 ms |
| watcher 与运行状态 | 观察到两次文件 watcher 变化，未保存缓冲区保持优先；嵌套 Composer PHP 7.2 目标已验证；扩展宿主 RSS 采样为 221–222 MiB |

第二轮同条件复测也通过（`/tmp/sophp-pack-10-real-vendor-c2-slow-rounds-20260925.log`，退出码 0）。标量链 50 轮 P50 110 ms、P95 150 ms、最大 947 ms；新增慢轮次记录显示唯一超过 500 ms 的是**第 1 轮**。联合形状 30 轮 P50 144 ms、P95 199 ms、最大 373 ms。两轮结果支持“首次未保存编辑有较高等待、后续轮次未重复”的局部判断；第一轮旧日志没有轮次明细，不能反推其 1,033 ms 最大值也一定发生在第 1 轮。

为隔离首轮延迟，先完成两个 5 轮源码宿主。`/tmp/sophp-pack-10-first-hover-route-fixed-20260925.log` 首轮 912 ms；`/tmp/sophp-pack-10-refresh-filter-profile-20260925.log` 首轮 968 ms，均记录到首轮 68 次诊断计算。后续检查发现这两个宿主都加载根目录的旧 `dist/language-server.js`，而当时只构建了包内 `dist/server.js`；因此第二份日志**不能**作为 PHP 环境通知过滤修正后的结果。另一次同样加载旧 bundle 的调用来源探针 `/tmp/sophp-pack-10-diagnostic-origin-20260925.log` 仍记录 68 次诊断计算，且没有显示它们来自“关联文件刷新”。这些旧 bundle 日志只能作为修正前观察值。

正确重建根目录 bundle 后，带临时调用来源追踪的完整宿主 `/tmp/sophp-pack-10-diagnostic-stack-built-20260925.log` 退出码 0：首轮 624 ms、4 次诊断计算。撤掉临时追踪、再重建实际加载的 bundle 后，完整宿主 `/tmp/sophp-pack-10-refresh-filter-bundle-final-20260925.log` 退出码 0：首轮 665 ms、4 次诊断计算；后续 4 轮标量 P50 113 ms，5 轮联合形状 P50 164 ms。首次 Hover 合成命令仍有 88/559 ms 波动。两次新 bundle 宿主显示重复诊断工作显著减少，首轮等待也低于上述旧 bundle 观察值；样本量不足以给出稳定耗时门槛，仍须继续定位合成 Hover 的等待。

同一实际 bundle 继续完成 50 轮标量与 30 轮联合形状（`/tmp/sophp-pack-10-refresh-filter-bundle-50-30-20260925.log`，退出码 0）。标量逐轮正确，P50 111 ms、P95 167 ms、最大 682 ms；唯一超过 500 ms 的仍是第 1 轮，诊断就绪 107 ms，合成 Hover 命令 576 ms，服务端 Hover 约 1 ms。联合形状逐轮正确，P50 163 ms、P95 249 ms、最大 370 ms；文件 watcher 两次变化时未保存缓冲区保持优先，嵌套 Composer PHP 7.2 目标通过。首轮诊断计算仍为 4 次。扩展宿主 RSS 样本约 202–217 MiB；这不是语言服务器单独内存。

为隔离首次合成 Hover，新增只运行同一真实 vendor C2 探针的源码宿主入口，先在空外部扩展目录运行 Core＋Symfony＋Pack（`/tmp/sophp-hover-core-pack-isolation-20260925.log`），再加载 8 个外部成员（`/tmp/sophp-hover-full-pack-isolation-20260925.log`）。两次均退出码 0，日志确认前者外部成员数为 0、后者为 8；首次合成 Hover 分别为 6/10 ms，标量 5 轮最大等待分别为 115/120 ms，联合形状 5 轮最大等待分别为 129/134 ms。此对照表明“外部成员一加载就使首轮 Hover 慢约 500 ms”的假设不成立；它没有复现完整组合流程结束后的等待，因此不能证明完整组合中的等待来自哪一步，也不能据此删除 Pack 成员。

语言服务现按工作区有效 PHP 版本和扩展可用性判断通知是否改变环境；相同配置的重复通知不再刷新内建符号或重发打开文件的诊断，变化时只刷新受影响的项目。两个 stdio 回归覆盖相同通知不重复发布诊断，PHP 版本变化及扩展配置变化仍更新结果。包内构建、实际扩展 bundle 构建、定向测试、ESLint 与差异检查通过。

随后以当前 10 项源码组合连续运行 200 轮标量切换和 30 轮联合形状切换（`/tmp/sophp-pack10-current-200-20260925.log`，退出码 0）。实际加载了清单中的 8 个外部成员；日常组合先执行项目 PHPUnit CLI、PHP 格式化、Twig/YAML/XML 与调试入口。标量链逐轮核对未保存 Hover 与参数诊断，每 10 轮核对 Definition 和 Signature Help：P50 116 ms、P95 136 ms、最大 555 ms，唯一超过 500 ms 的是第 1 轮。首轮诊断就绪 107 ms，合成 Hover 命令 448 ms，服务端 Hover 最大 1 ms；这是定位宿主/客户端等待的线索，尚不能归因于某一扩展。联合形状的 Definition、Hover、诊断逐轮一致：P50 166 ms、P95 209 ms、最大 228 ms。两次 watcher 事件未覆盖未保存缓冲区；扩展宿主 RSS 七次采样均约 202 MiB，嵌套 Composer PHP 7.2 目标通过。该约两分钟的隔离宿主运行支持当前组合继续试用与推进 C1/C2，不能证明数小时持续使用、安装候选或 Remote 表现。

为分辨首次等待是否进入 Core 客户端 Hover Provider，增加仅由 `PHP_COMPANION_TEST_HOVER_TIMING=1` 启用的客户端计时，并用同一完整组合各复现一轮（`/tmp/sophp-pack10-hover-client-timing-20260925.log`、`/tmp/sophp-pack10-hover-client-timing-repeat-20260925.log`，均退出码 0）。第一轮首个编辑的诊断就绪约 615 ms，服务端诊断最大 610 ms，但随后合成 Hover 仅 6 ms、客户端 Hover 约 3 ms。复轮诊断就绪约 566 ms，服务端诊断最大 113 ms；随后合成 Hover 76 ms、客户端 Hover 72 ms、服务端 Hover 约 1 ms。两轮等待落在不同阶段，先前的 448 ms 合成 Hover 不能归因为稳定的服务端 Hover 慢路径；也不能仅凭这两轮证明某个外部成员导致等待。下一步用可控时序核对编辑、取消、关闭和 watcher 的结果一致性，再对持续复现的宿主等待定位具体调用阶段。

受控交错随后补入同一 10 项 Pack 的真实 vendor 源码宿主：测试模式暂停旧 Hover，再编辑使用方缓冲区并对源文件写盘触发 watcher，释放旧请求后断言旧联合类型没有从暂停请求或新请求回流；恢复原文本后 Definition、Hover 和诊断重新一致。隔离宿主 `/tmp/sophp-pack10-hover-edit-watcher-fixed-20260925.log` 退出码 0，记录 `pausedHoverEditWatcher: true` 和第三次 watcher 事件。先尝试的“关闭编辑器等于 `didClose`”假设未成立：VS Code 仍保留打开文档，因此没有把该失败用例计作关闭/重开证据；真正 `didClose`/`didOpen` 的受控交错仍以[stdio 门禁](c2-real-vendor-union-shape-session-2026-09-24.md)为准。该宿主用例证明了这一顺序的旧结果防护，不穷尽所有事件排列或 Remote 时序。

随后把交错用例的使用方新内容改成合法的直接整数赋值和函数实参，明确要求新的 Hover 显示 `$item: int`；此前只替换赋值而保留 `$item->common()` 的无效输入，新 Hover 为空，不适合作为正向类型反馈断言。相同 10 项源码宿主 `/tmp/sophp-pack10-hover-edit-valid-scalar-20260925.log` 退出码 0，旧联合类型未回流，新整数 Hover 出现，恢复原内容后三项反馈再次一致。此项收紧了回归的正反两面，未扩展生产语义支持域。

这是隔离宿主自动测试。扩展宿主 RSS 不是 Language Server 单独内存；首次等待仍需在安装候选和 Remote 环境核对。跨平台和持续人工使用也未验收。C3 类型生成文件的一次 Redo 缺口仍开放。
