# Generator 函数体类型推导验收

日期：2026-09-08。范围：从项目函数和普通方法的函数体推导 Generator 泛型，并把结果用于真实编辑请求。

## 支持范围

- 无原生返回类型或声明原生 `Generator` 的唯一函数、普通实例方法和静态方法，可以推导 `Generator<TKey, TValue, mixed, TReturn>`。
- 直接 `yield $value` 使用 int 键；`yield $key => $value` 接受可证明为 int 或 string 的键。多个分支组成键和值 Union。
- `yield from` 支持静态数组，以及有完整 PHPDoc 泛型的 array、list、iterable、Generator、Iterator、IteratorAggregate 或 Traversable。
- 没有显式 return 时 `TReturn` 为 void；有值或空 return 时分别使用其可证明类型或 null。`TSend` 在没有独立输入契约时保持 mixed。
- 同基 `@return Generator<...>` 可以精化原生 `Generator`，显式文档优先于函数体推导。
- 结果显示在 Signature Help，并沿函数或方法调用赋给局部变量，再进入 foreach 值变量的成员补全和导航。

## 精准边界

分析跳过嵌套闭包、箭头函数、嵌套函数和方法中的 yield。任一直接 yield 值、显式键、return 值或 yield-from 来源无法证明时，整项自动推导失败并保留声明的宽 `Generator` 或 unknown；不会只合并已知分支。递归 Generator 调用由独立进行中集合终止。

当前不从 `$received = yield ...` 的后续使用反推 `TSend`，不分析 yield-from 表达式自身的返回值，也不为动态 iterable、对象属性别名或任意 Iterator 实现猜测模板实参。值类型 Union 的公共成员传播仍沿现有复合类型能力逐步扩展。

## 验证

- Language Server Generator 正反例覆盖直接 yield、int/string 键 Union、对象 return、静态数组及泛型 iterable 委托、无返回声明、原生 Generator、显式 PHPDoc 优先、嵌套闭包排除、函数、实例/静态方法结果、局部变量 foreach 传播，以及未知 yield 整体降级。
- language-spec 8 项、phpdoc 12 项、parser 41 项、project 6 项、index 7 项、type-system 17 项、interop 3 项、semantic-provider 5 项、semantic-provider-host 4 项、framework-symfony 20 项、framework-doctrine 2 项、semantic 180 项、refactor 6 项、Language Server 63 项、testkit 5 项全部通过；十五个组件共 379 项，加仓库既有 30 项共 409 项。
- 全仓 TypeScript、ESLint 和 `git diff --check` 通过；十五个组件 tarball 从仓库外隔离 consumer 安装运行通过。
- 主 VSIX 重新打包并通过内容校验，SHA-256 为 `ad7f8c8e81c6d43ac1b42c3e3e8b7c7821ab1e81413f8cebb76bd3e759d6f2cb`。
- 最终主 VSIX 在隔离 VS Code 1.136.1 Extension Host 中通过完整用例，退出码 0；真实 Signature Help 显示推导后的 Generator 泛型，foreach 值成员 Definition 回到项目声明。
- 宿主日志未发现 AssertionError、超时、保存冲突、ENOENT、EPIPE 或 stream-destroyed。

宿主日志位于 `/tmp/php-generator-inference-vscode-logs-20260908-1720`。本轮只重建主扩展 VSIX，没有重建 Open Source Pack 或 Recommended Pack，也没有公开发布。
