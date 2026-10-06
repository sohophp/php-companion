# D134：D133 固定产品完整 LSP 回归

## 终态

一次完整运行：86 文件／1097 项全部通过，零失败、跳过及 TODO，耗时 **1721.829 秒**。不是定向补测的拼接结果。

资格绑定 D133 提交 `07c25c752dbbaddbfa62ef8fcb4d7b6e1d993bea`、bundle `b02c7df097b54340f5f2e26985617a4c0d8696aa008d0c1a0f814dcab4d01929`／v70。运行开始时工作树干净；运行期间只写独立忽略目录和证据文档，没有修改冻结源码、编译包、测试或 bundle。

命令在 `packages/language-server` 执行：

```sh
PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js \
PHP_COMPANION_TEST_OUTPUT_TIMING_DIR=/tmp/sophp-d134-timings \
pnpm exec vitest run --reporter=json \
  --outputFile=/tmp/sophp-d134-current-full-lsp.json
```

显式提供 reference bundle，原条件跨进程引用用例在本轮完整运行中执行，没有沿用 D131 的单项补测。

## 输入审计

3075 个冻结输入 SHA-256 保持；六个 PHP CLI（7.2.34、7.4.33、8.1.34、8.2.32、8.4.23、8.5.9）的二进制与运行版本、Node 二进制与版本、Git HEAD、采集 JSON 摘要均保持。

采集 1097 项／86 文件，终态也是 1097 项／86 文件；按文件与完整用例名称核对，没有缺失、增加或重复。Vitest collection 的祖先名称分隔符 ` > ` 按实际 JSON 结果的空格格式规范化后比较，未删除用例或放宽断言。

原始结果、采集清单、完整输入、终态审计与计时摘要见同名 JSON；原文件另存 `.vscode-test/d134-evidence/`。

## 等待与性能范围

真实进程句柄 `94621`／Vitest PID `3369473` 已终态退出 0。此前空日志与观察等待不视为停止，没有因此重启完整回归。

原三文件输出补全控制，两模式各 20 个未改文档热查询：onDemand P95 **25.18 ms**，首次 129.94 ms；progressive P95 **18.65 ms**，首次 216.66 ms。完整套件负载下原热守卫通过，不将这些小型固定文档控制外推为普通持续编辑、可见等待或大型项目的性能资格。

## 仍开放

本轮只证明 D133 固定产品的完整 LSP。之后的 D135 原生条件修改单独取证；普通 PHP 7.2 编辑 P95 155.06 ms、缓存规模 RSS、裸 `$` 说明、其它运行版本／平台和真实 WSL 长使用仍开放。

维持原 C1–C4 与 active goal；未打包、更新 Profile、推送或发布。
