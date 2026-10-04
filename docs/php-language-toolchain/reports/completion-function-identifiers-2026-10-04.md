# D47 函数标识符接受与注释保留

## 源码范围

服务器与语义关键词入口统一保留现有标识符支持范围内的数字、ASCII 和 Latin1 字母。`sha1` 的替换范围不再从光标开始，`méth` 不再被截成 `th` 并误推荐 `throw`。这不是所有 Unicode 名称的资格声明。

光标位于词中时，已有右侧后缀构成可确认的完整函数名，就优先保留该函数；未知或拼错的后缀继续提供左侧前缀候选。替换覆盖整个标识符，已有括号不重复插入。已确认目标的 filterText 使用实际左侧前缀，避免 Workbench 自身匹配分数把较短函数排到它前面；其余候选保留通常的匹配文本。

PHP 8.5 常量 callable 接受复用注释感知的 token 扫描：已有空括号转换为 `(...)` 时保留名称与括号间、括号内的注释和空白；已有带注释的占位符只替换名称，真实实参仍拒绝该候选。普通调用和构造器共用的括号识别保持原 PHP 7 hash 注释与 PHP 8 attribute 边界。

## 已定位的失败

- `/tmp/sophp-function-identifier-baseline.log`：两版本首例失败，`sha1` 的编辑起点丢失完整前缀。
- `/tmp/sophp-function-identifier-protocol.log`：数字范围修复后，Latin1 例发现 `throw` 误排首位；语义关键词入口仍截取尾部 ASCII。
- `/tmp/sophp-constant-callable-trivia-baseline.log`：PHP 8.1 负例通过，PHP 8.5 带注释空括号候选缺失。
- `/tmp/sophp-function-identifier-visible-host.log`：协议首位通过后，实际列表仍把较短 `demo2` 放在 `demo2|_optional` 的目标之前。保留这次失败，随后调整 filterText；不放宽 UI 首位断言。

## 验收边界

完整语义当前 84 文件／1540 项通过，63.86 秒，见 `/tmp/sophp-function-identifier-full-semantic.log`。

- 当前 stdio `/tmp/sophp-function-identifier-current-protocol.log`：15 项参数化测试通过、499 项未选中。D47 新增两版本标识符共 19 次查询、两版本注释共 16 次，合并 D44–D46 共 269 次查询；包含 alias、未知后缀、已有调用、PHP 8.1 负例和私有 static 方法。
- 共享注释／括号回归 `/tmp/sophp-function-identifier-trivia.log`：3 文件／22 项通过，含普通函数、成员、构造器、magic declaration 的真实 stdio 路径。之后只改函数目标 filterText，未改扫描器。
- 最终语言服务器／生产 bundle 构建、定向 ESLint 和 diff 检查通过。语义构建先于完整语义测试，未改源生产逻辑后沿用其结果。
- `/tmp/sophp-function-identifier-final-visible-host.log` 退出 0：隔离 Linux VS Code 1.140.0，PHP 8.5，四场景 × Enter／Tab 八次可见首项、精确文本、光标、Undo／Redo、磁盘不变通过。包括较短同前缀函数同时存在的真实列表。Provider 就绪后显式 trigger，等待 138–269 ms，不作为自动弹出或 P95 门禁。
- [结构化可见及编译证据](completion-function-identifiers-visible-2026-10-04.json)保留八份实际接受文本；PHP 8.5.9 `-l` 全部接受，只编译，不执行业务代码。

本批先保留同一分支源码，随后与 [D48](completion-named-attribute-values-2026-10-04.md) 合为一次必要检查点；D48 当前完整语义与定向协议覆盖包含本批范围。不打包、推送或更新 Profile。完整 LSP 845 通过／1 条件跳过属于 `4d52f320` 的冻结输入，不用于资格本批源码。原 60 项、其它语言版本与平台、性能预算、真实 WSL 与多小时使用仍开放；goal active。
