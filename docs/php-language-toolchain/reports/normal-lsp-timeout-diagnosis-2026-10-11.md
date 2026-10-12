# 正常 LSP 超时与内建符号更新诊断

2026-10-11。诊断针对正常运行时 `097605dafd2686cac767d7054f96ace6010bf0fa7b1cdeffa5c720666eaebaad`。随后签名分组优化已接入正常源码，新运行时为 `ac1147152e71b18967f9db0d05524262d0e25d79f937f0e4b57c87ea400af062`，日常 Profile 未更新。

完整 LSP 原 126 文件 / 1,530 项已终态：1,521 通过、9 失败，零跳过/TODO。原案例身份和次数、30,121 冻结输入、184 链接与两仓状态保持，自有进程均退出；独立终态审计与 188 文件归档完成。五项 PHPDoc 与一项静态 require 用例报响应超时，三项内建符号索引用例记录 `STACK_TRACE_ERROR`，持续时间超过原 20 秒测试门槛；后三项的错误正文不足以独立确认超时根因。完整门禁未通过，后续编辑器组合、真实编辑器短控制与两小时会话均没有启动。

一次定向诊断保留五个原文件、九个原失败身份和原 10/20 秒门槛及文件并行设置，九项全部通过。父测试进程观测实际请求/响应，服务器运行时和两 WASM 未插桩，六个实际服务器记录完整：五个正常生产 bundle、一个原 unbundled server；初始化为 1,841–2,496ms，后续查询最高 124ms。原单项测试使用 SIGTERM 清理其服务器，其余五个协议 shutdown 后退出 0。定向结果不替代完整失败；本次无法复现，不证明产品修复或资源竞争根因。

原诊断 runner 把 Vitest `pending` 当作唯一排除状态，实际报告被筛掉的 702 项为 `skipped`，因此首次计数门禁为 false。独立审计只计实际 passed/failed，核对九个身份、原始报告哈希和全部冻结输入后确认诊断证据；没有重复执行获取绿灯，原 runner 结果保留。

另一次有插桩的三项原索引诊断全部通过，实际正常 Semantic 方法阶段与 Node CPU profile 保留。12 次内建文档 update 共 18,864.79ms，Definition 共约 53ms、Signature 约 9ms，`qualifiedNativeTypeCompletion` 调用零次。该诊断受观测开销影响，只证明本次路径主要耗在内建文档更新，不能证明原完整失败原因，也不是热查询性能验收。CPU 位置仅记录原始 VM frame，未冒充映射后的源码行号。

按类生成语义签名时，成员列表原来为每个类重复筛选。隔离候选只为 callable/property/constant/generic-parent/mixin/magic-member 预先按所属类分组，保留大小写规则、原列表顺序、原 JSON 字段与模板筛选，不增加持久缓存或更改 schema。九个 PHP 版本、三个禁用扩展组合与交错成员输入共 13 组、各三轮，签名 Map 顺序和全部字符串逐字一致；PHP8.5 原阶段三轮 152.77/160.18/155.63ms，候选 13.46/12.63/13.75ms。这是单个内部阶段的测量，不能推导完整初始化或全量测试耗时改善。隔离完整语义 181 文件 / 23,862 项为 23,860 通过、2 失败：两项 Generator 首个用例持续约 5.13/5.08 秒并记录 `STACK_TRACE_ERROR`，根因未证明，首轮失败保留。随后将相同分组逻辑接入正常 TS，严格编译与语义归一化证明编译代码仅存在格式/括号差异，私有观测 export 没有进入正常模块。正常源码路径的完整语义 181 文件 / 23,862 项全部通过，原全部身份/次数保持，零失败/跳过/TODO；既有七项质量门禁、24 组件类型和 113 根单元通过，公开声明与 cache schema 不变。正常终态核对 30,134 冻结输入、619 定向输入、184 链接、两仓与自有进程，验证前三份归档 491 文件，新归档 44 文件。正常通过不证明隔离失败的原因，也没有重跑隔离整轮替换首轮结果。

原 176 编号 / 14 家族与 26 未完成大项保持；新运行时完整 LSP、六引用流程、编辑器/组合、完整性能、平台、Remote、真实长期及 C1–C4/R4、P0–P9/F01–F14 继续。未打包、提交、推送或发布。

[完整 LSP 终态审计](../../../.vscode-test/d1983-current-full-lsp-terminal-audit.json)；[九项请求阶段审计](../../../.vscode-test/d2005-failed-lsp-diagnostic-terminal-audit.json)；[内建更新阶段审计](../../../.vscode-test/d2009-builtin-profile-terminal-audit.json)；[签名分组隔离对照](../../../.vscode-test/d2008-surface-grouping/result.json)；[候选完整语义运行](../../../.vscode-test/d2011-surface-candidate-semantic-run.json)；[候选失败终态](../../../.vscode-test/d2012-surface-candidate-terminal-audit.json)；[正常终态审计](../../../.vscode-test/d2016-surface-normal-terminal-audit.json)；[正常完整语义](../../../.vscode-test/d2015-current-full-semantic-run.json)。
