# D93 Reflection 构造补全的版本合同

日期：2026-10-05；基于 `1e740406`，继续内建构造候选核对。

## 依据与修改

实际六套 CLI 的 96 条 Reflection／DOM 构造记录表明：不能仅因为类型通常由工厂返回就禁止 `new`。ReflectionNamedType、存在的 Union／IntersectionType、现代 Dom 的三种集合类仍允许空构造；保留原候选。已建模的 ReflectionAttribute／Reference 私有构造继续排除，类型引用保留。

确认的缺口是 **ReflectionType 在 PHP 7 可直接构造，从 PHP 8.0 才成为抽象类**。固定 [phpstorm-stubs 声明](https://raw.githubusercontent.com/JetBrains/phpstorm-stubs/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/Reflection/ReflectionType.php)描述现代抽象类；[PHP 官方变更记录](https://www.php.net/manual/en/class.reflectiontype.php)给出 8.0 边界。本批仅按目标版本生成 `abstract` 修饰符，原方法、继承、版本和扩展规则保持；没有给子类型或 DOM 集合添加虚构的私有构造函数。

新增九版语义先复现 PHP 7.2／7.3／7.4 候选缺失，原始结果 6 通过／3 失败。修复后九版通过，覆盖直接／注释／导入别名构造、参数／返回／导入／instanceof 引用、同名用户类，以及带括号构造的抽象类诊断。实际 CLI 为 7.2.34、7.4.33、8.1.34、8.2.32、8.4.23、8.5.9；7.3／8.0／8.3 是配置版本验证，未冒称实际 CLI 运行。

## 验证

- 完整语言规格 **15 文件／249 项**、最终完整语义 **110 文件／2459 项**全部通过，零跳过。
- 真实 stdio 的 PHP 7.2／8.5 × onDemand／experimental，共 **4 项、172 次未保存状态查询**；当前诊断版本、候选包含／排除、插入括号及磁盘保持通过。experimental 明确等待完整索引后检查抽象类诊断；onDemand 保留现有完整根门槛，不宣称未完成索引时已提供该诊断。
- 当前正式产物的两版隔离 Linux VS Code，共 **16 次**可见首项、词中 Enter／Tab 接受全文／光标、Undo／Redo 与磁盘保持通过。PHP 7 构造 ReflectionType、PHP 8 构造具体子类型，以及两版共同的基类类型引用／导入与构造别名接受均有证据；等待 123–270 ms，来自预加载后的显式触发，不算真人 WSL 或自动弹出验收。
- 16 份实际接受文本在对应 PHP 7.2／8.5 CLI 上 `-n -l` 通过；独立语义／服务器／正式构建、宿主 TypeScript、限定 ESLint 与 diff 检查通过。

## 相邻缺口与失败记录

增加诊断断言时发现，合法的 **`new Type;` 省略括号写法没有 ParsedCall**。实际 PHP 8.5 中 `new ReflectionType;` 应拒绝，但语义不报抽象构造错误；带括号形式有调用事实并能诊断。该轮完整语义 2453 通过／6 失败、协议 1 通过／1 失败均保留；直接解析／语义对照进一步确认这一缺口。

另外一轮把完整根诊断误当作 onDemand 的即时诊断，带括号协议仍有一项失败。核对服务器后明确原诊断依赖完整根，最终加入两个索引模式并保留其真实边界。原省略括号的补全检查没有删除；完整构造诊断限定为带括号且满足对应索引条件。**不把这些调整说成省略括号诊断已经修复。**

下一批 D94 专门补齐省略括号的构造事实、诊断和相关重构范围，防止引入空参数范围后改坏类型名称。其复现与各次原始失败摘要见 [结构化记录](completion-reflection-construction-2026-10-05.json)。

D91 的 902 项完整 LSP 仍只属于旧检查点 `1f98b410`；D92–D93 当前完整组合待后续统一复核。D92 普通连续编辑 PHP 7.2 P95 186.39 ms 仍超 150 ms，本批不重复测量。其它平台、规模、长会话、峰值内存和真人 WSL继续单列；未打包、更新 Profile、推送或发布，goal active。
