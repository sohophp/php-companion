# 调用签名前缀范围：当前工作

## CPU 证据

在 6efbe705 生产 bundle 上采样 D51 相同 SHA-256 241283 字节夹具，100 次字段类型交替查询均保持正确首项、另一候选保留、列表完整与磁盘不变。原始数据在 `/tmp/sophp-shape-candidate-current-cpu/`，自己的夹具核对哈希与文件清单后清理。

[聚合 self 样本](completion-signature-prefix-cpu-2026-10-04.json)显示成员调用匹配正则 6879.56 ms、函数声明尾部正则 4606.40 ms、函数调用匹配正则 2391.43 ms。相同正则跨多个调用栈节点聚合；inclusive 样本存在嵌套，不能相加。带 profiler 的 P95 487.68 ms 不是普通性能基线，普通改前仍为 D51 的 463.51 ms。

## 修改范围

signaturesWithImplementation 根据现有 ParsedCall.argumentsStart／argumentsEnd 找到包含光标且最内层的调用，前缀从其实际 start 读取；复用该调用事实进行嵌套恢复。未取得调用事实时保留整段源码恢复，不添加任意长度上限、不缩短名称或参数区间。此处不做跨请求签名缓存，避免增加缓存失效与共享可变结果问题。

## 验证状态

新增 17 项包括 retained／临时 CST、200 KB 文档前缀、跨行函数／方法／静态方法／构造函数／callable 变量、内层参数契约、未闭合调用、140 KB 参数区间和声明参数位置。联合 D51／Attribute 值测试 3 文件／129 项通过；semantic／language-server／根 bundle 构建、定向 ESLint 和 diff 检查通过。

完整 semantic 原会话 19280 退出码 0，88 文件／1683 项通过，用时 64.08 秒，日志 `/tmp/sophp-signature-range-full-semantic.log`。旧完整 LSP 和 D51 验收不承接为本修改的结果。工作保持同一分支，与 D53 合为一次必要本地源码检查点，没有打包、推送或更新 Profile，goal active。

## 当前追加证据

[同 SHA-256 的普通改前／改后测量](completion-signature-prefix-performance-2026-10-04.json)：各 100 轮，串行、无 profiler／显式 GC，P50 402.65→278.86 ms，P95 463.51→334.55 ms；各轮首项、另一候选保留、完整列表和磁盘不变均通过。仍超过 150 ms，不记性能门禁通过，不重复测量到绿色。临时夹具核对哈希与文件清单后清理。

当前真实 stdio 6 项通过／512 项未选中，18.82 秒，日志 `/tmp/sophp-signature-range-protocol.log`；包含两版字段值、PHP 8.1／8.5 Attribute 命名值及 PHP 7.2／8.5 一致 overload 契约。未选中不记通过。

[当前可见列表证据](completion-signature-prefix-visible-2026-10-04.json)：隔离 Linux VS Code 1.140.0／PHP 8.5 八次首项、Enter／Tab 精确文本与光标、Undo／Redo 和磁盘不变通过；原会话 97833 退出码 0，日志 `/tmp/sophp-signature-range-visible-host.log`。实际文本 PHP 8.5.9 `-l` 全部接受，不执行。显式 trigger 等待 164–488 ms，不是自动弹出或 P95 门禁。完整当前 LSP、全部版本／平台／规模与真人 WSL 仍待验收；本项局部改善未达到整体 150 ms 预算。
