# C3 静态方法 Extract Method 与魔术常量边界

日期：2026-09-25。独立 Composer 夹具、10 项 Open Source Pack 源码 Profile；未修改 Winstar 文件或打包 VSIX。

`Extract Method` 现在可从静态方法中提取已证明的选区。原位置调用 `self::extractedMethod(...)`，新方法声明为 `private static function`，不会在静态上下文生成 `$this`。语义用例覆盖静态参数返回与 `self::` 方法调用；涉及 `static::`、`parent::` 的静态选区仍拒绝，以免在未证明晚期静态绑定及父类解析时改变语义。

移动语句会改变 `__METHOD__`、`__FUNCTION__`、`__LINE__` 的值，因此静态和实例方法的这些选区均拒绝提取；字符串字面量中的同名文本不受影响。新增用例先验证静态提取原本返回空结果；实现后完整语义包 397/397 通过，TypeScript、相关 ESLint 与差异检查通过。

完整 C3 Open Source Pack 源码宿主验证了静态 Code Action、预览取消、应用、一次 Undo/Redo，以及 `__METHOD__` 选区不提供提取；退出码 0，日志 `/tmp/sophp-c3-static-extract-pack10-20260925.log`。该源码改动尚未进入已冻结的私有候选 `21977ee1`；真实 WSL Remote、跨平台和长期使用仍属 C4，新文件生成的一次 Redo 仍开放。
