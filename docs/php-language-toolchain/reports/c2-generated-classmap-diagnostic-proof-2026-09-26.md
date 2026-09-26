# C2 Composer 生成类映射的诊断证据

日期：2026-09-26。仅修改 SoPHP 项目解析、语言服务器和独立夹具；未修改业务项目，未重新打包 VSIX。

SoPHP 现在只按 Composer 生成的静态字面量格式读取 `vendor/composer/autoload_classmap.php`，解析类名到文件的路径，不执行项目 PHP。支持 Composer 生成的 `$vendorDir`、`$baseDir` 路径表达式和自定义 vendor 目录；文件缺失、过大、格式异常或含不支持表达式时不把它当作来源证明。文件大小和时间戳变化会刷新缓存。

默认 `onDemand` 的跨文件方法实参、未知命名参数与缺失必填参数诊断，现可使用生成映射证明方法所有者来自唯一的当前声明文件。映射条目必须精确指向该文件；若映射条目指向其他文件，或者 classmap/files 路径上没有该条目，诊断保持静默。若生成映射存在但无法可靠解析，PSR-4 跨文件诊断也保守停止，避免忽略可能覆盖 PSR-4 的类映射。

独立 stdio 用例先让 `Legacy\Invoice` 的映射指向错误路径，字符串传给 `send(int)` 时没有类型误报；改为精确路径后出现 `php.argument.type-mismatch`；未保存地把声明改为 `send(string)` 后诊断撤销，Hover 与 Definition 同步更新。随后对 `post(wrong: "bad")` 和 `post()` 分别核对未知命名参数及缺失必填参数诊断。Composer 解析单测 13/13、语言服务器相关回归 6/6、TypeScript 构建及 ESLint 通过。

随后在 VS Code 1.139.1 Linux x64 的隔离 Core 源码宿主中，打开独立 Composer classmap 项目的声明与使用方。编辑器实测显示一条实参类型错误、方法补全和 Definition 指向映射源；未保存地把参数改为 `string` 后，诊断撤销且 Hover 更新。完整 C2 宿主链退出码 0。此结果仍不等于已安装候选、真实 WSL Remote 或不同 Composer 生成格式的验收；生成映射缺失的 classmap 项目继续保持保守诊断行为。
