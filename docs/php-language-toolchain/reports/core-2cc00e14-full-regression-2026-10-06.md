# D138：当前固定产品完整 LSP 回归

## 终态

一次完整运行终态退出 0：87 文件／1153 项全部通过，零失败、跳过及 TODO，耗时 1714.878 秒（约 28.6 分钟）。绑定提交 `2cc00e14`、语言服务器 bundle `2a3ff3766f3ae9d0ca998b7ec27f5ed5cec0770215001393cc401b74e5158a84`／v71。源码依赖重新编译和 production bundle 构建均退出 0；启动时工作区干净。

正式采集 87 文件／1153 项。与 D134 的采集名称逐项比较，保留全部原 1097 项，新增 D135 原生条件的 56 项，没有移除。记录 3078 个源码／编译产物／测试／配置输入的 SHA256，以及六个已有 PHP CLI 的二进制和运行版本、Node 二进制和版本、采集清单哈希。

命令在 `packages/language-server` 执行：

```sh
PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js \
PHP_COMPANION_TEST_OUTPUT_TIMING_DIR=/tmp/sophp-d138-timings \
pnpm exec vitest run --reporter=json \
  --outputFile=/tmp/sophp-d138-current-full-lsp.json
```

计时目录在启动前创建，显式启用原跨进程引用用例，不关闭已有热查询检查。完整回归运行时不修改冻结输入；证据文档不在冻结源码范围内。

## 可追踪运行

- 原始输入与采集差异：`.vscode-test/d138-input.json`。
- 包编译／bundle 日志：`/tmp/sophp-d138-build-packages.log`、`/tmp/sophp-d138-build-bundle.log`。
- 原始采集：`/tmp/sophp-d138-collection.json`。
- 运行器与状态：`.vscode-test/d138-full-run.py`、`.vscode-test/d138-run.json`。
- 原始输出：`/tmp/sophp-d138-current-full-lsp.log`。
- 启动时真实进程：parent PID `3429966`、child PID `3430099`；exec session `63771`。后续必须核对同一实际句柄或进程终态，空日志和观察超时不能成为重复启动的理由。

终态核对确认：完整 1153 项名称及 87 文件与采集一致，无缺失、额外或重复；3078 输入、六 CLI、Node、HEAD 及采集哈希均保持。原始输入、采集、结果、日志、计时与运行器已归档 `.vscode-test/d138-evidence/`，结构化核对见同名 JSON。

终态核对工具 `.vscode-test/d138-audit.py` 已准备并通过 Python 语法检查。它要求原运行器明确记录退出状态及结果文件，再检查退出码、全部用例名称、文件数量、失败／跳过／TODO、重复与缺失，以及输入、六 CLI、Node、HEAD 和采集清单；有不一致就不授予资格。工具会将原始输入／采集／结果／日志／计时及运行器归档到 `.vscode-test/d138-evidence/`。原句柄 session `63771` 已终态退出 0；实际执行终态核对工具退出 0，资格检查通过。该证据只绑定冻结的 `2cc00e14`／v71，不转移为后续修改或真实 WSL 验收。

本批不打包、更新 Profile 或推送；随下一次必要源码里程碑集中收口证据。原 C1–C4、普通编辑性能、缓存规模、其它版本／平台及真实 WSL 多小时使用仍开放；goal 保持 active。

## 运行期间的独立受控复现

源码审查发现，删除 Workspace 根目录自身的 Composer 文件后，`ensureForUri` 的无根路径会返回旧目录缓存。当前产品受控探测从 Composer 8.1 删除后仍得到 8.1，而无 Composer 冷启动对照得到 CLI 8.5；恢复 Composer 后才更新。Composer 查找和 CLI 解析由 mock 控制，不冒称真实 CLI 或 WSL 验收。

仅在 `.vscode-test/d139-parent-composer/` 中保存了原源码副本、修复提案和测试；没有修改 D138 的源码、依赖或 bundle。相同 16 项测试在原源码副本为 14 通过／2 失败，在提案副本全部通过。两新增场景覆盖根删除／恢复，以及父根删除时独立嵌套探测保持；正式 14 项交错也保留。无 Composer 状态按自己的根代次解析，避免通过整个目录 refresh 清除独立嵌套项目。证据、输入哈希及 `proposal.patch` 见该临时目录的 `evidence.json`。

该修复尚未接入产品。已取得并核对 D138 终态，接下来正式接入、跑根门禁及对应自动模式宿主，不能把临时副本通过当作正式源码或 UI 资格。受控探测及两次私有 Vitest 在完整回归进程仍存活时运行；完整回归性能结果要保留这个并发活动背景。检查后 D138 的 3078 个冻结输入仍无变化。

随后审查补上启动时无 Composer、再新建 Composer 的同族路径。原提案只在已有根上监听，新增场景为 16／17 通过、1 失败；将根目录监听同时注册于无 Composer 状态后，私有 17 项全部通过。监听仍只包含根目录的 `composer.json`／`composer.lock`，没有扩展为全目录扫描。最初 16 项的输入按原哈希另存 `prototype16/evidence.json`，创建路径的失败／通过及当前提案哈希见 `creation-evidence.json`；不覆盖原失败或将 17 项算入正式产品门禁。两次创建路径私有测试同样与本轮完整回归并发，冻结输入再次核对无变化。

后续状态：D139 已正式接入根生命周期修复，并处理宿主中发现的重叠重启／2 秒停止超时，正式 113 项根单测、两种模式的根版本协议和 Linux 完整 C1 通过，见[根 Composer 与重启报告](workspace-root-composer-restart-2026-10-06.md)。上面的“尚未接入产品”描述保留 D138 当时的时间顺序；D139 的新输入不算入本报告的 3078 个冻结输入，语言服务器 bundle 保持相同。

## 性能记录范围

- onDemand：20 个未改文档热查询，P95 5.60 ms，首次 107.05 ms。
- progressive：20 个未改文档热查询，P95 6.05 ms，首次 112.72 ms。

原三文件输出补全控制及完整套件内已有预算通过；不外推为普通持续编辑、可见弹窗等待或大型项目性能资格。运行初期的私有版本协调受控任务与本轮并发，背景记录保持。
