# C2：分组符号导入跟随未保存声明

日期：2026-09-27。只更新 SoPHP 测试与测试运行环境；没有修改业务项目、生成 VSIX 或发布版本。

独立 Composer `autoload.files` 的 stdio 用例新增函数声明的打开、未保存改名和关闭链：组内补全先使用缓冲区的 `createInvoiceDraft`，再次编辑后改为 `createInvoiceFinal`，关闭后恢复磁盘中的 `createInvoice`；各阶段都排除旧候选。定向测试 1/1 通过。

VS Code 1.139.1 Linux x64 的 C2 源码宿主新增函数与常量分组导入检查。声明文件在未保存状态下同时改名，消费者的两类补全均从 Draft 更新到 Final，旧名不再出现；完整 C2 宿主退出码 0。

第一次 C2 运行在用例开始前读到 `phpCompanion.phpVersion=auto`，与夹具要求的 `8.5` 不符。C2 普通源码宿主原先没有独立用户数据目录；现在与 C1/C3 一样使用夹具内的隔离目录。隔离后完整 C2 宿主通过。测试 TypeScript、变更文件 ESLint 与差异检查通过。

这证明源码宿主中的可见候选与未保存声明同步；已安装 VSIX、真实 WSL Remote 和长期会话仍留待集中候选验收。
