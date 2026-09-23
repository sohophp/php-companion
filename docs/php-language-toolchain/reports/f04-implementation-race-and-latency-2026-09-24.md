# C1 进行中 Implementation 与隔离宿主等待采样

日期：2026-09-24。F04-NAV-11 在独立 Composer 项目写入接口、真实实现类和 1,000 个 PHP 类，启动 `onDemand` 的真实 stdio Language Server。测试发起接口方法的 Implementation 请求，等到服务器发出候选扫描开始日志，确认旧请求尚未完成，然后对已打开文档发送未保存的 `render` → `output` 编辑；没有主动取消旧请求。旧请求返回 `ContentModified` 或空结果，随后新版本 Definition 精确指向 `output` 声明。此证据覆盖 Implementation 的候选扫描路径，不能代替 Completion、Hover、Signature Help 和 Definition 的进行中时序验收。

隔离 VS Code 1.139.0 Linux x64 Core Extension Host 在同一独立 Composer 工作流中完成六项查询和未保存编辑后的 Definition，两次均退出码 0。每次先执行完整编码链，再对六类查询各做 12 次顺序热态调用并逐次检查结果。首次补全单次观测分别为 215、207 ms。以下是当时日志的第 6 个排序样本与最大值，单位 ms：

| 查询 | 第一次：第 6 个 / 最大 | 第二次：第 6 个 / 最大 |
| --- | ---: | ---: |
| Completion | 42 / 224 | 44 / 207 |
| Hover | 6 / 73 | 12 / 127 |
| Signature Help | 4 / 5 | 4 / 4 |
| Definition | 4 / 5 | 4 / 5 |
| Implementation | 4 / 7 | 4 / 5 |
| References | 9 / 85 | 7 / 71 |

这些是 VS Code 命令端到端时间，包含客户端/宿主开销；12 个顺序样本和两次宿主运行不足以推断长期 P95，也不能归因于某个 Language Server 阶段。Completion 与 Hover 的最大值高于中间样本，后续应在不扩大功能范围的前提下定位命令、Provider 与服务器各自耗时。未打包 VSIX，未安装完整 Open Source Pack，也未修改业务项目。
