# D336–D342：当前 Core 的完整 C2 与 Windows 启动限制

2026-10-07，正常 Core `f026f9cd`，产品源码／构建不变。详见[机器报告](core-f026f9cd-c2-platform-check-2026-10-07.json)。

Linux 原完整 Core-only C2 **通过**，125.59 秒退出 0。运行前在独立目录正常 TypeScript 编译全部编辑器测试，13.30 秒退出 0，83 个 JS 输出与实际执行的 dist-test 逐项相同；不是 83 个测试案例。原 C2_ONLY 选择完整 C2，没有 C2 子集、Pack 或其它 C1／C3 开关，默认 PHP 8.5／onDemand 及原版本专门子步骤保持。完整原流程覆盖诊断／签名、未保存刷新、双路径十轮、Composer／跨文件／关闭重开、数组／泛型／回调／条件排序及末尾 key／prefix 全部检查；原宿主和包装进程均自然退出 0。各轮源码／构建、两仓、实际 Node／九份 CLI 冻结与终态核验零漂移。日志和最终选择参数分别归档。

Linux 配置路径为已有 VS Code 1.140.0，运行后 package 元数据一致；本轮没有独立预先冻结该 Linux 编辑器二进制 SHA，故不扩大为严格安装身份资格。原 Linux C2 未额外加入末尾生命周期零值 observer，不能借用 Windows 包装器的计划断言。双路径十轮 Hover P95 13 ms 只是该专项，不能替代原普通编辑 150 ms 门槛。完整功能通过不等于真人或全部 C2／R4 完成。

Windows 首次准备因安装目录同时有 1.140.0 与待更新的 1.141.0 而拒绝，在执行测试前退出；原脚本／失败／已建立的独立目录均保留。读取当前 bin/code.cmd 明确指向 07f806f999，Code.exe FileVersion／ProductVersion 均为 1.140.0，随后准备 21 Core 资源和 83 baseline 输入，逐项与当前产品一致。

唯一 Windows 启动尝试仍 **未执行 C2**：原生 Node v24.16.0 启动 Code.exe 后，`vscode-updating` 锁约 30 秒未释放，编辑器明确输出正在更新并退出 1。原生驱动 32.19 秒、含完整冻结及归档外层 44.15 秒；没有 editor runtime proof 或 C2 acceptance proof。原复制品、启动器、Windows Node／Code 身份、源码及工作树均保持，宿主日志已归档；这属于启动环境限制，不是已证明的产品功能失败，也不能算 Windows 通过。没有停止更新进程、修改安装或绕过更新锁，也不重复等价启动。

正常 10k **920.54／768 MiB**、普通编辑 **157.74／150 ms** 的失败保持；共享原型私有 899.88／768 MiB 未通过且[不接入](shared-prototype-private-trial-2026-10-07.md)。当前完整 LSP 1321／1321 见[独立资格](core-f026f9cd-full-regression-2026-10-07.md)。下一独立项为当前正常构建与 Symfony 的 Linux 默认模式完整 C3；Windows 在更新结束后重新冻结实际安装再补验。原全部 C1–C4／R4、P0–P9／F01–F14、50k／高级能力／其它版本平台／完整组合／长期／真人保持；没有打包、安装、提交、推送或发布。
