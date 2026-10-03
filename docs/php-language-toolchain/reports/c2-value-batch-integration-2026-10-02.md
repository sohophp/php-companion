# R32–R34 集中集成回归

日期：2026-10-02。当前批次覆盖候选说明、未完成函数／方法成员输入与合并取值／match 分支。各项支持边界分别见 R32、R33、R34 报告；不把本批通过等同于整个路线图完成或真实 WSL 验收。

## 已确认终态

| 检查 | 结果 |
| --- | --- |
| 全量语义 | 675/675，50.02 秒 |
| 定向真实 stdio | 13 通过／398 跳过，总数 411，32.92 秒 |
| 完整 Core C2 | 退出码 0；包含新取值排序、条件隔离、可空值、未保存修改与 Undo/Redo，既有全套同时通过 |
| 标准组合 C3 | 退出码 0；已支持重构、Rename、PHP 类型生成、Symfony 事件和 Composer fallback |
| 全仓 Lint | 退出码 0；随后新增 C1 可见取值分支测试，新增测试单独编译与 Lint 通过 |
| 当前三版本 C1 可见列表 | 均退出码 0；PHP 7.2 八次取值／可空位置，8.1／8.5 各 20 次五类位置，未保存 string→int→Undo→Redo 后首位与候选保留通过 |

可见等待与协议预算分开记录：

| PHP | 新取值分支等待范围 | 基础六轮等待 ms | 基础中位／最大 ms |
| --- | --- | --- | --- |
| 7.2 | 123–179 ms | 247,236,226,245,241,230 | 239／247 |
| 8.1 | 122–215 ms | 249,245,249,234,252,241 | 247／252 |
| 8.5 | 123–179 ms | 249,228,234,231,244,238 | 236／249 |

8.1／8.5 各出现已知 `getItemsByProvider` renderer 异常，断言全部通过，未宣称修复；7.2 本次未见该异常。原 60 项／声明族的可见内容与接受文本继续由既有 C1 执行检查，新取值分支检查直接观察实际弹窗顺序，不等同于真实 WSL 使用。

## 完整协议终态

完整 stdio **411/411 通过，零跳过，1281.18 秒**，启用 `PHP_COMPANION_TEST_REFERENCE_BUNDLE`，包含跨进程缓存门禁；日志 `/tmp/sophp-value-batch-full-stdio.log`。同一进程等待至终态，未因安静输出重启。

12 项冻结输入在完整 stdio 终态后全部匹配；基准 `/tmp/sophp-value-batch-inputs.sha256`，终态输出 `/tmp/sophp-value-batch-final-inputs.log`。

日志：`/tmp/sophp-value-batch-full-c2.log`、`/tmp/sophp-value-batch-full-c3.log`、`/tmp/sophp-value-batch-full-lint.log`、`/tmp/sophp-value-batch-c1-ui-72-expanded.log`、`/tmp/sophp-value-batch-c1-ui-81.log`、`/tmp/sophp-value-batch-c1-ui-85.log`。

## 下一项隔离准备

数组形状在三元、合并取值和 match 取值分支中的键／值补全缺席已复现；嵌套字段路径也应从根到叶查找。修复准备在 `/tmp/sophp-branch-shapes-preparation`，原 16 项样例七失败／九通过；扩充 25 项后隔离全量语义 700/700（50.16 秒），随后再补九项返回／赋值／长数组用例，当前定向 34/34 通过，产品源码相同。类型检查及构建通过。第一次隔离全量因临时目录缺少 language-spec 链接有十项导入失败，补齐隔离依赖后才全量通过；没有改变项目依赖。

这个准备尚未合入当前源码，不能算作产品 LSP／宿主验收。后续在当前完整 stdio 终态与输入一致性通过后再应用，进行其自身的协议、宿主与连续编辑验证。

本批不打包、提交、推送或更新 Profile。真实 WSL 与已知独立 renderer 异常仍分别记录。
