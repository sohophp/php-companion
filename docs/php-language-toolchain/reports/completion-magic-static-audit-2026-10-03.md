# 魔术方法声明 static 位置只读审计

日期：2026-10-03。状态：只读审计，源码未修改；不是完成报告。

当前补全会在 public static function __ 位置建议 __construct、__destruct、__clone 等非法静态方法，也在普通 function __ 位置建议必须 static 的魔术方法。声明接受不修改已有修饰符，故仅名字补全可能留下错误声明。

PHP 7.2／8.5 × 17 种方法 × 普通／static 声明共 68 项实际加载；PHP 8.5 只有 __callStatic／__set_state 可 static，其它十五项 fatal；普通声明的这两项 fatal。PHP 7.2 普通 __callStatic warning；static 构造／析构／clone fatal，八种其它方法 warning；旧版部分 static 声明可加载，与 PHP 8.5 不同。stdout 和 stderr 均检查，不能只读 stderr 而遗漏 PHP 7 警告。

下一源码增量须按声明修饰符、注释和残缺语法选择适用名字，区分未指定修饰符与明确 static，保留当前类/匿名类/枚举和已有方法去重。在明确修饰符不可兼容时不应建议接受即非法的名字；未指定修饰符时，必需 static 方法可考虑补齐修饰符或模板，需独立验证后选择，不能简单删除用户尚可写出的合法方法。

完整 stdio 原会话 50605 的 2958 项输入仍冻结，本次只写报告和独立 /tmp 审计，不重建产品。定向语义、协议和实际编辑器接受尚未做；没有打包或更新 Profile。


## 隔离原型（未接入产品）

- 在 /tmp 独立语义模块按已解析 commentRanges 等长遮蔽注释，取得 function 位置、static 和 visibility。十六项完成／残缺、修饰符换序、注释及 Unicode、Attribute 字符串、引用返回、Trait／interface／enum／匿名类上下文通过。global 函数仅记录上下文，产品仍须通过 class-member 位置门禁。
- 九份独立文本编辑证明：__callStatic／__set_state 在缺少 static 时通过同一 completion 的额外编辑补上；已写 static 不重复插入，参数、注释和 Attribute 保留。主名字替换与 function 前的插入不相交，九份结果均被 PHP 8.5 实际加载，退出 0。
- 原型文件 `/tmp/sophp-magic-modifier-prototype/index.mjs`、`results.json`、`edits-results.json`。这是语义和文本编辑原型，不是真实 LSP/VS Code 接受或 Undo/Redo 验收。

正式实现候选：明确 static 只建议适用魔术方法；非 static 声明保留可用方法，并给必须 static 的候选增加安全的 additionalTextEdits。visibility 已有可靠事实，但候选规则需结合方法合同和版本验证；不擅自改已有 private/protected。注释规范化也必须防止破坏 import/type/expression 的识别。

产品输入仍冻结，不修改或重建主源码。原型首次 root node_modules 缺少 index 包，改用 semantic 的已安装依赖解析后通过；没有重复下载依赖。

原会话 50605 已终态通过 494 项，2958 项输入无变化后释放冻结。后续源码接入及当前定向验收已完成，见[正式报告](completion-magic-modifier-2026-10-03.md)；上文保留审计时点历史，不再代表当前未接入状态。
