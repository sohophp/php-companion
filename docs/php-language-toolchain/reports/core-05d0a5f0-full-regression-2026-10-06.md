# D122 当前组合完整 LSP 与三版本自然输入

日期：2026-10-06；产品源码 `05d0a5f0`，当前 bundle SHA-256 `64793c2152b39eeb152883af8c06218fd1695adb3beee395274ef9676d7aba12`，缓存 schema 88／源码声明 6／engine v67。[结构化证据](core-05d0a5f0-full-regression-2026-10-06.json)保留原失败、逐项结果、正式 UI 证明、资产摘要及本次 runner／审计源码。

## 完整当前 LSP 终态

原进程退出 0，**82 文件／981 项全部通过，零失败、跳过和 TODO**，stdout 耗时 1748.75 秒。采集与结果中的文件、名称及重复数量完全相同；3060 项源码／测试／构建输入在整轮结束时保持，六个实际 PHP CLI 二进制摘要保持。没有修改产品、并发、原超时、断言或性能门槛，没有重跑失败用例来拼接绿色。

命令为 `pnpm --filter @php-companion/language-server exec vitest run`，明确配置 PHP 7.2.34／7.4.33／8.1.34／8.2.32／8.4.23／8.5.9 六个真实 CLI，reference 测试使用当前根 bundle。原句柄 45092 已取得终态，主协议文件的 531 项与最后性能文件均包含在这次结果中。

本轮默认 ini 下的原语法七项通过，共 140 次实际 CLI 编译／诊断对照。D117 的四项 ETIMEDOUT 原失败保留；此前原因未证实，不能将本轮不再出现超时归因为已修复 SoPHP 或某个扩展。默认 `-l` 同一语法样例也在 65.13–116.42 ms 内结束。初始 `-n` 的 PHP 8.2／8.4 模块探针打印 Startup Warning，不证明 Redis 加载成功；本批没有更改全局 ini，也没有 `PHP_INI_SCAN_DIR` 隔离。

## 当前跨进程与固定文档性能

完整原进程的 32 次 reference 缓存启动／源码变化拒绝检查全部通过，实际耗时数组保留。原四组固定文档热 P95 为：

| 场景／PHP 目标 | P95（ms） |
| --- | ---: |
| 1500 注释魔术声明／7.2 | 8.23 |
| 1500 注释魔术声明／8.5 | 8.35 |
| 注释赋值与无关未完成声明／7.2 | 61.51 |
| 注释赋值与无关未完成声明／8.5 | 52.67 |

它们通过原 150 ms 热门槛，不替代 D100 普通连续编辑的 155.06 ms 历史缺口，也不证明缓存 RSS、50k 完整服务或可见启动等待。

## 三版本自然输入

原自然输入流程以 PHP 8.5 的 enum 正例编写。本批在现有 suite 和正式工具中增加资源 PHP 版本与启动目标一致性检查，保留全部流程、名称过滤、接受文本、光标和磁盘断言。PHP 7.2／7.3／7.4／8.0 的 enum 前缀改为禁止 `enum` 与 `enum_exists`；该反例稳定观察至少 500 ms。实际运行的锚点为 7.2／8.1／8.5，两种默认索引模式。

最初隔离候选错误地要求 PHP 7.2 的整个弹窗隐藏。两模式均失败于合法的 `intltz_create_enumeration` 等表达式匹配，禁止的 enum 项实际不存在。原帧／源码／退出状态保留；纠正的是新测试的要求，没有为了空列表去过滤合法函数。初始 PHP 8.1／8.5 四组通过单独记录；最终再用保留的正式工具和 suite 跑六组，全部通过。产品 bundle 保持不变，只有两个验收输入在完整 LSP 结束后改变，不把新 UI 测试源码冒充为原完整 LSP 的冻结输入。

复现命令：`SOPHP_AUTOMATIC_COMPLETION=1 SOPHP_AUTOMATIC_INDEXING_MODE=<onDemand|progressive> SOPHP_VISIBLE_PHP_VERSION=<7.2|8.1|8.5> SOPHP_ROOT_IMPORT_FLOW=1 SOPHP_LIVE_TYPE_FLOW=1 SOPHP_NAMESPACE_IMPORT_FLOW=1 node scripts/check-comparison-condition-acceptance.mjs <report.json>`。

Linux VS Code 1.140.0，每组 12 条普通逐字符输入流程，包括 function／class／enum 关键字到名称、public／构造方法、类型前缀替换／恢复、实参类型排序、根导入、未保存 class↔interface、四种 namespace 导入及别名撤回。没有 Provider 预热或显式 triggerSuggest。

| PHP 目标／模式 | 流程 | 列表观察 | 精确接受／光标 | 可见观察等待（ms） | 指定 renderer 异常 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 7.2/onDemand | 12 | 39 | 11 | 16–563 | 0 |
| 7.2/progressive | 12 | 39 | 11 | 14–542 | 0 |
| 8.1/onDemand | 12 | 39 | 11 | 12–551 | 0 |
| 8.1/progressive | 12 | 39 | 11 | 12–382 | 0 |
| 8.5/onDemand | 12 | 39 | 11 | 10–376 | 0 |
| 8.5/progressive | 12 | 39 | 11 | 13–329 | 0 |

合计 **72 流程、234 次列表观察、66 次精确文本及光标接受**，包括每组九次声明／别名／接口的空列表撤回；磁盘保持。PHP 7.2 的不支持 enum 还允许合法匹配列表，500 ms 用于稳定观察，不记为纯请求延迟。表中等待从最后按键后的观察开始，包含已显示列表，不是激活到首个可见结果或后端 P95；指定 `getItemsByProvider` renderer 异常为零，不宣称所有 UI 异常类别均已审计。自然输入流程没有新增 Undo/Redo 断言；D121 的 24 次接受／UndoRedo 独立证据保持绑定同一产品。

保留的两个验收文件已通过 ESLint、根 TypeScript `--noEmit`、Node 语法与 diff 检查；未重建或更改产品资产。

## 收口与继续范围

本次达到必要本地验收里程碑，整理两项验收源码和对应报告；当前完整 LSP 资格绑定产品 `05d0a5f0`，测试工具改动没有改变编译产品。D120 的首次协议计时仍绑定旧 bundle，不转移成当前 UI 启动资格。

原 C1–C4 范围保留，不能由本批 12 流程关闭原 60 场景及全部追加场景的逐项资格。普通连续编辑、当前 schema 88 的规模／缓存内存、其它 PHP 版本与平台、长会话和真实 WSL 使用仍开放。下一项回到独立 C4 缺口；不重复同一完整运行来挑选绿色，也不再围绕已纠正的 enum 断言重试。goal active，没有打包、更新 Profile、推送或发布。
