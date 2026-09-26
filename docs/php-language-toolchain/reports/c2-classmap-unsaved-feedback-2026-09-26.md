# C2 classmap 未保存声明的编辑反馈

日期：2026-09-26。使用独立 Composer classmap/PSR-4 夹具和真实语言服务器 stdio；未修改业务项目，未重新打包 VSIX。

classmap 允许 `Bundle.php` 声明 `Legacy\Invoice`，也允许同一目录同时属于 PSR-4 与 classmap 时，文件名与类名不同。原先 SoPHP 对前者发出 `php.type.filename` 警告，并给出改名 Quick Fix；这会诱导用户破坏合法的 classmap 布局。现在文件名警告只用于有明确 PSR-4 目录映射且不属于 classmap/files 的声明；命名空间本身不符合 PSR-4 时，也不附带文件名建议。

新增跨文件用例打开 classmap 声明与使用方，未保存地把 `send(int)` 改为 `send(string)`，再改名为 `post(string)`：补全、Hover 和 Definition 从当前声明读取，旧方法不再进入新补全。独立 stdio 回归和原有 PSR-4 文件改名、版本诊断用例 3/3 通过；TypeScript 构建通过。

后续已加入[Composer 生成类映射证据](c2-generated-classmap-diagnostic-proof-2026-09-26.md)：映射缺失或指向错误路径时，本夹具中的跨文件实参错误继续静默；精确指向 `Bundle.php` 后，`php.argument.type-mismatch` 出现，未保存地把 `send(int)` 改为 `send(string)` 后撤销。这扩大了有可靠来源证明时的诊断覆盖，不表示所有 classmap 项目都有该生成映射。VS Code UI、已安装候选和真实 WSL Remote 也未在本项验收。
