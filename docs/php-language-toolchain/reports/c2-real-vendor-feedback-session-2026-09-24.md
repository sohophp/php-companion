# C2 真实 Composer vendor 与 10k 项目的连续反馈

日期：2026-09-24。先按锁文件在 `test/extension/real-vendor` 安装依赖，再运行 `pnpm benchmark:c2:real-vendor-feedback -- 500 9100`；本轮已构建源码，直接执行同一脚本 `node scripts/benchmark-c2-real-vendor-feedback.mjs 500 9100`。脚本复制仓库锁定的独立 Composer fixture（vendor 中 1,029 个 PHP 文件）到临时目录，在 `src/Noise/` 生成 9,100 个无关 PHP 文件，并加入声明和使用方两个文件，合计 **10,131 个 PHP 文件**。默认 `onDemand`、显式 PHP 8.5、真实 Language Server stdio；没有修改业务项目或原始 fixture，没有打包 VSIX。

使用方把跨文件 `Service::text()` 的原生标量返回赋给局部 `$value`，跨一行注释传给 `accept(int $value)`。脚本先以测试模式暂停一个旧 Hover 请求，发送 LSP 取消，同时把源返回从 `string` 改成 `int`；取消的旧请求返回 `null`，新 Hover 显示 `int`，参数类型诊断撤销。随后在同一个未保存声明缓冲区进行 500 轮 `string/int` 切换。每轮等待使用方诊断与当前源类型匹配，再请求局部 `$value` Hover 并核对类型；500 轮均通过，使用方始终不编辑。

| 本机 500 轮样本 | 中位数 | P95 | 最大值 |
| --- | ---: | ---: | ---: |
| 源编辑通知到匹配的使用方诊断 | 87.2 ms | 91.4 ms | 103.7 ms |
| 诊断匹配后的 Hover 请求 | 2.69 ms | 3.33 ms | 4.23 ms |

循环耗时约 44.9 秒。Linux Language Server RSS 从循环前的 143.9 MiB 起，前 75 轮升到约 157 MiB；之后每 25 轮采样多数在 156–158 MiB，单次峰值 163.2 MiB，末值 157.0 MiB。此轮未观察到后半段持续增长。原始输出为 `/tmp/sophp-c2-real-vendor-feedback-500.json`；脚本也以 2 轮、无噪声项目先验证了取消与结果链。相关脚本通过 Node 语法检查、ESLint 和差异检查。

这些是同机 stdio 样本，不包含 VS Code Extension Host、语言客户端、Workbench 浮层绘制或真实键入。连续编辑约 45 秒，不能替代数小时使用、跨平台、Remote 或完整 Pack 的大项目验收；500 轮检查的是每轮匹配点，并未证明任何时刻都不存在短暂的旧诊断显示。下一步在隔离宿主的较大项目中复核可见等待和取消，再检查数组、联合类型的跨能力反馈。
