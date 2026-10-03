# readonly 匿名类：正式源码修复

2026-10-02。状态：声明、补全、版本与赋值诊断正式接入，受影响门禁通过。

## 修复

解析树包含 readonly_modifier，但匿名类提取固定 readonlyClass=false；类型补全因此错误推荐 mutable 基类，属性也丢失隐式 readonly。读取真实修饰符后，普通／提升属性使用已有 readonly owner 规则。

语言规格区分匿名 readonly 类（PHP 8.3）、具名 readonly 类（8.2）与显式 readonly 属性（8.1）。analysis 的隐式属性声明诊断按 owner 是否匿名选择版本。语义赋值／已初始化属性引用迭代也使用属性声明方的 minimum 事实；匿名子类继承具名 readonly 基类的属性仍保留声明方 8.2，不能全部升级为 8.3。

来源为 [PHP 匿名类手册](https://www.php.net/manual/en/language.oop5.anonymous.php)；实际 PHP 8.2 拒绝 readonly 匿名类，8.4／8.5 接受。原复现与隔离原型见[审计记录](completion-readonly-anonymous-audit-2026-10-02.md)。

## 正式验证

- parser 全量 93/93、两文件；完整与声明快照、修饰符注释反例及普通／提升属性通过。
- 语言规格全量 159/159、五文件；三类 readonly 的六目标版本边界与范围通过。
- 完整语义 1184/1184、52 文件、零跳过，55.36 秒；未保存父类候选、赋值 minimum 与继承声明方边界通过。
- 相关语言服务器 56/56、四文件、17.69 秒；包括已有 analysis、readonly analysis、新增 8.2／8.3／8.5 真实根 bundle LSP（三次未保存 mutable→readonly→mutable，合计九次候选／诊断更新），以及匿名继承协议回归。磁盘原文不变。
- 当前根 Core Linux VS Code 1.140.0 可见列表与六次真实 Enter／Tab，精确文本、光标、Undo/Redo、磁盘保护通过。包含 readonly 与注释组合，退出 0。
- 四包与根构建、定向 ESLint、扩展夹具 noEmit、diff 检查通过。

1003 类独立 Composer 单文件，200 轮真实 stdio 未保存匿名类修饰符切换；候选首位、旧类别撤回和磁盘保护均正确。P50 41.74 ms、P95 62.1 ms、首次／最大 270.06 ms。只属该单文件样例，不等同多文件 vendor、Windows 或可见弹窗等待。

## 集成构建边界

接入前完整协议原会话 9902 已退出 0：459/459、九文件、零跳过、1404.55 秒，终态 913 输入一致；完整 C2 原会话 92872 已退出 0。之后才应用四份修复，保留已有未提交变更。上述全量协议与完整 C2 属于接入前构建；本批使用新的正式定向与可见宿主，不借用为接入后全量。

未打包、提交、推送或更新 Profile。Windows 当前宿主、真人 WSL 及其它路线图阶段仍开放。

[机器可读证据](completion-readonly-anonymous-2026-10-02.json)。
