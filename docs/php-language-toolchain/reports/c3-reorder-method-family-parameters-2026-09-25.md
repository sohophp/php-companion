# C3 方法家族参数重排

日期：2026-09-25。在 PHP 方法参数上执行“预览并重排 PHP 方法参数”，选择新位置后，同步接口、实现类、PHPDoc 和可证明的位置调用。实现类的参数名称可以不同；重排按参数位置对应。本报告记录初始门禁；后续已扩展[变量实参](c3-reorder-variable-arguments-2026-09-25.md)、[纯字面量数组实参](c3-reorder-literal-array-2026-09-25.md)、[混合实参](c3-reorder-mixed-named-arguments-2026-09-25.md)、[默认参数](c3-reorder-optional-parameters-2026-09-25.md)与[同名 callable 归属](c3-method-family-callable-scope-2026-09-25.md)。

## 支持范围

- 要求方法家族、层级和调用目标完整可证明。接口与实现类的参数数量一致；提升属性、引用参数、可变参数，以及无法证明目标的动态或间接调用保持拒绝。默认参数只支持必填/可选段内的安全换位。
- 全命名实参保留原顺序；纯位置调用只在已提供参数集合不变且实参可证明无副作用时换位。混合实参在名称归属明确时转为具名实参；unpack 和可能改变求值效果的纯位置表达式保持拒绝。
- 多行 PHPDoc 的 `@param` 标签与对应声明一起重排。无法精确对应全部参数或标签块不连续时不生成编辑。
- 关闭文件按需临时解析语法树并在计划生成后释放。编辑进入统一预览，包含源版本和目标摘要检查；取消、应用、一次 Undo/Redo 已验证。

## 验证

- 初始 Semantic 定向正反例与参数新增、删除合跑：3 个文件、位置和命名实参、不同实现参数名，以及副作用和当时尚未支持的混合实参拒绝，7/7 通过。新增支持域的独立证据见上方四份后续报告。
- 受影响文件 ESLint、Language Server 与扩展 TypeScript 编译、`git diff --check` 通过。
- 隔离 Core 宿主及当前 11 项 Open Source Pack 源码 Profile 均通过三文件计划、预览、取消、应用、一次 Undo/Redo。日志分别为 `/tmp/sophp-c3-reorder-host3.log`、`/tmp/sophp-c3-reorder-pack.log`。

这仍是静态可证明的工作区子集。工作区外公开 API 不会被自动编辑；生成文件的 Redo 和 Pack 中 PHPUnit 的已知组合问题仍是下一批 C3 工作。没有修改 Winstar，也没有为本次增量打包 VSIX。
