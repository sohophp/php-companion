# C2 泛型实参增量：阶段集成验证

日期：2026-10-01。覆盖 R14–R16 源码增量。状态：本轮列明范围的源码集成验证通过；真实 WSL、其它平台和发布产物仍单列。未打包、提交、推送、发布或更新 Profile。

## 已取得证据

| 范围 | 当前状态 |
| --- | --- |
| 全量语义 | 当前源码 16 文件、549/549，48.05 s；沿用这批源代码已完成的全量结果 |
| 完整 C2 Core 源码宿主 | 退出码 0；跨文件未保存、Attribute、classmap、数组回调、属性类型、Elvis、按值/引用调用、重载、泛型部分输入、URL 与字符串列表链通过 |
| C1 可见补全宿主 | 退出码 0；真实可见候选、交替短前缀项目类型、第三字母刷新、词中成员替换、Enter/Tab、模板占位符和 Undo 通过 |
| 全仓 Lint | `pnpm lint` 退出码 0 |
| 完整 stdio | `test/stdio.test.ts` 359/359，0 跳过，1153.60 s；启用跨进程引用缓存用例，进程退出码 0 |
| 输入一致性 | 8 个源码、构建产物和测试文件 SHA-256 检查通过；在回归运行期间不修改这些输入 |

可见列表六次等待：236、240、250、230、231、235 ms；中位 236 ms、最大 250 ms。与完整 stdio 并行采样，不代表空闲机器或用户真实 WSL 窗口。VS Code 1.140.0 的 `getItemsByProvider` renderer TypeError 仍出现；相关列表与接受文本断言通过，该异常本轮未修复。后续[最小 Provider 对照](c1-renderer-suggest-minimal-control-2026-10-01.md)在没有 SoPHP 的宿主中完成 32 文档断言，并复现八次相同异常；SoPHP 不是其发生的必要条件。

## 对照原补全专项

| 原阶段要求 | 当前证据及未关闭范围 |
| --- | --- |
| 1. 冻结样例 | 原 K/S/V/T/A/E 六组各 10 项，共 60 项；逐项状态表有 60 个映射，无缺失或额外 ID。声明 D01–D30、追加 R01–R16 保持独立，不替换原 60 项。映射完整本身不证明行为正确；本次全量语义、完整 stdio 及宿主结果按各行原证据范围使用 |
| 2. 候选相关 | 语义 `completionContext` 与服务器候选分类、匹配和排序接口已存在；可见宿主复验声明、短输入、连续修改、词中接受；完整 stdio 359 项已通过 |
| 3. 类型有用 | 预期赋值、返回、实参、数组形状、具名值、枚举/常量已有冻结用例；R14–R16 验证其它实参提供的泛型证据、未闭合及部分输入，未知与不兼容候选保留 |
| 4. 输入顺手 | 服务器少量 function/method、if、foreach、try 模板继续存在，排序低于普通符号；隔离可见宿主核对调用括号、模板、占位符、接受文本及 Undo。没有扩展模板系统范围 |
| 5. 阶段验收 | 语义、完整 C2、可见 C1、Lint 和完整 stdio 已通过。真实 WSL、其它平台和发布产物没有本轮证据，不以自动化替代它们 |

## 复现与日志

- `/tmp/sophp-generic-integration-full-stdio.log`：启用 `PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js` 的完整 stdio。
- `/tmp/sophp-generic-integration-full-c2-host.log`：`CORE_ONLY=1 C2_ONLY=1`，没有设置任何子用例 ONLY 开关。
- `/tmp/sophp-generic-integration-visible-c1-host.log`：`CORE_ONLY=1 C1_ONLY=1 C1_COMPLETION_ONLY=1 C1_UI=1`。
- `/tmp/sophp-generic-integration-lint.log`。
- `/tmp/sophp-generic-integration-inputs.sha256`：记录语义源码/产物、服务器源码/产物及 bundle、stdio、C1 UI、C2 测试输入。

完整 C1/C3 和较早 357 项 stdio 的结果属于[上一批集成](c2-current-source-integration-gate-2026-10-01.md)，不当作这批改动重新通过的证明。359 项只代表完整 stdio 文件，不能称作 language-server 的全部测试文件或全仓所有包测试。最终八项输入哈希仍全部一致。当前只运行阶段要求内的集成验证；不增加功能范围，不例行制作候选或更新 Profile。
