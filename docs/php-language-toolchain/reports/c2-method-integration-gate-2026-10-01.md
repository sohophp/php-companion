# C2 方法调用增量：阶段集成验证

日期：2026-10-01。覆盖 R17–R18；当前状态：本轮列明范围的源码集成验证通过。真实 WSL 与平台矩阵仍单列。未打包、提交、推送或更新 Profile。

## 当前证据

| 范围 | 状态与证据 |
| --- | --- |
| 语义 | R18 的全量 16 文件、551/551，50.10 s；随后新增的继承方法与真实方法作用域 late static 反例所在用例定向 1/1，2.75 s；没有将定向结果记作又一次全量 |
| 完整 C2 Core 源码宿主 | 退出码 0；无子用例 ONLY 开关。原有跨文件原生/PHPDoc 返回、数组形状、classmap、Attribute、分组导入、局部字面量、未保存切换、Elvis、按值函数、final 方法、普通精确构造对象、引用返回、重载、泛型、URL 与字符串列表回归通过 |
| 全仓 Lint | `pnpm lint` 退出码 0；后续两个独立签名审计脚本的增量另通过定向 ESLint，未以此前全仓命令替代它们的验证 |
| 完整 stdio | 367/367，0 跳过，1179.11 s，退出码 0；启用跨进程引用缓存测试。这是完整 stdio 文件，不是 language-server 全部测试文件或全仓所有包测试 |
| 输入一致性 | 八项源码、构建产物和测试输入 SHA-256 已记录；C2/Lint 终态与完整 stdio 终态后复核全部一致 |

## 复现

```sh
PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js \
  pnpm --dir packages/language-server exec vitest run test/stdio.test.ts
PHP_COMPANION_TEST_CORE_ONLY=1 PHP_COMPANION_TEST_C2_ONLY=1 \
  node scripts/run-extension-test.mjs ./dist-test/runTest.js
pnpm lint
sha256sum -c /tmp/sophp-method-integration-inputs.sha256
```

日志：`/tmp/sophp-method-integration-full-stdio.log`、`/tmp/sophp-method-integration-full-c2-host.log`、`/tmp/sophp-method-integration-lint.log`。stdio 工具会话 `35182` 已终态退出码 0，不再作为活动任务继续等待或重启。

## 范围与剩余要求

- 原补全专项的 60 项、声明 D01–D30 保持冻结；R17–R18 追加于现有语料，不替换原要求。
- 本轮完整宿主只代表 Core 的 C2；C1 可见列表沿用上一批当前逻辑未改变时的证据，不声称又完成一次显示等待测量。
- C1 首次引用候选扫描仍约 6–7 秒；已有两条不同优化路径，等待新的测量或复现再继续定向处理。
- 普通参数/工厂对象的实际派发、复杂实参和一般属性副作用仍未关闭；确定构造对象的修复不替代这些范围。
- C3 其它文件系统的 createFile Redo、C4 平台与版本矩阵，以及真实 WSL 长会话继续单列；未执行的真人验收不记为源码受阻。
- 用户没有要求本轮制作候选或安装，因此本轮不生成 VSIX、更新 Profile 或发布。

完整 stdio 与最终输入校验现已通过，本轮 R17–R18 源码集成验证完成；不能据此宣布全部长期路线图、其它平台或真实环境验收完成。同期[引用参数签名审计](phpstorm-stubs-reference-parameter-audit-2026-10-01.md)只修改独立审计脚本，没有修改本轮产品与测试输入。
