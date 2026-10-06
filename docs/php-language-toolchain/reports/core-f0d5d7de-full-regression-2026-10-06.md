# D131 当前 D130 产品完整 LSP 回归

产品绑定：`f0d5d7decd66aa68c9a74736de403454086112c5`；bundle SHA-256 `7f4ca6e5f1b2ecce92eceeec8d4b4883e7f50de03f3a154c1bcc0dce81e02459`。原输入、完整结果和补测结果的路径／哈希见同名 JSON。运行期间正式产品保持固定，D132／D133 在隔离副本中进行；终态后才接入 D133。

## 完整一轮与补测

- 原完整进程终态 exit 0：85 文件，1037 项，1036 通过、0 失败、1 跳过，约 1635.17 秒；文件与测试组合名称无重复。
- 跳过项：`language server stdio restores proven references across processes and rejects changed query inputs`。源码 `it.skipIf(!process.env.PHP_COMPANION_TEST_REFERENCE_BUNDLE)` 要求显式指定 bundle。原命令没有该变量，不能把它记为通过。
- 保持同一 bundle，传入绝对路径，定向运行这一个原测试：exit 0，1 通过，530 个不匹配项未运行。测试内部含跨进程恢复及输入变化检查。
- 因此 1037 个不同测试分别有通过证据；不是一次零跳过全绿，不覆盖后来新增的 D133 测试。

## 范围

此次未另行冻结采集清单或六 CLI 清单，不能复用旧 D126 的采集／运行时身份来声称本轮同样核验。完整结果与源码中默认选取范围保持可核查；测试进程等待不是等待用户操作。

普通编辑 P95 155.06 ms、规模 RSS、裸 `$` 说明、其它平台及真实 WSL 使用仍未关闭。保持原 C1–C4 路线图和 active goal，不更新 Profile、不打包、不发布。
