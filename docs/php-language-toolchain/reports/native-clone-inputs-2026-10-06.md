# D150：clone-with 原生写入与解析恢复

## 修复范围与来源

PHP 8.5.9、64 位实际观察发现：在测试的原生属性上，`clone($object, ['mode' => '42'])` 使用弱标量转换，即使调用者有 `strict_types=1`；同一调用者直接写属性可能拒绝该值。原实现沿用调用者严格度，并把 PHPDoc 专化后的类型用于原生写入，造成候选误删或误放行。

原生 384 次观察中，clone 与普通属性写入有 70 处区别。语义 512 场景基线有 260 处差异：204 次误删、56 次误放行。第一隔离原型减少至 16 处；这些都涉及字符串尾部空格，旧语法树丢失了完整赋值。

当前实现：

- clone 写入复用原生标量转换与浮点词法来源；原生属性声明和 PHPDoc 分开，缓存随声明数组更换失效。
- 复用唯一、完整的类层次检查，按调用者作用域检查写权限与 `__clone` 可见性；保留合法 readonly 重初始化和 setter 输入声明。
- 重复数组键按最终值检查；支持此批已证明的数值字面量形式。
- 解析器仅对已识别的 clone 关键字做等宽恢复，保留源码位置、嵌套普通调用和真实 `_lone()`，不改变 PHP 字符串、注释或 HTML。
- 版本检查读取原文，区分旧版合法的 `clone($object)` 和 PHP 8.5 的更新参数／尾逗号；不把恢复后的节点当成普通函数引用。

实现依据为[已采纳 RFC](https://wiki.php.net/rfc/clone_with_v2)、[PHP 手册](https://www.php.net/manual/en/language.oop5.cloning.php)和[PHP 8.5.9 clone 实现](https://raw.githubusercontent.com/php/php-src/php-8.5.9/Zend/zend_objects.c)。转换差异由真实执行确认；文档中的普通赋值描述没有单独证明严格度。

基于本地 `1884d233`，验证时尚未提交。bundle SHA-256 `51d8a87e6bafeb08b80522881fc3ce980db0272f7eae3eb7cc9d5a06c4f50fee`；engine v76，旧引擎派生缓存失效。此记录绑定该批源码，不证明已安装的 Profile。

## 原生与源码回归

- 正式 `scripts/check-native-clone-inputs.mjs`：PHP **8.5.9／64 位，444 条观察全部一致**。其中 384 条是普通写入、变量 clone、成员 clone 的对照；60 条覆盖可见性、readonly、set 权限、Hook、提升属性、继承、Trait、PHPDoc 与重复键。原生未运行的版本不获得资格。
- 隔离原型数值 **512／512**、边界 **120／120**、解析／版本／缓存 **98／98**通过。边界初版有 24 处差异，修复 Hook、clone 权限与重复键后消除。准备脚本曾读取不存在的 `ParsedCall.name`；改为核对真实名称范围，未修改产品期望或原生观察。
- 正式新增语义 **648 项**通过，包括 Completion／Definition、保留／临时语法树、未保存变更与版本正反例。
- 当前完整解析器 **158 项**、语言规格 **312 项**通过。
- 当前完整语义 **141 文件／20820 项**一次通过，零失败／跳过／TODO，**72.341 秒**。完整保留前次 20172 项及八组重复名称的次数；**3111** 份冻结输入、六 CLI／Node、HEAD 与工作树状态在整轮前后保持一致。
- 构建、定向 ESLint 与 `git diff --check` 通过。

## LSP、编辑器与性能

四个相关 LSP 文件共 **63 项**通过：analysis 48、原生诊断 6、新 clone 8、运行时语法矩阵文件 1。新协议用例覆盖两索引模式、两种 operand、两种调用者严格度、首次补全、未保存合法／非法修改、重启缓存、Hover／Definition 与磁盘不变。首次请求就是补全，没有 readiness 查询预热。这不是整个 LSP 的资格。

Linux 隔离源码宿主两组四次自然接受通过：onDemand 严格调用者＋带尾空格数值字符串；progressive 成员 operand＋`42.`。实际 Enter／Tab 文本、光标、Undo／Redo、Hover／Definition 与磁盘保持通过。没有其它查询或 Provider 预热，没有显式 Trigger Suggest；两组 renderer 异常均为零。可见等待分别 **598／195 ms**、**483／228 ms**。不代表真实 WSL 使用。

固定两文件、PHP 8.5 的两模式各二十个热样本，P95 **5.18／5.32 ms**，符合原 **150 ms** 热预算；首次补全 **150.51／140.46 ms**。这不是普通连续编辑预算，也不能替代 UI 等待。

## 验收边界与后续

本批证明变量／成员对象 operand 与可证明字面量更新表。任意表达式、集合变量、转义动态键、自定义 handler，以及每个 Hook／`__clone` 的执行与副作用均未整体证明；Hook 输入模型以正常返回为前提。保留对象类型不等于新建了逐实例 PHPDoc shape 更新机制。

原始 C1–C4／R4 保持。当前完整 LSP、D148 整轮关闭超时根因、普通编辑 155.06 ms、裸 `$` 说明、50k 缓存内存、其它消费者、缺失实际 PHP 版本／平台和真人长使用仍开放。

机器报告：[native-clone-inputs-2026-10-06.json](native-clone-inputs-2026-10-06.json)。原始输出和原型准备保存在忽略目录 `.vscode-test/d150-evidence/`，41 份文件有 SHA-256 清单。

必要本地里程碑提交另有记录；不更新 Profile、打包、推送或发布，Goal active。
