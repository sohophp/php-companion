# 嵌套安全数组键路径控制流验收

日期：2026-09-09。范围：把既有数组元素流事实扩展到最多 16 层静态安全字符串键或规范整数文字键，并统一用于诊断、补全与 Definition。

## 已完成

- Parser 使用结构化 `arrayPath` 记录完整路径；动态键、复杂键、数组与属性混合路径及超过 16 层的路径不产生事实。
- `isset`、`empty` 假路径、直接 truthy 守卫、严格/宽松 null 比较、内建类型谓词和 `instanceof` 共用嵌套路径表示。
- Semantic 递归解析 array shape、typed array、list、可选字段和 nullable 中间层，并将完整路径事实用于参数诊断、成员补全及 Definition。
- 根数组重赋值、任意下标写入或 unset、引用逃逸、引用 foreach 和把根数组传入已完成调用会撤销事实。
- Semantic snapshot 升至 schema 42，使 schema 41 缓存原子失效。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 423 项测试、根包 30 项测试通过。其中 Parser 47、Semantic 194、Language Server 84 项。
- `pnpm verify:packages` 验证 15 个可独立发布组件 tarball；PHP 8.5 fixture、`pnpm package`、`pnpm verify:vsix`、定向 ESLint 和 `git diff --check` 均通过。
- 打包版 VS Code 1.136.2 Extension Host 退出码 0，验证新增六条嵌套路径精确诊断和四个对象成员 Definition；完整属性/数组 fixture 冻结三十九条诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `8bfbca82b06cb1a71296fcfd33dbdd030d3e3a532a2d28a07b4f5730e2e131cb`。
- 完整测试在嵌套写入失效及 16/17 层预算边界回归加入后首次通过，原 5000 ms 单测预算未变。完整测试日志位于 `/tmp/php-nested-array-path-full-test-20260909-0235.out`。
- 宿主标准输出位于 `/tmp/php-nested-array-path-host-20260909-0233.out`，原始日志位于 `/tmp/php-nested-array-path-vscode-logs-20260909-0233`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。
