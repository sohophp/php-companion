# 继承 final 魔术方法：候选合法性审计

## 当前缺口

声明上下文当前只提供当前类型已直接声明的方法名；服务器按该集合和 PHP 版本过滤魔术方法，没有排除继承而不可重写的 final 方法。复用现有普通 members 也会漏掉 __construct／__destruct，因为其默认可见成员查询刻意不含它们。

## 原型与运行时

仅在 `/tmp/sophp-magic-final-prototype/index.mjs` 的 dist 副本增加声明查询模式，包含生命周期方法并传播父类／Trait 的现有组合规则，关闭 PHPDoc mixin 参与，缓存身份增加此模式；普通成员模式不变。声明上下文原型只针对唯一可解析父类收集 final 魔术方法及 visibility，未知／重复声明不猜测。

十二项原型通过：public／private 构造与 private invoke、普通非 final 构造、当前类 Trait、父类 Trait、父类自有覆盖 Trait、祖父类、mixin、不存在父类、重复父类、namespace 导入别名。

PHP 7.2／8.5 各十项实际加载，共二十项记录 `/tmp/sophp-magic-final-runtime-audit.json`。final public／private constructor 子类重写都失败；final public invoke 重写失败。final private invoke 在 PHP 7.2 禁止，而 PHP 8.5 允许并警告 final private。当前类自有方法覆盖 Trait final 方法允许；父类使用 Trait 后子类覆盖 final 方法禁止。普通父类构造允许重写，祖父 final 仍禁止。

正式服务器过滤应按目标版本保留私有普通魔术方法 PHP 8 差异，构造始终按 final 限制；目标类自用 Trait 不按父类继承过滤。PHP 官方来源：https://www.php.net/manual/en/language.oop5.final.php 。

## 未完成边界和接入

PHP 8.3+ Trait `as final` 适配当前解析字段没有 final，需在本组正式接入时核对和补齐，而不是声称 Trait 全族已经完整。当前原型并未修改解析器、服务器或产品源码；未作 LSP／宿主接受验证。待完整 stdio 原会话 35082 终态，复核所有 2950 项输入后再接入，期间保持源码不变。完整 C2 原会话 98994 已退出 0，65 条证明。

未打包、提交、推送或更新 Profile。

## Trait as final 原型补充

[PHP 官方 Trait 手册](https://www.php.net/language.oop5.traits)说明 as final 自 PHP 8.3 起支持。当前语法树对带别名形式把 final 标成 ERROR；不带别名也产生 ERROR，原解析 facts 均缺失。PHP 8.5 十种实际加载验证表明合法的带／不带别名形式可由当前类覆盖，但子类不可覆盖；测试的两种 final 与可见性组合实际语法失败，不能擅自恢复为合法。

隔离解析器副本在确认 use_list 内的 final 适配后做等宽恢复，保留所有 source ranges，从原文读取 final／alias；六项语法与事实原型通过，包含带别名、无别名、注释、普通可见性及保留非法组合错误。隔离语义副本再传播 final 到既有 Trait 组合和声明查询模式，六项候选事实原型通过；此前十二项原型复跑仍通过。均未接入产品。

正式接入还需类型接口、恢复树增量身份、PHP 8.3 以下版本诊断、服务器过滤、未保存语法／候选撤回与宿主接受测试。原 stdio 35082 仍 live，2950 项输入再次一致。

后续源码与定向验收已完成，见[正式接入报告](completion-inherited-final-magic-2026-10-03.md)；本文件保留审计时点的历史证据。
