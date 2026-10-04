# 类型尾部范围：当前工作

## 当前证据

在含已验证 D52 签名优化的生产 bundle 上，再次对相同 241283 字节 SHA-256 夹具采样 100 轮，候选正确性保持。CPU 样本 [聚合 self](completion-type-tail-cpu-2026-10-04.json)显示联合／交叉类型尾部正则 self 2892.39 ms，成为剩余可识别热点之一；不把 profiler P95 356.55 ms 当作普通测量。D52 普通样本 P95 334.55 ms 的超预算记录保留。

## 修改

复合类型前缀先逆向读取由原正则字符集合构成的连续末尾片段，仅排除正则不能跨过的字符；原正则及其结果绝对 index 保留。不按固定字节数截断，不扩展类型语义，不改其余参数／返回类型规则。函数和常量入口仍通过既有 typeCompletionPrefix 调用此逻辑。

新增 15 项覆盖 property／return 前缀、namespace、Latin1、数字、Unicode 空白、标点、非候选 Unicode、换行以及 140 KB 名称与空白。最初换行用例误以为原正则接受尾部换行；直接运行原正则得到 null 后修正测试预期，产品保持原行为。

联合签名范围与字段候选 3 文件／96 项通过。semantic／language-server／根 bundle 构建及定向 ESLint、diff 检查通过。完整 semantic 原会话 5884 退出码 0，89 文件／1698 项通过，用时 62.67 秒，日志 `/tmp/sophp-type-tail-full-semantic.log`；追加验证见下。真人 WSL 未验证。不把 D52 或前一完整 LSP 作为本修改的通过证据。保持同一开发分支，未打包、推送或更新 Profile，goal active。

## 当前追加验证

- [相同字节的串行普通测量](completion-type-tail-performance-2026-10-04.json)：改前已含 D52，当前各 100 轮无 profiler／显式 GC；P50 278.86→247.44 ms，P95 334.55→292.56 ms，所有首项、另一侧候选保留、列表完整与磁盘不变通过。仍超 150 ms，不重复测量到绿色。临时夹具核对哈希及文件清单后清理。
- 真实 stdio 11 项通过／507 项未选中，31.99 秒，日志 `/tmp/sophp-type-tail-protocol.log`；包含 PHP 7.2／8.0／8.1／8.5 enum 类型门控、未打开 Composer 类型位置、字段值、Attribute 命名值和 overload 契约。未选中不记通过。
- [四种类型位置的可见验收](completion-type-tail-visible-2026-10-04.json)：隔离 Linux VS Code 1.140.0／PHP 8.5，属性／参数／返回／提升属性各 Enter／Tab，8 次可见首项、精确文本、光标、Undo／Redo、磁盘不变通过。原会话 66299 退出码 0，日志 `/tmp/sophp-type-tail-visible-host.log`，实际接受文本 PHP 8.5.9 `-l` 全部接受、不执行。显式 trigger 等待 129–236 ms，不作为自动弹出或 P95 门禁。
- 最终含宿主测试的定向 ESLint 和 diff 检查通过。

D52／D53 合为一次必要本地源码检查点；当前完整 LSP、全部平台／版本／规模及真人 WSL 未整体关闭。优化保留局部改善证据，整体编辑预算未通过。没有打包、推送或更新 Profile，goal active；随后推进其它独立补全缺口，避免围绕单一夹具持续等价试验。
