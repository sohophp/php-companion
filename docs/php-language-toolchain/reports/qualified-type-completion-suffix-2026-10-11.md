# 限定原生类型补全的尾部匹配

2026-10-11。正常 Core/Symfony 语言服务器 `097605dafd2686cac767d7054f96ace6010bf0fa7b1cdeffa5c720666eaebaad` 已接入尾部匹配优化。补全时只在末尾允许的标识符字符与 namespace 分隔符内运行原有两条正则，匹配位置回加 suffix 起点；类型上下文、别名、namespace 和源位置仍使用原完整输入。

| 当前验证 | 结果 |
| --- | --- |
| 正常完整语义 | 181 文件 / 23,862 项全过，零失败、跳过、TODO；原 23,782 身份和次数保持，新增公开控制 80 项 |
| 质量门禁 | Lint、Core/Symfony strict、组件依赖、公开契约、24 组件类型与 113 根单元全部通过；Semantic 严格构建通过 |
| 普通编辑原矩阵 | 原五场景 × 五轮 × 每轮 100 查询全部正确且达标，25/25，最高 P95 144.35ms，原 150ms 预算保持 |
| 运行时身份 | 正常八份 JS/WASM 与已测私有候选逐字一致；通过该精确身份复用候选性能测量，未重复运行正常五轮；公开 Semantic 声明逐字不变 |

各轮 P95 范围如下，保留原计划顺序和全部测量：

| 原场景 | 优化前五轮范围，ms | 候选五轮范围，ms |
| --- | --- | --- |
| fixed-7.2 | 133.35–142.93 | 132.82–141.30 |
| fixed-8.5 | 130.41–139.73 | 128.25–141.63 |
| real-data-service | 97.04–130.83 | 101.40–120.42 |
| real-large-controller | 142.98–156.60 | 137.89–144.35 |
| real-blog-controller | 64.42–75.24 | 61.37–70.99 |

优化前 22/25 达标，大 Controller 第 1/2/5 轮为 156.60/155.59/153.53ms，三项失败完整保留；候选该场景五轮均通过。以上为相同固定输入、原计划的两次序列，不能推导其它机器、其它平台或所有规模都达标。

首次使用历史真实项目输入时，外部 Controller 已变动，预检拒绝且没有启动测试服务器。后续使用既有 66,079 文件、无 symlink 的固定真实项目副本：三业务源码和全部 19 外部输入保持原字节，仅业务 fixture root URI 改到副本。原脚本、五个场景、首次候选、100 查询、五轮及 150ms 门槛未变。业务项目只读，未执行业务 PHP。候选实际 25 个服务器与父进程均退出，97,663 冻结输入/185 链接及两仓终态由独立审计核对；具体计数以机器报告为准。

单次旧构建 CPU 诊断定位到 qualifiedNativeTypeCompletion 重复正则扫描，诊断 146.87ms 不替代三项性能失败。旧生产 sidecar map 与当前 bundle 不一致已拒绝使用；重新构建的独立外部 source map 与正常八份运行时逐字一致，372 个已安装源码输入核对。不可得依赖 TS 仅列出内嵌正文，未当作已安装文件验证。

新增公开控制覆盖 PHP7.2/8.5 × 两种树保留方式：相对/绝对/alias/namespace 名称、空根/空限定名、参数、返回、nullable/union/intersection、extends/implements/catch、Latin-1、注释/字符串与长前缀，并检验无代码上下文、namespace 候选与查询不修改快照。初版 catch 测试使用不继承 Throwable 的 class，旧正常构建四项断言失败；已按现有 catch 规则补上可证明继承，原失败保留，没有更改产品 catch 语义。更正后的基线 80 和隔离完整语义 23,862 均通过，再接入正常源码。

独立正常终态审计核对 30,125 输入、184 链接、两仓身份和质量/语义进程退出，并验证前两份归档 106 文件，新归档 34 文件。正常完整 LSP、六引用流程、编辑器/完整组合、其它平台/WSL Remote/真实长期以及完整性能需继续按此新运行时验证；旧 db1b1e6a 完整资格仅属于旧构建。176 编号/14 家族、26 未完成大项，原 C1–C4/R4、P0–P9/F01–F14 范围保持，未更新日常 Profile、提交、推送或发布。

[公开控制](../../../packages/semantic/test/qualified-native-type-completion.test.ts)；[机器报告](qualified-type-completion-suffix-2026-10-11.json)；[正常终态审计](../../../.vscode-test/d1977-qualified-suffix-normal-terminal-audit.json)；[普通编辑旧失败](../../../.vscode-test/d1960-current-fixed-ordinary-terminal-audit.json)；[候选矩阵](../../../.vscode-test/d1969-private-qualified-suffix-terminal-audit.json)；[正常语义](../../../.vscode-test/d1976-current-full-semantic-run.json)；[精确构建映射](../../../.vscode-test/d1962-exact-source-mapping-proof.json)；[正常归档](../../../.vscode-test/d1977-qualified-suffix-normal-evidence/manifest.json)。
