# R44 路由补全异步返回的文档身份

日期：2026-10-02。修复已应用到当前主产品源码。未打包、提交、推送或更新 Profile。

## 实际问题与修改

独立 Provider 子进程等待期间，消费文档关闭后以同 URI、同版本号重开，路由名称／路径参数补全只检查版本而继续返回旧候选。[正式基线](c2-route-reopen-preparation-2026-10-02.md)中 PHP 7.2／8.5、三种索引模式共 12 个补全场景全部失败；同矩阵六个 Definition 已正确撤回，保留作反例。

语言服务器只修改两个补全入口：Provider await 后调用现有 `currentQueryDocument`，同时验证取消状态、当前 TextDocument 对象身份和版本，再保留外部 Symfony 能力所有权检查。不新增设置，不改变候选内容、Provider 合同或已有 Definition 流程。

隔离验证先取得修复证据，R42 原完整回归与条件补跑终止并核验输入后才修改主产品。正式构建和 bundle 后重新运行仓库脚本，不以隔离编译结果代替产品结果。

## 当前源码验证

| 检查 | 实际结果 |
| --- | --- |
| 暖态正例 → Provider 等待 → 同版本重开 → 旧结果 → 新请求 | 18/18，两 PHP 版本 × 三种索引模式 × 名称／参数／Definition；暖态正确，旧结果与新前缀不匹配时均严格为空，正式脚本退出码 0 |
| 原有相关真实 stdio | 10 通过、419 筛选跳过，总 429，50.32 秒，退出码 0；包含独立／静态路由、完整／缓存／不完整 Provider、并行服务／路由及原有未保存修改和同版本重开保护 |
| 隔离 VS Code Route Status | 退出码 0；不完整结果静默、切换另一项目状态隐藏、回到原项目恢复状态、完整重试恢复正确补全并清除状态；实际 Workbench 检查 |
| 构建／生产 bundle／定向 ESLint | 退出码 0 |
| 最终输入 | 40 项源码／dist／bundle／宿主／两个协议脚本在全部测试终止后一致 |

原始 [18 项 JSON](c2-route-reopen-completion-2026-10-02.json)。脚本 `scripts/check-route-query-reopen.mjs` 默认检查实际 `packages/language-server/dist/server.js`；可选第三参数仅用于隔离编译候选，不是产品设置。

日志 `/tmp/sophp-route-reopen-product{.log,-stdio.log,-host.log,-build.log,-lint.log,-final-inputs.log}`；冻结清单 `/tmp/sophp-route-reopen-product-inputs.sha256`。

## 全量证据边界

R44 修改前的 R42 完整 428 项与条件补跑 1 项已在同一冻结输入上合计覆盖全部 429 项，见 [R42 完整集成](c2-recovery-index-performance-2026-10-02.md)。本批随后改变两处服务器守卫，上表记录初始定向验证；其后新源码完整 429 项已通过，见末节。语义源码和事实逻辑未改，本批也没有重跑 1015 项语义或 10k 性能测量。真实 WSL、人类连续使用及其它平台继续保留独立验收。

## 复现命令

```sh
node scripts/check-route-query-reopen.mjs /tmp/sophp-route-reopen.json
PHP_COMPANION_TEST_ROUTE_STATUS_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js
```

明确失败已修复并验证，不将本批扩成新的路由功能或 Provider 自研项目。

## 当前完整集成

已指定 `PHP_COMPANION_TEST_REFERENCE_BUNDLE` 对本批正式源码执行完整 stdio 集合，日志 `/tmp/sophp-r44-full-stdio.log`。实际终态：429/429，零跳过，1345.15 秒，退出码 0；原 40 项冻结输入在终止后全部匹配。同期新增的 R45 两个重启工具输入也匹配，未改产品或本次 stdio 集合。终态日志 `/tmp/sophp-r44-full-stdio-final-inputs.log`、`/tmp/sophp-r44-full-stdio-final-restart-tools.log`。此前 R42 的 428＋1 结果保持独立记录。
