# PHPDoc callable 调用契约验收

日期：2026-09-15。范围：函数或方法参数上可证明未修改的 PHPDoc `callable(...)` 契约。

## 行为契约

- `@param callable(Input $value, string $label=): Result $callback` 的首次直接变量调用显示 `$callback(Input $value, string $label = default): Result`，具名参数定位使用 PHPDoc 中的真实参数名；未命名参数使用稳定的 `arg1`、`arg2`。
- 调用参数映射复用现有位置、具名、可选和 variadic 规则；缺少必填参数发布 `php.argument.missing-required`，已证明不兼容的直接实参发布 `php.argument.type-mismatch`。
- 普通返回、模板和条件返回仍由既有 PHPDoc callable 求值器传播，本轮没有建立第二套返回推断。
- 参数必须非引用，且在调用前没有被读取或重新赋值；只允许一次未触碰的直接局部别名。提前读取、重赋值、重复别名使用、动态来源或无法解析的类型保持 unknown。

## 自动验证

semantic 回归验证具名签名、可选参数、结果 `Result::done()` 补全、唯一缺参/错参，以及提前读取和重赋值后不提供签名。真实 stdio Language Server 回归在 PHP 8.1 Composer 项目中验证同一 Signature Help、两个稳定诊断代码和返回成员补全。

- `pnpm check`：类型检查、ESLint、十六个组件 644 项与根扩展 35 项测试全部通过，共 679 项；三份 VSIX 构建及内容校验通过。
- `pnpm verify:packages`：十六个组件 tarball 均可由隔离消费者安装和导入。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 成功加载打包 Core VSIX，Extension Host 退出码为 0。

提交 `8a46213` 的 [CI 34953462952](https://github.com/sohophp/php-companion/actions/runs/34953462952) 18/18 成功，覆盖 Linux、Windows、macOS Quality、打包 Extension Host、冻结七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。对应私有 Alpha 候选位于 `artifacts/php-companion-alpha-0.4.5-8a462132/`，绑定完整功能提交 `8a4621325cca8dbdd63a7ce7e2607eb9e5c1ba62`。

该增量只增加已有语义事实的消费路径，没有改变 parser 快照内容；当前语义快照继续使用 schema 75，Language Server 持久缓存继续使用 v47。

## 边界

本轮不推断属性、数组槽位、运行时构造的 callable，也不从只声明为原生 `callable` 或 `Closure` 的参数猜测参数和返回签名。PHPDoc callable 从函数返回值进入局部变量，以及闭包字面量赋值后的完整调用契约仍属于后续 P4 范围。
