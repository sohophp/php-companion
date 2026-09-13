# mixed 属性类型谓词验收

日期：2026-09-08。范围：允许正向全局内建类型谓词把声明为 `mixed` 的直接属性精化为具体类型，同时保持不可表示的否定补集为 unknown。

## 已完成

- 直接属性读取可把声明的 `mixed` 保留为属性流基础类型，不再在谓词事实应用前过早丢弃。
- `is_string($box->unknown)` 等正向分支可产生具体类型并进入实参诊断。
- `!is_string($box->unknown)` 的 mixed 补集仍不构造伪 Union，也不产生类型不匹配诊断。
- 属性以外的方法返回仍沿用原有 mixed 抑制规则；本次没有扩大未经证明的方法调用结果。
- 根对象、路径写入和调用副作用的既有失效规则保持生效。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和 `pnpm test` 退出码 0：15 个组件共 408 项测试、根包 30 项测试通过。其中 Parser 45、Semantic 188、Language Server 77 项。
- 15 个独立组件 tarball、PHP 8.5 fixture、VSIX 内容和 `git diff --check` 均验证通过。
- 打包版 VS Code 1.136.1 Extension Host 退出码 0。属性 fixture 现冻结八条标量属性诊断和四条对象属性诊断，并验证否定 mixed 补集不产生第十三条伪诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `48d47f43244ea14d10d5a2e282d9e21405f0b1c30b667b4b4cd7c3e42729c79a`。
- 宿主日志位于 `/tmp/php-mixed-property-predicate-vscode-logs-20260908-2343`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。
