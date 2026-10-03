# PHP 7 内建旧式构造函数消费

## 缺口及修复

stubs 已正确描述 PHP 7 Fileinfo 的 `finfo($options = FILEINFO_NONE, $arg = null)` 构造方法；语义层的 constructorsFor 只查 `__construct`，导致 `new finfo(` 及继承它的类没有参数提示。新增回归修复前在 PHP 7.2／7.4 失败，得到 undefined；PHP 8 与反例通过。

现在在没有自有 `__construct` 时，识别**带 PHP 7.2–7.4 版本 URI 的内建声明**中的全局、非 static、类同名方法。自有现代构造函数优先，随后保持原有父类查找和可见性检查；普通用户文件、无版本内建 URI、PHP 8 或 namespaced 同名方法不适用。

不改 Fileinfo stubs，也不为缺少版本依据的用户源码猜测旧式构造语义。构造类型、参数提示及参数补全继续消费同一构造解析入口。

## 验证

- 本机 Reflection：PHP 7.2.34 的构造名为 `finfo`，两个可选参数 `options`、`arg`；PHP 8.5.9 为 `__construct`，两个可选参数 `flags`、`magic_database`。
- 最终定向语义：27 项通过，473 项未选中，9.38 秒。新 Fileinfo 矩阵含 PHP 7.2／7.4／8.0／8.5、直接源码、完整快照／声明快照恢复、继承、自定义构造覆盖，以及用户／未标版本／PHP 8／namespaced 反例；现有构造与重载回归同时通过。
- 最终定向 stdio：5 项通过，440 项未选中，15.91 秒。新 PHP 7.2／8.5 的版本化 Fileinfo 构造参数、继承及未保存自定义覆盖，配合原有 Fileinfo 可用性／false 分支与热版本切换回归通过，磁盘内容未变。
- 隔离 VS Code 1.140.0 Core C2 子集退出 0：同一临时 Workspace 热切换 7.2／8.5，直接／继承参数、未保存自有构造覆盖及 Undo/Redo 通过；业务项目未修改。临时日志 `/tmp/sophp-legacy-constructor-host-20261004.log`。
- Semantic／Language Server 构建、production bundle、根目录 noEmit、宿主编译及相关 ESLint／diff check 通过。

本批未跑全量语义或协议套件；隔离宿主不是用户真实 WSL UI 验收。没有安装、Profile 更新、VSIX 或推送。
