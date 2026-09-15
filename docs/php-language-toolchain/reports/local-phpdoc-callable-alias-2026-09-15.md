# 局部 PHPDoc callable 别名传播验收

日期：2026-09-15。范围：局部 PHPDoc callable 赋值注解或独立断言的一次直接变量别名。

## 行为契约

- 紧邻赋值的 `@var callable(...) $source` 和同块独立 `@var callable(...) $source` 均可沿 `$alias = $source` 传播一次，别名调用保留参数名、可选/variadic 与返回类型。
- 别名调用复用位置、具名和参数类型映射；缺少必填参数发布 `php.argument.missing-required`，已证明不兼容的直接实参发布 `php.argument.type-mismatch`。
- 返回类型继续通过共享 PHPDoc callable 求值器进入局部赋值、成员补全与导航。
- 来源契约、别名赋值和调用必须位于同一词法作用域；来源在别名前后被读取或修改、别名重赋值、引用修改或控制流内赋值时保持 unknown。

## 自动验证

semantic 回归分别覆盖赋值注解来源和独立断言来源的别名签名、返回成员补全、缺参和错参，并验证来源提前读取、别名后来源重赋值及分支别名反例。真实 stdio Language Server 回归验证同一别名 Signature Help、两个稳定诊断代码及结果成员补全。

- `pnpm check`：类型检查、ESLint、十六个组件 648 项与根扩展 35 项测试全部通过，共 683 项；三份 VSIX 构建及内容校验通过。
- `pnpm verify:packages`：十六个组件 tarball 均可由隔离消费者安装和导入。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 成功加载打包 Core VSIX，Extension Host 退出码为 0。

跨平台 CI 结果将在对应验证完成后补入本报告。

本轮只重用已有赋值、引用、控制流位置和 PHPDoc 标签事实，没有改变 parser 或 semantic 快照结构；当前语义快照继续使用 schema 75，Language Server 持久缓存继续使用 v47。

## 边界

当前只传播一层直接变量别名，不传播别名链、属性、数组槽位、闭包捕获或跨控制流合流。动态来源、引用、任一无法证明的修改或身份歧义继续保持 unknown。
