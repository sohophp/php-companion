# C3 方法家族参数删除

日期：2026-09-25。目标是在独立 PHP 工作区中，从接口声明选中参数后，预览并同步删除接口、实现类、PHPDoc 和可证明的调用实参。

## 已实现范围

- 非 private 方法要求完整层级、同一参数位置和可编辑的方法家族；private 方法沿用已有的安全删除计划。
- 仅当家族每个声明中的目标参数均未在方法体使用时才生成计划。动态调用、数组 callable、first-class callable、unpack 和未知调用归属保持拒绝或不生成编辑。
- 直接调用中的目标实参只接受无副作用的标量字面量；PHP 8 命名实参按每个声明自身的参数名识别，位置实参按序号识别。
- VS Code 命令先展示完整预览，并检查源文件版本和目标摘要；取消不会改动文件，应用后可一次 Undo/Redo。

## 验证

- Semantic 定向测试：接口与两个使用不同参数名的实现类、两种命名实参及位置实参；四文件共 9 处编辑。实现类使用目标参数和实参为函数调用的反例均拒绝。与新增参数合跑 5/5 通过。
- `pnpm build`、扩展测试 TypeScript 编译、受影响文件 ESLint 和 `git diff --check` 通过。
- `PHP_COMPANION_TEST_C3_ONLY=1` 隔离 VS Code 宿主通过四文件预览、取消、应用、Undo、Redo；同一测试在 11 项 Open Source Pack 源码 Profile 下通过。日志分别为 `/tmp/sophp-c3-remove-host.log` 和 `/tmp/sophp-c3-remove-pack.log`。

## 后续

这是完整工作区中可证明的静态子集。工作区外公开 API、动态分派和复杂实参仍不能保证同步改写；下一项是参数重排，并继续处理生成文件的 Redo 与 Pack 中 PHPUnit 的已知组合问题。没有修改 Winstar，也没有为这次源码增量生成 VSIX。
