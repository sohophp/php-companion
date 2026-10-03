# 默认索引模式的 Rename

## 已复现缺口与修复

onDemand／progressive 的启动索引只准备项目源码，不设置全局 completeRoots。普通 Prepare Rename 和 Rename 原先都要求这个全局标记，导致完整的独立 Composer 项目也返回 null。新增协议矩阵修复前两个正例失败、两个预算反例通过。

Prepare Rename 现在在缺少全局标记时，使用现有 refreshRenameDiskSources 验证当前 PHP 源码覆盖；Rename 保留每次独立的完整刷新，移除刷新前的全局标记拒绝。扫描包含 Composer 依赖，要求 scan.complete、未取消及项目 epoch 未变化；超预算仍拒绝。没有把源码扫描结果写成全局引用／Provider 准备完成，也没有更改 indexing.mode 设置或已有局部变量／封闭 promoted property 快路径。

## 协议验证

最终真实 stdio 10 项通过、440 项未选中，36.30 秒。两种模式分别检查：

- Prepare 返回准确类型名，Rename 联动类型与 PSR-4 文件名。
- 覆盖声明、项目消费者、Composer 依赖消费者，以及准备后新增但没有 watcher 通知的消费者；准确编辑四个 URI。
- 方法、属性、类常量、函数及命名空间常量各生成两个准确文本编辑。
- 项目及依赖源码在查询后逐字保持不变。
- 项目源码预算可容纳、依赖源码超过 maxFiles 时，Prepare 与 Rename 均返回 null；测试计时 API 证明两次都执行了独立磁盘刷新，不是提前被旧标记拒绝。

同时复测既有封闭 promoted property 无索引快路径、局部变量作用域、缺失 watcher 的消费者、私有方法及相关符号综合回归、目标链接／大小写冲突和原 PSR-4 Rename。未跑全量协议；不以这个矩阵推导所有动态 PHP 或框架引用都可安全改名。

## 隔离编辑器验证

runner 增加仅 C3 测试可用的 PHP_COMPANION_TEST_C3_INDEXING_MODE，修改独立临时夹具设置，并在宿主中断言实际模式。产品设置、用户 Profile 和安装资产未变。

当前 VS Code 1.140.0 标准 Core／独立 Symfony 定向宿主：onDemand 串行两次退出 0，progressive 串行一次退出 0。普通／大小写改名均验证预览取消、应用、准确类型与文件名、一次 Undo/Redo，并恢复夹具；链接和独立目标冲突在预览前拒绝。

日志：

- `/tmp/sophp-default-rename-host-onDemand-trace-20261004.log`
- `/tmp/sophp-default-rename-host-onDemand-repeat-20261004.log`
- `/tmp/sophp-default-rename-host-progressive-sequential-20261004.log`

首轮并行宿主失败仍保留：onDemand 应用返回 false，progressive 出现 X connection error。已确认显示会话冲突，改为串行执行；没有把 onDemand 首次 false 完全归因于该冲突，也不据后三次结果声称不会再发生。原日志 `/tmp/sophp-default-rename-host-{onDemand,progressive}-20261004.log`；真实使用及更长会话仍需反馈。

Language Server 构建、production bundle、根 TypeScript noEmit、宿主编译、相关 ESLint 和 diff check 通过。完整 C3、原生 Windows／Remote、大型 Composer 项目改名等待时间和真人 WSL 均未整体关闭。本批没有安装、VSIX、Profile 更新或推送。
