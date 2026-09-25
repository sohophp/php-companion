# C1：真实 Composer 依赖夹具的 500 轮未保存编辑链

日期：2026-09-25。独立生成的 Composer 夹具含 30 个锁定依赖包与 9,100 个额外 PHP 文件，总计 10,130 个 PHP 文件；未使用或修改业务项目。

## 方法与结果

扩展宿主在同一个未保存缓冲区交替编辑 `ResponseInterface` 与 `RequestInterface` 类型，连续 500 轮通过真实 VS Code 命令查询 Completion、Hover、Signature Help、Definition、Implementation、References。每轮检查当前类型的方法、目标声明与实现 URI、当前未保存调用位置，并排除同文件的旧调用。总计 3,000 次查询，断言全部通过，宿主退出码 0。测试在第 0 轮及每 25 轮读取语言服务器进程内存；采样不强制 GC。

| 命令等待，毫秒 | 中位数 | P95 | 最大值 |
| --- | ---: | ---: | ---: |
| Completion | 17 | 25 | 39 |
| Hover | 4 | 8 | 17 |
| Signature Help | 4 | 8 | 25 |
| Definition | 5 | 10 | 23 |
| Implementation | 5 | 13 | 807 |
| References | 619 | 750 | 912 |

语言服务器 RSS 从 318 MiB 开始，在 20 次后续采样中最低 323 MiB、最高 467 MiB，第 500 轮为 373 MiB；堆使用量从 76 MiB 开始，后续范围 48–139 MiB，末轮 73 MiB。曲线有涨落，未观察到本次 500 轮持续单向增长；单次运行无法证明数小时会话没有泄漏。完整原始数据在 `/tmp/sophp-c1-chain-500-20260925.log`。

## 尚未满足的等待门槛

[前一次 50 轮报告](c1-real-composer-10k-host-2026-09-24.md)的 References 中位数为 89 ms、P95 为 132 ms；本次使用了随后加入的未打开文件新鲜度检查，两个样本不能直接当作同版本性能对比。当前 `methodCandidatePathsUnchanged()` 在每次方法 References 前重新搜索候选路径，并校验命中的文件内容；这提供了文件事件尚未送达时的正确性防护，也可能解释本次约 0.6 秒的重复等待。还需要分段计时或受控 A/B 才能量化具体成本，不能为了缩短等待直接移除新鲜度检查。

下一步对新鲜度搜索、候选文件哈希、接收者闭包分别计时；在保留“新增未打开调用文件立即可见”回归的前提下，寻找更便宜的证明方式。随后重跑相同 10k 夹具的长编辑链，并在候选安装后做 WSL Remote 与真实编辑器验收。本次是 Linux 扩展宿主证据，不是已安装 Pack 或人工使用验收。

后续分段计时发现，上述 500 轮重复等待主要来自不同方法的候选证据相互覆盖，而非每次路径搜索本身；修复、50/200 轮对照及仍开放的门槛见[按方法保存新鲜度证据](c1-method-reference-keyed-freshness-2026-09-25.md)。本报告保留修复前的原始样本。

复现命令：

```sh
PHP_COMPANION_TEST_C1_ONLY=1 PHP_COMPANION_TEST_C1_REAL_VENDOR=1 PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE=9100 PHP_COMPANION_TEST_C1_CHAIN_ROUNDS=500 node scripts/run-extension-test.mjs ./dist-test/runTest.js
```
