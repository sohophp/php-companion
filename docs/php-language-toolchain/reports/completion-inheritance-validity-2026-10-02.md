# 继承补全：过滤已证明非法的候选

2026-10-02。本轮关闭继承声明候选的 final、readonly 与已证明循环边界。

## 实现

修改前定向七项中六项失败：继承列表推荐 final、自身、后代和 readonly 不兼容类型。把原有继承类别提升为包含声明 FQCN、readonly 与 extends 角色的上下文。只在类继承时排除 final 与 readonly 不匹配；在 extends 位置排除自身和已有语义图证明的后代。图不完整、无法证明关系时保留候选。接口 extends 同样防止自身与已证明循环。

文件首个声明也纳入识别。源码类型依赖表面摘要加入 finalClass，以便修饰符修改影响依赖事实。前缀匹配后才检查继承图，避免对全部无关类型遍历。

普通参数类型与 new 仍可推荐 final 类；抽象基类在 extends 仍正常保留。未保存 provider final 切换会撤回／恢复候选。

规则参考 [PHP final 手册](https://www.php.net/manual/en/language.oop5.final.php)与 [readonly 类手册](https://www.php.net/manual/en/language.oop5.basic.php)。实际 PHP 7.2／8.5 的 final 继承均退出 255，PHP 8.5 的 readonly 双向不兼容继承退出 255，readonly 双方匹配退出 0。

## 当前验证

- 新增语义 7/7；与上一轮注释矩阵合计 29/29。
- 最终源码完整语义 1171/1171、50 文件、零跳过；精确耗时见终态日志。
- PHP 7.2／8.5 新增真实根 bundle LSP 2/2，共 24 次继承候选查询；与继承注释、构造注释合计 6/6，5.83 秒。
- Linux VS Code 1.140.0 当前根 Core 八次真实 Workbench Enter／Tab：Provider 和可见列表均无非法候选；接受文本、光标、Undo/Redo 与磁盘保护通过，退出 0。包含命名空间别名与 CRLF。
- 1003 个类的独立 Composer 单文件，200 轮未保存 mutable／readonly 声明切换：候选首位及撤回正确、磁盘原文不变。P50 39.55 ms、P95 57.34 ms、首次／最大 258.61 ms。热查询预算通过；首次等待单列，不代表多文件 vendor 项目或可见弹窗。
- semantic／server／Core 构建、定向 ESLint、扩展夹具 noEmit 与 diff 检查通过。

所有最后一轮宿主和协议都在前缀过滤优化后的根构建运行。此前第一次全量及宿主也通过，但不借用为最终证据。

未重跑完整 449 协议集合或 Windows 宿主，真人 WSL 未验收。未打包、提交、推送或更新 Profile。

[机器可读证据](completion-inheritance-validity-2026-10-02.json)。
