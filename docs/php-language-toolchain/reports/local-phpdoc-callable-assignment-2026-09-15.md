# 局部 PHPDoc callable 赋值契约验收

日期：2026-09-15。范围：紧邻直接局部赋值的 `@var callable(...) $variable` 契约。

## 行为契约

- `/** @var callable(Input $value, string $label=): Result $callback */` 紧邻 `$callback = factory();` 时，首次直接调用显示 `$callback(Input $value, string $label = default): Result`。
- 参数映射复用位置、具名、可选和 variadic 规则；缺少必填参数发布 `php.argument.missing-required`，已证明不兼容的直接实参发布 `php.argument.type-mismatch`。
- 返回类型继续由同一 PHPDoc callable 求值器传播，可驱动后续成员补全与导航。
- 注解、赋值和调用必须位于同一词法作用域；赋值不能位于条件或循环控制流内。赋值与调用之间存在读取、重赋值或引用修改时保持 unknown。

## 自动验证

semantic 回归覆盖具名签名、可选参数、返回成员补全、缺参、错参，以及介入读取、重赋值和控制流赋值反例。真实 stdio Language Server 回归在 PHP 8.1 Composer 项目中验证局部契约的 Signature Help、两个稳定诊断代码及返回成员补全。

- `pnpm check`：类型检查、ESLint、十六个组件 645 项与根扩展 35 项测试全部通过，共 680 项；三份 VSIX 构建及内容校验通过。
- `pnpm verify:packages`：十六个组件 tarball 均可由隔离消费者安装和导入。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 成功加载打包 Core VSIX，Extension Host 退出码为 0。

提交 `5631186` 的 [CI 34956917624](https://github.com/sohophp/php-companion/actions/runs/34956917624) 18/18 成功，覆盖 Linux、Windows、macOS Quality、打包 Extension Host、冻结七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。对应私有 Alpha 候选位于 `artifacts/php-companion-alpha-0.4.5-56311867/`，绑定完整功能提交 `56311867bdf877877acb4d7c8b4f68824949e7ec`。

该增量只消费已有赋值、引用和 PHPDoc 事实，没有改变 parser 或 semantic 快照结构；当前语义快照继续使用 schema 75，Language Server 持久缓存继续使用 v47。

## 边界

当前只接受紧邻直接赋值且尚未被使用的局部变量，不从普通原生 `callable`、属性、数组槽位、控制流合流或运行时构造过程猜测签名。局部注解的一次不可变别名、独立 `@var` 断言和闭包字面量赋值后的完整调用契约仍属于后续 P4 范围。
