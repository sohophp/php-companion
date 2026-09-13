# array_key_exists 键存在流验收

日期：2026-09-09。范围：为全局 `array_key_exists()` 及 `key_exists()` 建立精确键存在事实，区分 array shape 可选字段缺失和字段显式 null。

## 语义依据

- [PHP 官方 array_key_exists 手册](https://www.php.net/manual/en/function.array-key-exists.php)明确该函数检查第一层键是否存在；实现对嵌套结构的支持来自把 `$data['meta']` 作为第二个数组实参，再检查它的第一层键，没有改变函数语义。
- [PHP 官方 key_exists 手册](https://www.php.net/manual/en/function.key-exists.php)确认 `key_exists()` 是 `array_key_exists()` 的别名。
- PHP 7.2–7.4 目录保留既有 object 重载，PHP 8.0 起只保留 array 参数。

## 已完成

- Parser 只为真路径、静态安全字符串或规范整数键、直接或最多 16 层安全数组集合记录 `array-key-exists` 事实。
- Semantic 移除可选字段缺失产生的合成 null，同时保留字段类型自身的显式 null；可选非 nullable 对象获得成员补全与 Definition，可选 nullable 对象仍拒绝普通成员访问推断。
- `!array_key_exists(...)` 提前终止后的继续路径、`key_exists()` 别名和显式全局调用均受支持。
- 命名空间同名函数不会触发内建收窄；false 路径、动态键、属性混合路径和超预算路径保持 unknown。
- 根数组或任意嵌套下标写入、unset、引用和调用逃逸会撤销事实。
- Semantic snapshot 升至 schema 43，使 schema 42 缓存原子失效。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 425 项测试、根包 30 项测试通过。其中 Language Spec 11、Parser 47、Semantic 195、Language Server 85 项。
- `pnpm verify:packages` 验证 15 个可独立发布组件 tarball；PHP 8.5 fixture、`pnpm package`、`pnpm verify:vsix`、定向 ESLint 和 `git diff --check` 均通过。
- 打包版 VS Code 1.136.2 Extension Host 退出码 0，验证新增两条精确诊断、两个存在路径的成员 Definition，以及显式 nullable 和修改后路径无 Definition；完整属性/数组 fixture 冻结四十一条类型不兼容诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `b3c4e4a9fc91b222f609a2a3d74bc50f8fd1baaa27c2857b4be9e3f92874446a`。
- 完整测试首次通过，固定 5000 ms 单测预算未变；日志位于 `/tmp/php-array-key-exists-flow-full-test-20260909-0251.out`。
- 宿主标准输出位于 `/tmp/php-array-key-exists-flow-host-20260909-0256.out`，原始日志位于 `/tmp/php-array-key-exists-flow-vscode-logs-20260909-0256`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。标准输出存在 VS Code Agent Host 所用 Node `url.parse()` 弃用警告。
