# D50 当前标识符前缀读取

## 源码范围

D49 的当前 CPU profile 仍显示光标前标识符的 anchored 正则成本。关键字、函数、常量和服务器候选入口现在共用 completionIdentifierPrefix：从光标向左读取当前连续标识符，遇到边界立即停止；不扫描无关头部、不设置名称长度截断。字符范围沿用 ASCII／Latin1，常量入口保留原 ASCII 边界；未把它当作完整 Unicode 支持。

前导数字后的 suffix 匹配保持既有行为，需要拒绝此位置的关键词入口仍检查前一个字符。换行／空白不再让 `$` 正则匹配上前一行词尾，当前前缀为空。14 项单元用例包含空白、数字、Latin1、命名空间边界、词中光标、ASCII 常量，以及完整 140001+ 字符名称。

## 性能范围

[结构化测量](completion-prefix-scan-2026-10-04.json)保存同一 SHA-256、242692 字节输入的串行普通 100 轮改前／改后数据。改前已含 D49；无 profiler、显式 GC 或并行测试：

| 范围 | 改前 P95 | 改后 P95 |
| --- | ---: | ---: |
| 局部前缀读取，100 热样本 | 5.9953 ms | 0.0025 ms |
| 编辑后立即补全，100 轮 | 243.70 ms | 245.93 ms |

局部读取有明确收益，完整编辑等待没有证明改善；保留统一实现和正确性修正，不宣称整体提速、150 ms 达标或正式五轮资格。不重复同一测量到绿色，继续独立缺口。普通编辑每轮首位、另一侧旧候选缺席、不完整为零和磁盘不变均通过；局部 probe 不替代整个查询成本。

## 当前回归与交付范围

- 当前完整语义 86 文件／1602 项通过，68.05 秒，`/tmp/sophp-edit-prefix-full-semantic.log`；新增 14 项前缀单元用例包含在其中。
- 当前 stdio `/tmp/sophp-edit-prefix-protocol.log`：11 项通过、505 项未选中，51.52 秒；包含声明家族、缩写和词中关键字、模板、D47 数字／Latin1／alias／词中函数和注释 callable、D48 Attribute 命名值与未保存类型切换、常量值类型。未选中不记通过。
- 当前 semantic／language-server／生产 bundle 构建、定向 ESLint、diff 检查通过；D49 的 parser 104 项属于相同 parser 源码，未重复运行。
- `/tmp/sophp-edit-prefix-visible-host.log` 隔离 Linux VS Code 1.140.0／PHP 8.5 退出 0：四例 × Enter／Tab 八次可见首项、精确文本、光标、Undo／Redo、磁盘不变通过。Provider 就绪后显式 trigger 的样本等待 133–449 ms，不作为自动弹出或 P95 门禁。
- [实际接受文本及编译记录](completion-prefix-visible-2026-10-04.json)保留八份文本；PHP 8.5.9 `-l` 全部接受，只编译，不执行业务代码。

自己的临时 fixture 核对原 SHA-256 与文件清单后移除，原始测量保留。D49／D50 合为同一分支一次必要本地检查点；不打包、推送或更新 Profile。完整 LSP 845 通过／1 条件跳过仍属于 `4d52f320` 的冻结输入；真人 WSL、全部版本／平台、其余语料与编辑预算继续开放，goal active。
