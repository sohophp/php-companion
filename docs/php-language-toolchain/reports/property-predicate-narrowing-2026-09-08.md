# 属性路径类型谓词收窄验收

日期：2026-09-08。范围：把全局内建 `is_*` 类型谓词的既有控制流事实扩展到可证明的直接属性读取，并在对象状态可能变化后撤销事实。

## 已完成

- Parser 只记录以直接变量为根、每一级均为静态属性名、且不含 nullsafe 的属性路径，例如 `$box->value` 和 `$box->inner->value`；动态成员和 `$box?->value` 不生成属性事实。
- Semantic 先按声明和可见性逐级解析属性链，再在事实有效范围内对标量 Union 执行正向选择或可表示的反向排除。命名空间同名函数不会被当成全局内建谓词。
- 根变量重新赋值、任一路径前缀属性写入或 unset、根对象或链上的方法调用、引用逃逸，以及把根对象传给此前已经完成的调用，都会撤销属性事实。
- 撤销事实后回到已声明属性类型，继续产生宽类型与目标参数不兼容的诊断，避免沿用过期的分支精度。
- 单步成员类型支持仅扩展到属性读取；单步方法调用仍走原有调用结果验证，未扩大既有诊断集合。
- Semantic snapshot 升至 schema 40，使不含属性路径字段的旧缓存原子失效。

## 精准边界

- 当前不跟踪属性别名、动态属性名、nullsafe 属性路径、数组下标或魔术属性状态。
- 方法调用和把根对象传给调用按可能修改处理；在纯函数或 readonly 效果系统落地前不保留事实。
- 只有成员声明、接收者类型、逐级可见性和谓词函数身份都可唯一证明时才应用事实，证据不足保持 unknown。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和 `pnpm test` 退出码 0：15 个组件共 406 项测试、根包 30 项测试通过。其中 Parser 45、Semantic 187、Language Server 76 项。
- 新增 PHP fixture 通过项目 PHP 8.5 runtime 的语法检查；`git diff --check` 通过。
- `pnpm verify:packages` 在隔离消费者中验证 15 个可独立发布组件 tarball；`pnpm package` 和 `pnpm verify:vsix` 均退出码 0。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `5c8ed6dbe6653cfc98aa80f045ac484fffd0848c265eafcc10e4c7f3f85e400f`。
- 打包产物在隔离 Profile 的 VS Code 1.136.1 Extension Host 中退出码 0。宿主验证属性正向、else、嵌套属性链以及属性写入、方法调用、实参逃逸和根对象重赋值后的七条精确诊断，并通过全部既有宿主用例。
- 宿主日志位于 `/tmp/php-property-predicate-vscode-logs-20260908-2312`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。启动器直接校验并使用已安装的 VS Code 1.136.1。
