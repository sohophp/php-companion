# 独立局部 PHPDoc callable 断言验收

日期：2026-09-15。范围：同一代码块内的独立 `@var callable(...) $variable` 类型断言。

## 行为契约

- 已有局部变量后的 `/** @var callable(Input $value, string $label=): Result $callback */` 可为首次直接调用提供 `$callback(Input $value, string $label = default): Result`。
- 参数映射复用位置、具名、可选和 variadic 规则；缺少必填参数发布 `php.argument.missing-required`，已证明不兼容的直接实参发布 `php.argument.type-mismatch`。
- 返回类型继续通过共享 PHPDoc callable 求值器进入局部赋值、成员补全与导航。
- 断言和调用必须处于同一词法代码块；断言后的读取、赋值、unset、引用修改或跨块使用会拒绝该契约。

## 自动验证

semantic 回归覆盖具名签名、可选参数、返回成员补全、缺参、错参，以及介入读取、重赋值和跨块断言反例。真实 stdio Language Server 回归在 PHP 8.1 Composer 项目中验证相同 Signature Help、两个稳定诊断代码及返回成员补全。

- `pnpm check`：类型检查、ESLint、十六个组件 647 项与根扩展 35 项测试全部通过，共 682 项；三份 VSIX 构建及内容校验通过。
- `pnpm verify:packages`：十六个组件 tarball 均可由隔离消费者安装和导入。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 成功加载打包 Core VSIX，Extension Host 退出码为 0。

跨平台 CI 结果将在对应验证完成后补入本报告。

本轮把既有 standalone `@var` 定位和失效逻辑提取为共享标签解析路径，没有改变 parser 或 semantic 快照结构；当前语义快照继续使用 schema 75，Language Server 持久缓存继续使用 v47。

## 边界

当前只接受有变量名、类型完整、同块且首次直接使用的断言，不从普通原生 `callable`、属性、数组槽位或跨控制流合流猜测签名。局部 callable 的不可变别名和闭包字面量赋值后的完整调用契约仍属于后续 P4 范围。
