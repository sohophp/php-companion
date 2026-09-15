# first-class callable 调用传播验收

日期：2026-09-15。范围：PHP 8.1+ first-class callable 获取后的局部变量调用。

## 行为契约

- `functionName(...)`、`Type::method(...)` 和 `$object->method(...)` 在目标唯一时保留同一个声明签名；获取表达式自身仍是原生 `Closure`，不会被误判为调用目标。
- 后续 `$callback(...)` 使用原参数名、默认值、variadic、by-reference、PHPDoc/原生参数与返回类型，向编辑器提供 Signature Help、缺少必填参数和已证明类型不兼容诊断。
- 普通、具名和模板实参共用既有调用绑定器；已证明返回可继续进入局部赋值、成员补全与 Definition。
- 最多沿八层直接局部别名追踪；重新赋值、按引用修改、动态 callable、多个候选、别名循环或预算耗尽时保持 unknown，不使用名称猜测。
- 语义快照升级到 schema 75，Language Server 持久缓存升级到 v47；旧缓存不会恢复成缺少变量调用事实的部分语义视图。

## 验证场景

semantic 回归覆盖直接函数、静态方法、实例方法、具名调用、泛型 identity 返回、一层安全别名、缺参、错误对象参数，以及重赋值后不传播的反例。parser 回归确认变量调用成为调用事实，但 `target(...)` 仍标记为 first-class acquisition。

真实 stdio Language Server 回归在 PHP 8.1 Composer 项目中验证：`$callback($input)` 显示原 `build(Input $value): Result` 签名，返回值补全 `Result::done()`，空调用发布 `php.argument.missing-required`，字符串实参发布唯一 `php.argument.type-mismatch`。

## 本地门禁

- `pnpm check`：类型检查、ESLint、十六个组件 642 项与根扩展 35 项测试全部通过，共 677 项；三份 VSIX 构建及内容校验通过。
- `pnpm verify:packages`：十六个组件 tarball 均可由隔离消费者安装和导入。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 成功加载打包后的 Core VSIX，Extension Host 退出码为 0。
- `pnpm benchmark:persistence -- 1000`：冷索引 2,274.73 ms；schema 75 热恢复 805.15 ms，恢复 1,000/1,000、重解析 0，热/冷比 0.354。损坏派生层或 callable 记录时均只重建一个文件；聚焦补全只加载 `Consumer::inspect`。

## 边界

本轮只传播源码中可证明且未修改的局部获取关系。属性、数组槽位、函数返回的 Closure、序列化 callable，以及运行时改变目标的动态调用保持 unknown。该增量不宣称 P4 全部调用传播已完成。
