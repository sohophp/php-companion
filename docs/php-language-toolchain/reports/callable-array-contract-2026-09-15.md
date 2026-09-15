# 精确 callable 数组验收

日期：2026-09-15。范围：直接赋给局部变量的二元素 callable 数组，以及最多八层不可变直接别名。

## 行为契约

- 解析器只接受 `[$object, 'method']` 和 `[Type::class, 'method']`；两个元素都必须无键，方法名必须是单引号或无插值双引号中的 PHP 标识符。
- 对象接收者必须在赋值点唯一解析为非空对象类型；类接收者必须按当前 namespace/import/`self`/`parent`/`static` 规则唯一解析。
- 实例数组只匹配非静态方法，类数组只匹配静态方法。目标必须唯一、可访问，并在当前首批范围内为 public。
- 变量调用复用普通方法的参数绑定、具名参数、默认值、strict/weak 标量、PHPDoc/泛型校验与返回传播。
- 最多八层同作用域不可变直接别名保留原目标；控制流赋值、重赋值、按引用逃逸、unset、动态方法名、字符串类名、nullable 和目标歧义保持 unknown。

## 自动验证

- Parser 回归覆盖实例、`Type::class` 以及动态方法、字符串类名和多元素反例。
- Semantic 回归覆盖实例/静态签名、具名参数、别名、缺参/错参、返回成员补全、静态性/可见性不匹配、nullable、控制流、重赋值、引用与 unset。
- 快照回归证明 schema 77 的声明优先热恢复仍可按目标 callable 水合数组事实并返回相同签名；旧 schema 会回退源码重建。
- 真实 stdio Language Server 回归通过独立服务器进程验证 Signature Help、稳定诊断代码和结果成员补全；持久缓存版本升级为 v49。

- `pnpm check`：类型检查、ESLint、十六个组件 656 项与根扩展 39 项测试全部通过，共 695 项；三份 VSIX 构建及内容校验通过。
- `pnpm verify:packages`：十六个组件 tarball 均可由仓库外隔离消费者安装和导入。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 成功加载打包 Core VSIX，完整 Extension Host 回归退出码为 0。

提交 `03461a7` 的 [CI 34984747546](https://github.com/sohophp/php-companion/actions/runs/34984747546) 18/18 成功，覆盖 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。

对应私有候选位于 `artifacts/php-companion-alpha-0.4.5-03461a7c/`，绑定完整提交 `03461a7c6135134b446188eab2f1d0ace90ad97f`；三份 VSIX 的 `sha256sum -c SHA256SUMS` 均返回 `OK`。最新只读真实项目门禁中，Winstar 2,256 个和 CoreRepo 1,137 个项目 PHP 文件完整进入索引，抽样声明均为 100/100，References P95 分别为 22.26/18.05 ms，两个冻结补全与 Definition Oracle 均通过。
