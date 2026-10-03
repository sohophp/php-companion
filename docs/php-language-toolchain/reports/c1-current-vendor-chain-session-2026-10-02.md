# 当前 Core 的真实 vendor 持续编辑查询

日期：2026-10-02。使用当前源码构建的 Core、隔离 Linux VS Code 1.140 宿主和固定 30 个 Composer 包，加 9,100 个背景文件。沿用既有 `verifyRealVendorEditingChain`，在同一个未保存文档中切换 PSR ResponseInterface／RequestInterface，核对实际 PSR 声明与 Guzzle 实现。

## 结果

宿主进程退出码 0。1,000 轮均保持准确的未保存文本；每轮 Completion 排除前一类型方法，Hover 和 Signature Help 匹配当前方法，Definition／Implementation 精确匹配 vendor URI，References 包含当前未保存调用且不带入同文件旧调用。共 6,000 次编辑器命令查询全部通过。

| 查询 | P95（ms） | 最大值（ms） |
| --- | ---: | ---: |
| Completion | 27 | 45 |
| Hover | 18 | 33 |
| Signature Help | 16 | 33 |
| Definition | 16 | 32 |
| Implementation | 14 | 368 |
| References | 178 | 266 |

上述时间来自 VS Code 命令至符合断言的结果，可能含重试，不是键入至弹窗绘制的时间。首次实际 Guzzle Implementation 为 610 ms，预热查询中位数 4 ms；单独报告，不混入热查询结论。补全命令 P95 在 150 ms 预算内，References 的 178 ms 仍记录为导航等待观察项。

41 个服务器内存采样中，RSS 起始 493 MiB，最高约 590 MiB，运行时回收后末值 404 MiB；最后 325 轮约 403–410 MiB，heapUsed 末值 89 MiB。本段未呈现连续增长，不证明数小时无泄漏。前次 scalar stdio 的小幅上升也不能仅凭本次另一进程的采样直接归因。

原始查询统计、内存及最后 256 次内部 freshness 时间见 [JSON](c1-current-vendor-chain-session-2026-10-02.json)。完整日志 `/tmp/sophp-current-vendor-chain-host.log`。当前 Extension Host 编译和源码 bundle 构建通过；本轮没有修改产品源码、打包、提交、推送或更新 Profile。

## 复现与范围

```sh
PHP_COMPANION_TEST_CORE_ONLY=1 PHP_COMPANION_TEST_C1_ONLY=1 PHP_COMPANION_TEST_C1_REAL_VENDOR=1 PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE=9100 PHP_COMPANION_TEST_C1_CHAIN_ROUNDS=1000 PHP_COMPANION_TEST_C1_UI=1 PHP_COMPANION_TEST_C1_PHP_VERSION=8.5 node scripts/run-extension-test.mjs ./dist-test/runTest.js
```

宿主还通过既有可见建议和快速未保存切换检查，但上述 1,000 轮本身是编辑器 Provider 命令，并未逐轮读取可见建议 DOM。真实 WSL、其它 PHP 版本／平台、完整 Pack 和数小时真实编码继续单列。下一步回到原补全专项剩余集成退出条件，避免反复延长相同的合成序列。
