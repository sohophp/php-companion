# 枚举魔术方法声明补全

日期：2026-10-03。源码、定向协议与 Linux 可见编辑器通过。

原实现对 inEnum 返回空列表；此外 `enum_declaration_list` 在完整方法名称位置误分类为 top-level。现统一按成员声明区域处理，并且仅在 PHP 8.1+ 建议 `__call`、`__callStatic`、`__invoke`。枚举构造、析构、属性魔术方法等不出现；已有声明仍去重，当前编辑的方法仍可完成，类与匿名类建议保持。

依据：[PHP 枚举与对象的区别](https://www.php.net/manual/en/language.enumerations.object-differences.php)。PHP 8.1／8.5 实际加载 17 方法各一遍，共 34 项，与三个合法方法及其它禁止方法一致。

- 完整语义 68 文件、1268/1268、退出 0，52.29 秒。首次大量并行与构建争用时，既有 array_map 大样例超过 10 秒；限制为 4 个 worker 后完整复跑通过，没有放宽超时或删除用例。
- PHP 7.2／8.1／8.5 × 8 个未保存场景，共 24 查询；连同已有魔术方法及继承 final 回归，3 文件、8/8、退出 0。
- Linux VS Code 1.140.0 可见列表四次 Enter/Tab：接受 __call／__invoke、排除 __construct，准确文本、光标、Undo/Redo 和磁盘保护通过。
- Semantic／Server／Core 构建、扩展测试完整编译及定向 lint 退出 0。

完整当前 stdio 与 Core C2 已启动集中验证，见[记录](completion-declaration-integration-2026-10-03.md)。本记录不声称完整协议、Windows 或真实 WSL 使用通过。没有打包、提交、推送或更新 Profile。
