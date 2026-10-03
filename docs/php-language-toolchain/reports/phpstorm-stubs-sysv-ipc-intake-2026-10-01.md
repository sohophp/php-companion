# phpstorm-stubs SysV IPC 接入

- 固定上游修订：`e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681`。`sysvmsg`、`sysvsem`、`sysvshm` 分别有 7、4、7 个函数；本机 PHP 8.1 和 8.5 反射核对了参数、返回类型及 PHP 8 句柄类。
- PHP 7 使用资源句柄的 PHPDoc；PHP 8 起使用 `SysvMessageQueue`、`SysvSemaphore`、`SysvSharedMemory`；`shm_detach` 在 PHP 8.5 的原生返回类型为 `true`，之前为 `bool`。
- 扩展可分别撤回。消息标志 `MSG_IPC_NOWAIT`、`MSG_NOERROR`、`MSG_EXCEPT` 已接入；`MSG_EAGAIN`、`MSG_ENOMSG` 的 errno 数值现从项目 PHP 探测，随运行时快照更新；未知时缺席。
- 验证：语言规范 124 项、运行时探测 27 项、客户端 payload 定向测试通过；SysV IPC 真实 stdio LSP 定向测试通过，覆盖定义跳转、errno 数值 91 → 42 的 Hover 刷新、撤回后诊断与其它扩展保留；`php72 -n -l` 和 `php85 -n -l` 均通过三组独立声明；固定上游与 PHP 8.5 运行时函数覆盖审计为 18/18、缺口 0。
- 本轮只验证自动化与本机运行时；真实 WSL 编辑器使用仍待用户测试。未打包、提交、推送或更新 Profile。

补充验证：本机 `probePhpRuntime` 对 PHP 8.1.34／8.5.9 均取得 `MSG_EAGAIN=11`、`MSG_ENOMSG=42`，这些值能往返内置文档 URI 并生成同值声明。根项目 TypeScript 检查、修改文件 ESLint 通过。配置枚举已加入三个 SysV 扩展。
