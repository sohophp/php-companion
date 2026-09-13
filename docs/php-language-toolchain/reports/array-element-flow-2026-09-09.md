# 数组字面量键控制流验收

日期：2026-09-09。范围：把 `isset($array['key'])`、`isset($array[0])`、全局内建 `is_*` 谓词、严格 null 比较和 `instanceof` 接入 array shape、typed array 与 list 的元素类型流。

## 已完成

- Parser 为直接变量根上的安全标识符字符串键和规范十进制整数键记录独立 `arrayKey` 非空事实；变量键、带转义或复杂字符串键、嵌套下标和属性容器不进入本阶段模型。
- Semantic 从可证明的 array shape、typed array 或 list 中取得对应元素类型；`isset` 真路径移除 null，全局内建 `is_*` 谓词选择或排除有限 Union 成员。
- 严格非空比较会从 nullable 对象元素移除 null；`instanceof` 正向和有限 Union 的反向分支会选择对应对象成员。
- 可选且 nullable 的对象 shape 字段可在真路径提供成员补全与 Definition；参数类型诊断消费同一元素事实。
- 否定后提前退出的守卫继续沿用后续路径事实；普通 `isset` false 分支不推断元素为 null 或键不存在。谓词的可表示补集进入 else，mixed 否定补集继续保持 unknown。
- 根数组重赋值、任意可能命中该数组的下标写入或 unset、引用逃逸、引用 foreach，以及把根数组传入已完成调用都会保守撤销事实。
- 数组元素事实与根变量事实明确隔离，避免把元素类型错误套用到整个数组。
- Semantic snapshot 升至 schema 41，使 schema 40 缓存原子失效。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 413 项测试、根包 30 项测试通过。其中 Parser 46、Semantic 190、Language Server 79 项。
- `pnpm verify:packages` 验证 15 个可独立发布组件 tarball；PHP 8.5 fixture 语法检查、`pnpm package`、`pnpm verify:vsix`、定向 ESLint 和 `git diff --check` 均通过。
- 一次未先重建依赖包 `dist` 的 Language Server 定向调用读到旧 Semantic 产物而返回空诊断；按 monorepo 依赖顺序重建 Parser/Semantic 后同一用例通过，随后完整根门禁也从头构建并通过。
- 打包版 VS Code 1.136.1 Extension Host 退出码 0。属性 fixture 冻结总计二十一条精确诊断，并验证 `isset` 对象元素、对象 Union 的正向/else 及严格非空 nullable 对象元素 Definition；动态键写入后的读取保持 unknown。
- 第一次最终完整测试仍只有既有 Language Server 泛型数组传播用例触发固定 5000 ms 边界，本次耗时 5116 ms；没有放宽预算，同配置完整重跑后 79 项全部通过。
- 对象元素扩展后的最终完整门禁首次通过，无需重跑：15 个组件仍为 413 项、根包 30 项，其中 Parser 46、Semantic 190、Language Server 79 项。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `8fbe6148079e86de39fbaddb2ba605ecdfccec7426c2f8f2f85229524a273590`。
- 宿主标准输出位于 `/tmp/php-array-object-flow-host-20260909-0050.out`，原始日志位于 `/tmp/php-array-object-flow-vscode-logs-20260909-0050`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。标准输出存在 VS Code Agent Host 所用 Node `url.parse()` 的弃用警告，不来自 PHP Companion 测试断言。
