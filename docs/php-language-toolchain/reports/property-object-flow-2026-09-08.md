# 属性对象非空与 instanceof 流验收

日期：2026-09-08。范围：将严格 null 比较和 `instanceof` 的对象控制流事实扩展到直接、静态名称、非 nullsafe 的可见属性路径。

## 已完成

- Parser 对 `$box->nullable !== null`、`$box->object instanceof A` 及其直接否定、else、提前退出和已支持循环范围记录结构化属性路径事实。
- Semantic 对 nullable 对象属性移除 null，并从完整有限对象 Union 中选择或排除 `instanceof` 成员。
- 实参诊断和成员补全消费同一组属性事实；正向分支只暴露目标类型成员，else 分支只暴露可证明的剩余类型成员。
- 带属性路径的事实不会再被根变量类型解析误用，因此 `$box->object instanceof A` 不会把 `$box` 本身错误解释为 `A`。
- 属性事实复用根赋值、路径前缀写入、unset、方法调用、引用逃逸和根对象实参逃逸的保守失效规则。
- 动态成员、nullsafe 路径、不完整对象关系和开放世界对象补集保持 unknown。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和 `pnpm test` 退出码 0：15 个组件共 408 项测试、根包 30 项测试通过。其中 Parser 45、Semantic 188、Language Server 77 项。
- `pnpm verify:packages` 验证 15 个可独立发布组件 tarball；PHP 8.5 fixture 语法检查、`pnpm package`、`pnpm verify:vsix` 和 `git diff --check` 均通过。
- 打包版 VS Code 1.136.1 Extension Host 退出码 0，验证既有七条标量属性谓词诊断、新增四条对象属性诊断，以及正向/else 属性对象成员 Definition。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `a36a91f0e8ba300beb4d52a155a89a43aa1d3f8fd9135714e597f61f6f01dbb2`。
- 宿主日志位于 `/tmp/php-property-object-flow-vscode-logs-20260908-2330`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。
