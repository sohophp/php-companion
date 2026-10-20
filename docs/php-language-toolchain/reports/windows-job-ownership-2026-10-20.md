# Windows 矩阵进程归属修复

日期：2026-10-20。产品 Core 仍为 `8439eea8`；本批只修改验证运行器。

## 原失败与已证明的问题

`53e85c8d` 的矩阵 run `39361067391` 终态为 8 作业通过、Windows onDemand 失败。失败作业 `118427129662` 已保留原日志与 artifact：PHP 8.4 基准 JSON 正常输出、stderr 为空，诊断 P95 40.85ms、热查询预算通过，但外层状态停在 running，没有进入 catch/finally。此前 bf 的两个 Windows 失败仍保留，未改判通过。

原 Windows 清理算法在根进程退出后递归数字 ParentProcessId。即使随后核对每个被选进程的创建时间，也没有证明父 PID 对应本轮根进程。例如旧 PID 4000 曾创建一个长寿命服务，4000 后被本轮基准复用；旧服务及其后代会被错误纳入。这是确定的归属缺口；当前没有保留那次云端的完整选中列表，因此不声称已经百分之百证明云端异常退出的因果链。

## 修复

Windows 使用匿名内核 Job Object：CreateProcessW 挂起创建，AssignProcessToJobObject 成功后才恢复。Job 句柄不继承，禁止 breakaway，启用 KILL_ON_JOB_CLOSE。IsProcessInJob 实际确认目标已归属、监督进程位于 Job 外。只通过自己持有的 Job/进程句柄清理，不再遍历系统 PID 图。监督进程异常退出时，关闭最后一个 Job 句柄会结束所归属进程。参见[微软 Job Objects 文档](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)。不支持安全归属时直接失败，没有 PID 树备用清理。

原命令超时从真正恢复目标进程后计时；原协议、性能、20 秒测试及基准时限保持。根进程结束后最多等待 250ms 自然退出，解决实际复现的短暂作业成员更新延迟；初始成员和等待时长都写入报告。等待后仍有成员则强制清理并判 normalExitAndNoLeftovers=false，不通过丢弃进程名或强制杀进程来取得成功。参数经 CRT 规则逐个编码，stdout/stderr 直接继承文件句柄，避免 PowerShell 文本转码。Linux/macOS 保持进程组策略。两个新增运行器文件加入矩阵冻结输入清单。

## 实际验证

- Windows 原生 Node 24.16.0：最终 10 项通过。原 7 项仍保留：正常、非零退出、超时、抗 SIGTERM 超时、残留目录、不存在的程序、拒绝覆盖证据。新增孤儿子进程、孤儿孙进程、含空串/空格/引号/末尾反斜杠/中文/特殊字符的参数传递。
- 两种孤儿都实际检测到 node 成员，清理后 Job 为空，结果明确失败；独立哨兵全程存活，最后通过创建它的 ChildProcess 句柄清理。所有目标内核归属及监督进程在外的断言通过，所有所属临时目录移除。
- Linux Node 22.14.0：原 7 项通过；没有启动真实 PHP 服务。
- 四个变更 MJS 的语法、ESLint 和 git diff --check 通过；产品 src/packages 源码相对 3b 未变，当前产品构建资产保持。
- 初版重复运行曾在普通退出看到已自然退出的瞬态成员而失败；调查过程保留，加入上述有界自然退出等待后重复通过。最终资格只绑定最终源码摘要和 kernel-proof 控制产物，早期通过不替代最终。
- 尚未执行修复后的云端 Node 22 三系统矩阵；本地没有把 Node 24 写成 Node 22。原 8439 两小时验证保持原进程和冻结输入，未重启；复杂 Controller 500/150ms 与真人 WSL 仍未通过，完整目标保持开放。
