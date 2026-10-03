# 连续编辑与持久缓存恢复

## 本批范围

扩展现有 `scripts/benchmark-c2-real-vendor-feedback.mjs`，通过 `SOPHP_C2_PERSISTENT_CACHE=1` 为 shape 场景增加三个独立进程：冷准备、暖缓存恢复、损坏缓存恢复。持续编辑仍使用 onDemand；重启检查明确使用 progressive，并等待准备进度结束，再只打开消费者文件，从磁盘解析声明。

暖恢复必须有文件索引缓存命中，不能用当前进程候选命中替代。故障注入只破坏本次工具创建的临时缓存 JSON；业务项目、原始 vendor 和用户安装缓存不受影响。恢复后检查两个源码文件字节未变，临时目录由 finally 清理。

## 验证

环境：Linux x64／WSL，Node 22.14.0，源码基于 `ed3f76a`。独立 Composer fixture 的 vendor 含 1,029 个 PHP 文件；添加 9,100 个确定性噪声文件和两个被测源码，总计 10,131 个 PHP 文件。progressive 的项目准备覆盖 9,102 个源码文件，不将 vendor 数量当作已全量准备数量。

命令：

```sh
SOPHP_C2_PERSISTENT_CACHE=1 node scripts/benchmark-c2-real-vendor-feedback.mjs 1000 9100 shape
```

1,000 次未保存声明更新逐次验证消费者诊断、联合数组形状 Hover 和两处成员定义；无正确性断言失败。总耗时 141.72 秒，包含恢复步骤及三个重启进程。

| 协议往返指标 | P50 ms | P95 ms | 最大 ms |
| --- | ---: | ---: | ---: |
| 修改到诊断 | 94.74 | 100.54 | 124.07 |
| definition | 6.51 | 13.78 | 18.48 |
| hover | 1.81 | 2.79 | 4.08 |

使用 testkit 导出的 `R1_PERFORMANCE_BUDGETS`／`assertPerformanceBudget` 检查本次 P95：诊断 ≤ 500 ms，热查询 ≤ 150 ms，均通过。诊断测量包含现有防抖时间。取消 Hover、关闭恢复磁盘、真实 watcher 往返、相同版本号重开，以及取消 Completion 跨重开和 watcher 均通过；取消正确性不等于停止分析延迟预算验收。

| 独立进程 | 文件索引缓存命中 | 启动到查询验证 ms |
| --- | ---: | ---: |
| cold | 0 | 13,606.09 |
| warm | 9,102 | 10,707.26 |
| corrupt | 0 | 13,175.34 |

cold 持久化两个缓存 JSON；warm 验证实际文件命中；corrupt 拒绝损坏缓存并报告 unreadable，重新准备后诊断、Hover、成员定义和补全均正确。表中等待包含初始化、准备及查询，不是纯索引耗时；各只测一次，不据此关闭五轮冷／热性能验收。

连续编辑 RSS 有 41 个离散采样：开始 198.73 MiB，结束 170.18 MiB，采样最大 280.75 MiB。没有观察到本次会话持续增长，但未测真实峰值、缓存体积或两小时会话，不能据此关闭这些门槛。

六种标量／shape 正反例源码均通过 PHP 8.5 `-l`，包括 PHPDoc 与原生返回类型冲突的语法合法反例；namespace 转义与原已提交版本一致，先前认为旧夹具非法的判断已撤回。两轮无噪声恢复 smoke、Node syntax、脚本 ESLint 和 diff check 通过。原始大规模 JSON 位于 `/tmp/sophp-persistent-shape-session-20261004.json`，临时证据不作为持久文件保证。

本批仅增强验证工具，没有产品源码改动；未运行全量套件或新增隔离宿主检查。C4／F13 的真实 WSL 长期使用、其它平台、峰值及缓存体积仍开放。未安装、打包、更新 Profile 或推送。
