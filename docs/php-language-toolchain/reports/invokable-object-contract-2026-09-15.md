# 可调用对象契约验收

日期：2026-09-15。范围：可静态证明为唯一非空对象类型的直接变量调用，以及该类型唯一公开实例 `__invoke()` 契约。

## 行为契约

- `$handler(...)` 的类型必须来自现有统一对象推断，并唯一解析为非空类或接口；没有增加按名称猜测。
- 目标类型必须恰好提供一个公开、非静态的有效 `__invoke()` 成员。自身声明、继承声明和接口声明进入同一成员解析、可见性与模板替换路径。
- Signature Help 使用调用点变量名，并保留 `__invoke()` 的位置/具名参数、默认值、variadic、引用和返回类型。
- 完整调用复用普通方法的参数绑定、严格/宽松标量、PHPDoc 与模板校验，发布缺少必填参数及已证明类型不匹配诊断。
- 实参兼容且返回类型可证明时，调用结果进入局部赋值、成员补全和 Definition；局部对象别名沿既有变量类型传播自然获得相同契约。
- nullable、Union 歧义、非公开、静态、缺失或未解析 `__invoke()` 的目标保持 unknown，不发布错误肯定结果。

## 自动验证

- Semantic 回归覆盖直接参数、继承类、接口、局部别名、具名参数、缺参、错参和返回成员补全，并覆盖 nullable、Union 歧义与 private `__invoke()` 反例。
- 真实 stdio Language Server 回归通过独立服务器进程验证 Signature Help、稳定诊断代码和结果成员补全。
- 实现只复用现有声明、成员和调用事实，没有新增持久快照字段；semantic schema 76 与 Language Server v48 缓存仍然有效。
- `pnpm check`：类型检查、ESLint、十六个组件 653 项与根扩展 39 项测试全部通过，共 692 项；三份 VSIX 构建及内容校验通过。
- `pnpm verify:packages`：十六个组件 tarball 均可由仓库外隔离消费者安装和导入。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离 Profile 成功加载打包 Core VSIX，完整 Extension Host 回归退出码为 0。

提交 `9c82d22` 的 [CI 34978077566](https://github.com/sohophp/php-companion/actions/runs/34978077566) 18/18 成功，覆盖 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。

对应私有候选位于 `artifacts/php-companion-alpha-0.4.5-9c82d22d/`，绑定完整提交 `9c82d22d5eef8125551294558d138239605c39a3`；三份 VSIX 的 `sha256sum -c SHA256SUMS` 均返回 `OK`。最新只读真实项目门禁中，Winstar 2,256 个和 CoreRepo 1,137 个项目 PHP 文件完整进入索引，抽样声明均为 100/100，References P95 分别为 26.22/18.48 ms，两个冻结补全与 Definition Oracle 均通过。
