# 直接 truthy 路径非空流验收

日期：2026-09-09。范围：直接条件目标被证明为 truthy 时，为变量、静态非 nullsafe 属性路径和安全字面量数组键建立非空事实。

## 已完成

- `if ($value)` 的分支内及 `if (!$value) return;` 的后续路径会移除可证明类型中的 null。
- nullable 标量进入实参诊断；nullable 对象属性与 array shape 元素进入成员补全和 Definition。
- falsy 路径可能是 null、false、零、空字符串或空数组，因此保持原类型，不推断 null-only。
- 事实复用既有变量重赋值、属性/数组写入、unset、引用和调用逃逸失效规则。
- mixed、动态成员、nullsafe 路径、变量数组键和复杂表达式保持 unknown。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 418 项测试、根包 30 项测试通过。其中 Parser 46、Semantic 192、Language Server 82 项。
- 拆分后的版本化数组契约和泛型传播回归在原 5000 ms 单测预算内稳定通过；本轮无需重跑完整测试。
- `pnpm verify:packages` 验证 15 个可独立发布组件 tarball；PHP 8.5 fixture、`pnpm package`、`pnpm verify:vsix`、定向 ESLint 和 `git diff --check` 均通过。
- 打包版 VS Code 1.136.2 Extension Host 退出码 0，验证四条 truthy/falsy 精确诊断和两个对象成员 Definition；完整属性/数组 fixture 冻结二十九条诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `d0820f333eda5602a5dc4689c95816b1d34e3af4788221848b52797ea72b0a21`。
- 宿主标准输出位于 `/tmp/php-truthy-flow-host-20260909-0143.out`，原始日志位于 `/tmp/php-truthy-flow-vscode-logs-20260909-0143`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。标准输出存在 VS Code Agent Host 所用 Node `url.parse()` 弃用警告。
