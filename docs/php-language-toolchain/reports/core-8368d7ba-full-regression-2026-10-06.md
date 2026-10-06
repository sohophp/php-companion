# D141 D140 当前组合完整 LSP 回归

## 当前状态

原完整回归已终态退出 1：89 文件／1159 项，1149 通过、10 失败，零跳过／TODO，耗时 1754.740 秒。不能标完整通过。基于提交 `8368d7ba` 加 D140 已取证的未提交源码；production bundle 为 `bc4f4f5b37f7775db9ed85aaf84f86ed94533d76f749cd47efb34e072fa28123`，缓存 schema／v71 不变。组件包重新编译和 production bundle 构建均退出 0；构建后的 bundle 哈希与 D140 定向／宿主门禁一致。

冻结 3082 个源码、编译产物、fixture、配置和运行器输入，以及六个 PHP CLI 的二进制／实际版本与 Node 二进制／版本。采集 89 文件／1159 项，逐项保留 D138 全部原 1153 项，新增 D139 项目版本两项、D140 退出／取消四项，没有移除。

第一次采集未带引用 bundle 环境变量，只得到 1158 项，遗漏原跨进程引用用例。该清单和日志保留 `.vscode-test/d141-collection-without-reference-env.*`；加入与正式运行相同的引用 bundle 配置后重新采集为完整 1159 项。不是产品删用例或最终门禁跳过。

## 固定运行

在 `packages/language-server` 执行：

```sh
PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js \
PHP_COMPANION_TEST_OUTPUT_TIMING_DIR=/tmp/sophp-d141-timings \
pnpm exec vitest run --reporter=json \
  --outputFile=/tmp/sophp-d141-current-full-lsp.json
```

启动 UTC `2026-10-06T03:44:39.695139`；真实 parent PID `3492969`、child PID `3493022`，exec session `33505`。原始运行器 `.vscode-test/d141-full-run.py`，状态 `.vscode-test/d141-run.json`，输入 `.vscode-test/d141-input.json`，输出 `/tmp/sophp-d141-current-full-lsp.log`。

终态 UTC `2026-10-06T04:13:54.433755`；原 exec session `33505` 已关闭，不重启或继续轮询。运行期间日志为空时持续核对原句柄／实际进程，观察超时没有触发重启。D140 的定向／缓存、取消和宿主门禁均在本次启动前结束，完整运行期间未修改冻结源码／构建产物，未并发重复门禁。

## 终态要求与边界

真实进程退出且结果文件存在后，执行 `.vscode-test/d141-audit.py`。3082 输入、六 CLI、Node、HEAD 与采集哈希全部保持；全部采集名称／文件与结果一致，无缺失、额外或重复。但是退出码 1 且有 10 项失败，资格审计结果为 `qualified=false`。原始产物归档 `.vscode-test/d141-evidence/`，正式结果见同名 JSON。

## 失败与定向排查

- PHPDoc 条件／输出：四项超过各自约 40 秒用例期限；JSON reporter 只保留注册处 `STACK_TRACE_ERROR`，不足以定位具体等待步骤。
- 引用准备生命周期：PHP 7.2／8.5 两项等待响应超时。
- 新退出场景：progressive 模式带等待补全的一项等待响应超时。
- 原 stdio：宽方法候选重载一项等待响应超时；未保存 workspace symbol 一项实际返回空列表，与三个预期符号不符。
- Trait 缓存：跨重启／旧缓存回退／磁盘编辑的一项等待响应超时。

上述是失败事实，原因尚未确定，不能仅凭耗时归因为机器负载或当前源码。保持同一 bundle／源码，定向选择这 10 个失败名称、增加 default reporter 以获取实际步骤消息；没有重跑完整套件。定向结果不能改写原整轮失败，也不能独立授予完整回归资格。

本轮完整资格未通过；不关闭真实 WSL、其它平台、普通编辑预算、通用取消／退出或缓存规模／内存缺口。D140 的约 11–24 ms 五根退出结果属于先前定向证据，不能覆盖本轮反例或转移为全部性能资格。没有打包、更新 Profile、提交或推送，goal 保持 active，原路线图继续。

定向复现终态：原 10 名称全部实际选中，5 通过／5 失败，658 项未选中。之后 D143 修正版本在 17 项定向检查中通过，见 [退出诊断与查询调度恢复](shutdown-query-lifecycle-recovery-2026-10-06.md)；原 D141 整轮失败保持不变，不能将 D143 定向通过改写为原整轮或当前全套绿色。
