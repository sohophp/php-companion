# Open Source Pack：真实 vendor 与大型项目的编辑反馈

日期：2026-09-24。范围为独立临时 Composer 项目，不含业务项目。隔离 VS Code 1.139.0 Linux Extension Host 加载完整 11 项 Open Source Pack 源码 Profile，嵌套项目含 1,029 个冻结 vendor PHP 文件及 9,100 个生成 PHP 文件，共约 10,131 个 PHP 文件。默认索引模式为 `onDemand`。没有打包 VSIX。

新增可选门禁 `PHP_COMPANION_TEST_PROFILE_REAL_VENDOR=1`：在完整组合工作流后，将真实 vendor 复制进测试项目，连续 50 次未保存地切换跨文件方法的 `string/int` 返回类型。每次同时核对使用方局部 `$value` Hover 与参数类型诊断；每 10 次及末次核对 Definition 和 Signature Help。门禁记录从提交编辑到 Hover 与诊断一致的等待，以及 Definition 查询次数。

| 运行 | 编辑反馈 | Definition |
| --- | --- | --- |
| 完整 Pack，9,100 个生成文件，50 轮 | P50 110 ms，P95 119 ms，最大 388 ms；宿主退出码 0 | 六次检查的等待为 1,404/5/5/11/7/9 ms；首次需 3 次请求，其余一次 |
| 重复完整 Pack，50 轮，曾尝试收紧 Symfony 转发 | P50 108 ms，P95 125 ms，最大 402 ms；宿主退出码 0 | 六次检查的等待为 1,392/4/5/5/7/8 ms；首次需 18 次请求，其余一次 |
| 无生成文件，2 轮 | P50 96 ms，最大 341 ms；宿主退出码 0 | 第一次一次成功、6 ms；第二次需 21 次请求、1,550 ms |
| 同样约 10,131 文件的真实 stdio | 首次编辑后诊断约 87 ms、Hover 约 2.7 ms | 首次 Definition 一次成功、约 4.4 ms |

上述运行揭示的缺口已定位并修复：19 次编辑器 Definition 尝试中，Core LSP 只收到最后一次请求，4 ms 内给出正确落点。前三次空结果时 Language Client 正在重启；打开嵌套 Composer 项目后，版本探测新增 PHP 7.2 项目，原实现因版本列表变化重启整个客户端，短暂撤销了语言 Provider。收紧 Symfony Definition 转发的试验没有消除延迟，已撤销。

Core 现在向运行中的 Language Server 发送项目版本与扩展可用性更新，按受影响根刷新内建符号、引用候选和打开文件诊断；工作区文件夹拓扑变化仍走原有客户端重启路径。门禁已改为 Definition **首次请求必须命中**，不再通过重试掩盖空结果。修复后的完整 10,131 文件、50 轮 Pack 宿主连续两次退出码 0：编辑反馈 P95 分别为 132/131 ms，六次 Definition 等待分别为 9/4/4/4/5/6 ms 与 26/9/14/5/6/5 ms。独立 stdio 回归验证同一服务进程内 PHP 7.2→8.5→7.2 的 `enum` 诊断和 `str_contains` 补全往返；宿主另确认嵌套项目按 PHP 7.2 报告不支持的 `enum`。这证明该复现路径已修复；其它触发客户端重启的操作仍需各自验收。

本轮仅用源码 Profile 和本机 Extension Host。WSL Remote、Windows/macOS、长期实际操作与 R4 验收仍需独立证据。
