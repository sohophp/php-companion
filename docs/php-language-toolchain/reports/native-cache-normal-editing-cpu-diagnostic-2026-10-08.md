# D489–D492：正常普通编辑失败输入的 CPU 诊断

2026-10-08。在[正常五组各五轮](native-cache-normal-ordinary-editing-five-rounds-2026-10-08.md)的实际失败之后，对 fixed-7.2 与 real-large-controller 各执行一次原 100 轮 CPU 诊断；两次正确性通过、四份主线程／worker profile 全部保留。这不是普通延迟或内存资格，也没有重复五轮门禁求绿色。详见[机器报告](native-cache-normal-editing-cpu-diagnostic-2026-10-08.json)。

| 输入 | 主线程整轮采样 ms | 全部 structuredClone frame 自身累计 ms | frame 数 |
| --- | --- | --- | --- |
| fixed-7.2 | 13834.11 | 20.15 | 2 |
| real-large-controller | 15920.00 | 2431.62 | 8 |

Controller 的 nested parser facts 复制仍有明确成本；fixed-7.2 的对应成本很小，不能用同一归因解释两组失败。这里是整个进程、全部 100 轮及启动／关闭的采样累计，不是单请求延迟；inclusive 成本重叠，不能相加。原始 profile、精确 source map、各 frame 调用祖先与 mapped self／inclusive 表分别保留，不能从采样推导可节省的毫秒或统计改善。

独立 source-map 构建正文与实际测量正常服务器逐字相同，SHA-256 520ea09b84f6f255db3b56ecea7f19848ffc782c1113f2ea2dcbc0e780cf2d04，引擎身份保持。只映射主线程同一 bundle 的 frame，worker 原始位置保留。原首位／共有候选／只读断言、100 次未保存编辑、当前版本／语料保持；只增加 profiler，不强制 GC，不启用 testMode。18720 项冻结输入、链接及两仓状态保持，实际服务器均退出；22 份原命令／输出、全部 profile、映射及审计附 SHA-256。

两个初次 mapper 调用传入相对目录，被路径守卫在解析 profile 前拒绝；随后使用原实际绝对目录成功，未重复工作负载。完整初次 stderr 只在工具流中，未另存原始文件。正常源码／构建不改变；既有完整 LSP／Linux 三流程资格和 19／25 普通编辑预算结果分别保持。

下一项审查精确调用链、剩余 nested facts 的复制所有权与按消费需求取得事实的可行性；固定大文件另查解析、更新和补全路径。此前普通图复制／序列化方案的负向证据保留，不重复等价试验、不缩减事实或放宽 150 ms。完整 C1–C4／R4、P0–P9／F01–F14 及其它平台／模式／工具／长会话／真人 WSL 继续，未更新 Profile、打包、提交、推送或发布。
