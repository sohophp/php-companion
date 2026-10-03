# PHP 引用准备进度：取消与缓存重启

日期：2026-10-03。复核用户此前“Preparing PHP references 长时间不结束”的反馈；本批没有改变产品逻辑。

## 新增固定回归

`reference-progress-lifecycle-stdio.test.ts` 在 PHP 7.2／8.5 各建立一个 41 文件 Composer 项目，并分别启动冷、缓存、取消三个真实语言服务器进程，共六个进程。客户端真正确认 WorkDoneProgress 创建请求。

- 冷／缓存路径都经历完成引用事实阶段，再报告 100% 的引用就绪并且只结束一次；缓存路径确认 41/41 files、41 cached。
- 取消路径在收到 begin 后发送标准取消通知；进度正常结束，不误报 ready。
- 每条路径在进度结束后打开文件并查询成员，精确返回 onlyItem；磁盘内容逐字不变。
- 两项协议测试退出 0、12.49 秒；ESLint／diff check 通过。

## 当前实际项目只读测量

Winstar 只作规模样本：临时缓存、Core progressive 模式、无 Symfony Provider。当前 2536 个 PHP 文件；不沿用此前截图中的 2327 文件数量。

| 路径 | begin 到 end | 总进程启动到 ready | 缓存计数 | 准备后 func 补全 |
| --- | ---: | ---: | ---: | ---: |
| 冷启动 | 13255.89 ms | 15329.13 ms | 0/2536 | 20.58 ms |
| 缓存启动 | 13578.56 ms | 15250.04 ms | 2535/2536 | 23.95 ms |

两次文件计数完成后仍约 2 秒完成引用事实，进度中显式报告 Finishing PHP reference facts，最终报告 ready 并结束；没有复现永久挂起。缓存恢复仍须验证源码与重建引用事实，本次没有明显加速，不能把“已缓存”称作全部工作完成。

准备后，未保存的 func 首位为 function；没有写业务文件，终态磁盘逐字一致。临时缓存已清理。这里没有模拟真人点击，没有复测 Symfony 组合、Windows 或真实 WSL 状态栏绘制，也没有声称所有规模上的等待已解决。若真实窗口仍不结束，应按对应运行日志调查，不用本次协议结果否定用户反馈。

## 证据

结构化证据见同名 JSON；新测试在 packages/language-server/test/reference-progress-lifecycle-stdio.test.ts。原始日志 /tmp/sophp-reference-progress-lifecycle-current.log；实际项目 /tmp/sophp-reference-progress-project.{mjs,log,json}。

首条测试命令错误地在根目录执行 package 层过滤，没有运行任何用例；已从 language-server 目录执行，以上数字仅来自修正后的运行。

没有修改 Core 产品源码、打包、提交、推送或更新 Profile。原始数小时真人使用与完整路线图验收仍分别开放。
