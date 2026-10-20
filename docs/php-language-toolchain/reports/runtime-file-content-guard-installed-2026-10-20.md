# 运行程序内容守卫：正式安装路径验证

2026-10-20。源码`71c7b40f`的三份原始Alpha VSIX已通过VS Code1.142正式CLI安装到全新隔离目录，三个命令退出0；39份安装文件与原包一致，`package.json`只增加VS Code安装元数据。外部九个成员使用此前冻结载荷重新封装为本地VSIX并经CLI安装，未称为Marketplace下载或发布。日常Profile未改。

## 已执行并通过

独立失败审计退出0：7387个冻结输入保持，三份原包及九份本地外部包摘要/安装内容核对通过。运行中真实编辑器进程只带中性测试入口的开发路径，三个产品从正式安装目录加载。

原完整流程在失败前完成PHP/Twig格式化、失败恢复与保存撤销、Symfony上下文刷新、真实Xdebug断点和单步，以及PHPUnit退出0→1→0。原50轮标量反馈P95为84ms（150ms门槛），最大1379ms，全部保留。

## 已执行但失败

完整流程实际退出1，95.25秒。原联合类型流程调用`phpCompanion/testPauseNextQuery`并要求返回true，实际false。正常客户端仅在`context.extensionMode === vscode.ExtensionMode.Test`时启用服务器testMode；正式安装路径没有启用该测试钩子。本次因此证明了测试入口与正式运行模式的适配缺口，不能报告完整正式安装验收通过，也不据此判为类型功能退化。

没有修改原断言、超时、产品测试模式或原30轮门槛。联合类型30轮反馈未执行完，最终acceptance-proof未生成，原解包载荷的99/112ms结果不转移到本次。

此前准备失败分别归档：索引只列三包导致TwigPlus未识别；手工登记复制目录后，启动期间外部目录被移除，该次已核对编辑器进程身份后SIGTERM并等待原运行器清理；旧隔离目录重装提示需重启；XML平台后缀改变导致预检路径错误。最终使用另一全新目录，十二成员均经CLI安装并按安装清单解析目录后才执行本次95.25秒流程。没有将这些失败算通过。

最终所属服务器、编辑器、任务、显示服务及临时项目已核对清理。正式模式适配、真人WSL、多小时使用、macOS矩阵、当前提交CI和复杂Controller500/150ms仍开放。

证据：[机器汇总](runtime-file-content-guard-installed-2026-10-20.json)、[独立失败审计](../../../.vscode-test/runtime-file-guard-installed-2026-10-20/failure-audit.json)、[原退出记录](../../../.vscode-test/runtime-file-guard-installed-2026-10-20/state.json)。
