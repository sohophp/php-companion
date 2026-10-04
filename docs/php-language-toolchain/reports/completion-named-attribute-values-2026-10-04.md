# D48 命名实参值与 Attribute 构造上下文

## 实现

普通函数、方法和 new 构造器的命名实参值使用对应参数类型；本批固定这些正反例，修复 Attribute 值外包括号和类名后有注释时构造上下文丢失的问题。Attribute 入口先使用保留或自有临时语法树，最多检查 256 层；分组括号保留外层参数签名，内层函数／方法／构造调用和闭包停止外层推断。临时树释放，不发布恢复事实。

未闭合 `#[Host(flag: tr` 的类型值入口原本能生成 true，但关键词仍按顶层声明生成 trait。本批在原有错误文档、131072 字符上限内，复用可确认的 Attribute 实参位置，把值位置恢复为表达式；参数名称前缀不走该恢复。类名与括号之间的注释通过保持源码位置的现有 comment mask 识别。恢复入口复用已解析树，避免额外解析同一文档。

继承现有参数类型排序、Attribute 身份和 public 构造器资格检查。未知类型不猜测；这批没有实现所有未闭合分组、所有属性表达式、通用泛型 Attribute 或全版本／规模资格。

## 失败与边界记录

- 第一份 baseline 的 Attribute 测试夹具未标注 `#[Attribute]`，四项失败源于夹具本身；补正确标记后 28 项通过，没有为此放宽产品身份检查。日志 `/tmp/sophp-named-value-baseline.log`、`/tmp/sophp-named-value-valid-attribute-baseline.log`。
- 添加合法的分组与注释例后，`/tmp/sophp-named-value-trivia-baseline.log` 保留四项失败／30 项通过，覆盖保留及临时树。
- AST 入口修复后 44 项语义通过；首次真实协议 `/tmp/sophp-named-value-protocol.log` 仍是两版本失败／11 项通过，具体为未闭合 Attribute 的 trait 抢首位。没有删除该用例，补位置恢复后继续验证。

## 当前证据

- 语义矩阵 48 项（24 场景 × 保留／临时树），覆盖函数、方法、构造器、Attribute、命名顺序、nullable／枚举、运算负例、参数名称、未知类、内层调用、未闭合和注释。当前完整语义 `/tmp/sophp-named-value-final-full-semantic.log`：85 文件／1588 项通过，60.59 秒。
- `/tmp/sophp-named-value-final-protocol.log`：13 项通过、503 项未选中，35.01 秒。D48 PHP 8.1／8.5 各 9 个值位置的补全与签名，再各 4 次未保存构造参数类型切换，共 44 次新查询；同时保留 Attribute 参数名、Composer 未保存声明及关闭恢复、命名顺序、PHP 7 参数名门禁和 D47 接受范围回归。未选中不算通过。
- 当前语义／语言服务器／生产 bundle 构建、定向 ESLint、diff 检查通过。
- `/tmp/sophp-named-value-final-visible-host.log` 退出 0。隔离 Linux VS Code 1.140.0／PHP 8.5，分组 bool、注释 bool、命名枚举、类型兼容常量四例 × Enter／Tab 八次可见首项、精确文本、光标、Undo／Redo、磁盘不变通过。Provider 就绪后显式触发，等待 151–276 ms，不作为自动触发或 P95 门禁。
- [结构化可见与编译证据](completion-named-attribute-values-visible-2026-10-04.json)：八份实际接受文本由 PHP 8.5.9 `-l` 接受，只编译，不执行业务代码。

D47／D48 形成同一分支的一次必要源码检查点。完整 LSP 845 通过／1 条件跳过仍是 `4d52f320` 的输入；本批未重跑整个 LSP、所有版本平台或规模性能。隔离宿主与编译检查不替代真人 WSL，现有编辑 P95 超预算继续开放；未更新 Profile、打包或推送，goal active。
