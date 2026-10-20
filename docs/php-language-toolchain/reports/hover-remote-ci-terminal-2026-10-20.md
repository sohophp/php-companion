# a7远程常规CI终态：19成功／1失败

2026-10-20。[原流程39354347663](https://github.com/sohophp/php-companion/actions/runs/39354347663)已实际failure，失败为Windows质量作业中的五次冷启动候选缓存恢复测试触发20秒时限（20221ms）。其它19作业成功；不能标完整CI通过。

[独立日志核对](hover-remote-ci-terminal-2026-10-20.json)退出0，原日志ZIP完整保留；只读取三个顶层整作业日志，逐步日志副本不重复计数。Linux/macOS各26个Vitest阶段完整对齐，Windows23阶段对齐；Windows语义24473通过，LSP1768通过／1失败／6跳过。Windows根单元及后续步骤未执行，保留该缺口。

基线同用例Linux15372ms／Windows10682ms／macOS8539ms，本次Linux16206ms／macOS8476ms；失败日志尚不足以证明死锁或纯机器抖动。bf9613d5已把原五轮用例独立为并行LSP结束后的串行项目，保持20秒测试时限、15秒协议等待与所有原断言，新增阶段计时。该修复的实际三系统结果另行跟踪。[修复说明](windows-candidate-recovery-ci-2026-10-20.md)。

原a7/5095版本模式矩阵九作业和405原始文件审计已通过；CI三包39产品字节相同的证明也保持，但这些不替代失败的完整常规CI。新bf/8439资格分别记录，复杂性能和最终检查继续开放。
