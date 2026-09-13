# isset 非空流收窄验收

日期：2026-09-09。范围：把 `isset(...)` 已证明为真的直接变量和静态、非 nullsafe 属性读取转换为非空控制流事实。

## 已完成

- Parser 为 `isset($value)`、`isset($box->item)` 和多参数 `isset($first, $box->second)` 的真路径记录结构化非空事实。
- `if (!isset($box->item)) { return; }` 之后的可继续路径会消费同一事实；普通 false 分支不推断 null-only 类型。
- Semantic 把事实用于实参类型诊断，并为 nullable 对象属性提供成员补全与 Definition。
- 多参数 `isset` 只在整体为真时收窄全部可支持操作数；动态属性和 nullsafe 路径逐项忽略，不制造不完整事实。
- 局部变量重赋值、属性写入以及已有的对象逃逸与调用副作用规则会撤销相应事实。
- 本阶段没有把数组下标、动态成员或 nullsafe 链建模为可跟踪路径。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 通过：15 个组件共 411 项测试、根包 30 项测试通过。其中 Parser 46、Semantic 189、Language Server 78 项。
- 第一次完整测试中的既有 Language Server 泛型数组键用例耗时 5082 ms，超过固定的 5000 ms 上限；没有改动预算，按原配置完整重跑后通过。
- `pnpm verify:packages` 验证 15 个可独立发布组件 tarball；PHP 8.5 fixture 语法检查、`pnpm package`、`pnpm verify:vsix` 和 `git diff --check` 均通过。
- 打包版 VS Code 1.136.1 Extension Host 退出码 0。属性 fixture 冻结八条标量谓词、四条对象流和三条 `isset` 精确诊断，并验证 nullable 对象属性在 `isset` 真路径中的成员 Definition。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `7b7123cd5151b7635972047dc0874a45fe9b900f43ac195d34ee83941671c70a`。
- 宿主标准输出位于 `/tmp/php-isset-flow-host-20260909-0010.out`，原始日志位于 `/tmp/php-isset-flow-vscode-logs-20260909-0010`；错误关键字扫描只命中 Agent Host 的正常 discovery 统计字段 `failed to classify`，没有测试断言失败、超时或未处理异常。
