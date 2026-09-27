# Symfony：新建未保存路由文件的 Rename 事实链

日期：2026-09-27。仅修改 SoPHP 独立工作树和临时 Symfony 夹具；没有修改 Winstar 或其它业务项目，没有安装用户 Profile 或打包 VSIX。

发现两个相连的缺口：SoPHP Symfony 的 Rename 客户端要求所有受影响文件在磁盘上存在；静态路由 Provider 虽接收打开文档快照，仍先对入口文件执行 `stat` 和 `realpath`，因此新建未保存的 `config/routes.yaml` 不进入路由图。现在 Provider 可从该文件的打开快照提取路由，校验其现有父目录的真实路径仍位于项目内，并把父目录纳入输入目录证据。客户端仅在受影响文件从请求开始到编辑返回一直不存在于磁盘、打开缓冲区版本和源码哈希均未变化时接受 Rename；期间出现磁盘文件、磁盘字节变化、该未保存缓冲区关闭或读取失败仍拒绝。

验证：客户端单元测试修复前 1 项失败，修复后 SoPHP Symfony 13/13；路由 Provider 的新建文件用例修复前失败，修复后 14/14，另有项目外符号链接反例。真实 Language Server stdio 的定向请求在默认 `onDemand`、独立 Symfony 项目和未落盘 `config/routes.yaml` 下返回 Rename 的精确范围及源码哈希。随后关闭未落盘缓冲区与清空快照使旧路由撤回，磁盘 watcher 创建同路径文件后恢复磁盘路由；再以相同版本号重新打开不同未保存内容时由缓冲区拥有路由，关闭后回到磁盘事实。该定向用例 1 项通过；构建、相关类型检查、ESLint 与差异检查通过。日志分别为 `/tmp/sophp-symfony-unsaved-rename-red-20260927.log`、`/tmp/sophp-symfony-unsaved-route-provider-final-20260927.log`、`/tmp/sophp-symfony-unsaved-route-lifecycle-20260927.log` 和 `/tmp/sophp-symfony-unsaved-route-build-20260927.log`。

此证据覆盖 Provider、Language Server 与客户端校验三个独立层次；尚未在真实 VS Code 窗口操作完整 F2、应用及 Undo/Redo。带通配符的目录导入仍依赖磁盘目录枚举，未声明新建快照文件会自动加入通配匹配。真实 WSL Remote 和已安装 0.4.8 候选仍按 C4 门槛验收；新源码未进入该候选。
