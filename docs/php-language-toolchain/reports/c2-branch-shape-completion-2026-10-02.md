# C2：取值分支中的数组形状补全

日期：2026-10-02。对应补全路线图第二／三／四阶段的语法位置、已证明字段与接受文本。

## 修改

已复现直接实参能补齐字段，三元、`??`、match 取值分支却无建议；最初 16 项为七失败、九通过。修复复用已有统一位置／签名／作用域证明，不另造类型推断：

- 数组根从元素内部位置取得共享合同，支持直接和括号、三元、合并取值及 match 的值分支；条件、标签、未知内层调用与独立回调不借用外层合同。
- 字面量数组本身非 null，仅去掉合同中的 null 分支；不合并其它不确定的联合形状。
- 嵌套形状按根到叶的字段路径访问，最多 64 层；未知、动态或非形状字段仍拒绝。
- `=>` 紧接光标时也可显示已证明的字段值，不要求额外空格。
- 真实弹窗另发现：替换范围包含输入引号，原筛选文本缺少引号，使协议中的键被 VS Code 隐藏。Language Server 按实际输入提供带引号的 filterText，保留简短标签和完整替换范围；空位置仍使用普通键名。

## 当前源码验证

| 检查 | 结果 |
| --- | --- |
| 新语义矩阵 | 34/34；分支键／值、条件反例、内层调用、闭包、深层形状、返回／赋值及长数组语法 |
| 全量语义 | 29 文件、709/709，49.84 秒 |
| 定向真实 stdio | 5 通过／408 跳过，总数 413，14.86 秒；PHP 7.2／8.5，owner→other→owner，引用位置不借用形状，准确替换范围及 quoted filterText |
| 隔离 Core C2 定向 | 最终服务器构建退出码 0；新数组分支、深层字段、条件隔离、未保存合同及一次 Undo/Redo，R30–R34 同时通过 |
| PHP 8.5 可见列表 | 五种位置共 20 次通过，等待 110–158 ms；列表仅当前形状键，五次 Tab 接受全文准确、没有重复引号，Undo/Redo 撤回旧键 |
| PHP 7.2 可见列表 | 四种适用位置共 16 次通过，等待 114–150 ms；四次 Tab 接受、未保存键修改与 Undo/Redo，宿主退出码 0 |
| 编译、语义／服务器构建、bundle、定向 ESLint、diff 检查 | 通过 |

宿主命令会聚合尚未按编辑器筛选的内置 PHP snippets。C2 排除 Snippet 种类检查 SoPHP 结果，LSP 严格检查精确候选；C1 直接检查实际弹窗只有一个形状键。默认 snippetSuggestions 为 none，未更改设置。第一次弹窗真实失败保留在 `/tmp/sophp-branch-shapes-ui-85-red.log`，修复 filterText 后才通过，不以协议通过替代 UI 验证。

性能：每组 100 轮更新后进程内语义查询，小工作区 P95 1.13 ms／最大 8.00 ms；生成 2,300 文件工作区 P95 0.47 ms／最大 0.51 ms。两组错误键与项目修订变化均为 0。测量来自隔离准备，其语义 src 与 dist 均已核对和最终主工作区一致；该结果不代表实际 stdio、初次索引或 WSL 弹窗等待。原始 JSON 见相邻基准文件。

## 集成边界

只在前批 [R32–R34 完整集成](c2-value-batch-integration-2026-10-02.md)结束、411/411 零跳过与 12 项输入终态匹配后才应用。当前完整 413 项未再全跑；下一批集中集成，不每项重跑约 20 分钟的完整协议测试。PHP 8.5 本次仍有已知独立 renderer 异常，未宣称修复。12 项当前增量输入在两版本可见宿主完成后终态全部匹配；基准 `/tmp/sophp-branch-shapes-inputs.sha256`，输出 `/tmp/sophp-branch-shapes-final-inputs.log`。PHP 7.2 本次未见已知 renderer 异常，PHP 8.1 新形状用例未执行。

日志：`/tmp/sophp-branch-shapes-full.log`、`/tmp/sophp-branch-shapes-stdio.log`、`/tmp/sophp-branch-shapes-host-final.log`、`/tmp/sophp-branch-shapes-ui-85.log`、`/tmp/sophp-branch-shapes-ui-72.log`、`/tmp/sophp-branch-shapes-server-build.log`。

本次未打包、提交、推送或更新 Profile；真实 WSL 使用验收独立。
