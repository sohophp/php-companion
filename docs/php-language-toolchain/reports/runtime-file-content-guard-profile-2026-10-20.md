# 运行程序内容守卫：冻结包完整扩展组合

2026-10-20。源码`71c7b40f`的三份Alpha VSIX解包载荷，配合TwigPlus及实际外部版本组成12成员隔离组合；VS Code1.142、YAML2.0.0、PHP Debug1.40.2。原完整命令实际退出0，97.14秒；独立审计退出0，7337冻结输入和25符号链接保持，所属资源已清理。

已执行并通过：PHP真实格式化失败与恢复、保存和撤销重做、Twig格式化协作、Symfony未保存上下文刷新、真实Xdebug断点和单步、PHPUnit真实任务退出码0→1→0。保留原9100背景文件、50轮标量和30轮联合类型反馈，P95为99/112ms，满足原150ms门槛；最大值1466/528ms也原样保留，P95通过不代表每轮都低于150ms。

首次预检发现第三方扩展嵌套依赖遗漏；首次完整执行因隔离副本缺少TwigPlus的`dist/node_modules/vscode-html-languageservice`失败。对应记录已归档；按原冻结文件补齐依赖后重跑原流程通过，没有修改功能断言或超时。唯一测试身份调整仍是PHP Debug预期版本1.40.1→实际1.40.2。

资格限Linux解包载荷的隔离自动化组合。正式安装Profile、真人WSL、多小时使用、macOS/Windows对应组合、当前提交远程CI与复杂Controller性能未因此通过。日常Profile未改，未推送或公开发布。

证据：[独立审计汇总](runtime-file-content-guard-profile-2026-10-20.json)、[原始终态](../../../.vscode-test/runtime-file-guard-profile-2026-10-20/state.json)、[原始独立审计](../../../.vscode-test/runtime-file-guard-profile-2026-10-20/audit.json)。
