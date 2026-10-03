# 补全接受：注释后的已有括号

2026-10-02。回到补全专项的接受文本步骤，不扩大模板种类。

## 复现和修复

两版真实 LSP 的修改前用例均失败：`formatVal/* note ( */()` 候选的插入文本为 `formatValue($0)`，接受后会重复添加括号。原服务器四条入口只看空白后的括号。

新增共享 `hasFollowingCallParenthesis`，顺序跳过空白、闭合块注释和单行注释，判定下一 PHP token 是否为左括号。函数调用、成员方法、new 类名及魔术方法声明统一使用它；已有参数表时只替换名称，没有参数表时沿用原有括号／光标片段。PHP 7 的 hash-bracket 注释与 PHP 8 Attribute 由目标版本区分。

规则依据 [PHP 注释手册](https://www.php.net/manual/en/language.basic-syntax.comments.php)：单行注释遇 PHP 结束标记即结束，块注释在首个结束标记终止。因此扫描不越过 PHP/HTML 边界，也不把注释中的括号当调用。未闭合注释、Attribute、分号及其它 token 有独立反例。

## 验证

- 边界单元 18/18：空白、三种注释、换行、闭合／未闭合、PHP 结束标记与 Attribute／旧版注释。
- PHP 7.2／8.5 真实 LSP 2/2；五类位置 × 五种间隔 × 两版本，共 50 次候选插入文本与 PlainText 检查，未保存变更、磁盘原文保护通过。与单元合计 20/20，6.29 秒。
- 当前根 Core 的 Linux VS Code 1.140.0 可见列表：五类位置分别用真实 Workbench Enter／Tab，共十次接受；精确文本、名称后光标、空选区、单次 Undo／Redo 和磁盘不变全部通过，宿主退出 0。不是用手动 applyEdit 代替键盘接受。
- server／Core 构建、定向 ESLint、扩展夹具 noEmit 与 diff 检查通过。首次夹具 noEmit 因 VS Code Thenable 不能赋给 Promise 失败，接口改为 PromiseLike 后通过；运行逻辑没有改变。

宿主复用已有 Core C1 基线、隔离用户数据和 CDP 键盘工具；临时 runner 只改变测试 suite 路径，没有修改正式 runner 或安装 Profile。日志 `/tmp/sophp-call-trivia-*`。

本轮只跑受影响的合同与接受门禁。之前 449 协议集合、1134 语义及完整 C2 属于这次服务器修改之前的构建，不借用为当前全量。Windows 当前宿主和真人 WSL 尚未验收；未打包、提交、推送或更新 Profile。

[源码与宿主证据](completion-call-trivia-2026-10-02.json)。
