# empty 假路径非空流验收

日期：2026-09-09。范围：仅在 PHP `empty(...)` 已证明为假时，为直接变量、静态非 nullsafe 属性路径和安全字面量数组键建立非空事实。

## 已完成

- `if (!empty($value))` 的分支内和 `if (empty($value)) return;` 的后续路径会移除可证明类型中的 null。
- nullable 标量进入实参诊断；nullable 对象属性和 array shape 元素进入成员补全与 Definition。
- `empty(...)` 为真可能表示 null、false、零、空字符串或空数组，因此不构造 null-only 类型，也不消除 null。
- 属性和数组元素继续复用既有写入、unset、引用与调用逃逸失效规则。
- 动态属性、nullsafe 路径、变量数组键和复杂表达式保持 unknown。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和最终完整 `pnpm test` 退出码 0：15 个组件共 416 项测试、根包 30 项测试通过。其中 Parser 46、Semantic 191、Language Server 81 项。
- 既有 Language Server 泛型数组用例在两次完整运行和一次单独运行中分别以 5062、5265、5565 ms 超过固定 5000 ms。没有提高超时；将原本混合四个 PHP 版本门控与泛型传播的测试按行为拆分，保留全部断言，三个相关定向用例合计 4.51 秒，随后完整测试通过。
- `pnpm verify:packages` 验证 15 个可独立发布组件 tarball；PHP 8.5 fixture、`pnpm package`、`pnpm verify:vsix`、定向 ESLint 和 `git diff --check` 均通过。
- VS Code 稳定宿主更新至 1.136.2。首次下载 338.25 MB 时发生两次内建重试；首次运行在既有严格标量诊断等待点超时，第二次暴露旧 `isset` 全文选择器也匹配新增 `emptyFlow` 的问题。Semantic 直接核对确认 25 条诊断后，将阶段选择器限制到对应函数范围；最终打包 Extension Host 退出码 0。
- 最终宿主验证四条 `empty` 精确诊断、两个对象成员 Definition，并冻结整份属性/数组 fixture 共二十五条诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `d5d2844ebe7502f8dbb571cd61a558413248269e7dea11c05e60320bb5ca0a32`。
- 成功宿主标准输出位于 `/tmp/php-empty-flow-host-20260909-0133.out`，原始日志位于 `/tmp/php-empty-flow-vscode-logs-20260909-0133`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。标准输出存在 VS Code Agent Host 所用 Node `url.parse()` 弃用警告。
