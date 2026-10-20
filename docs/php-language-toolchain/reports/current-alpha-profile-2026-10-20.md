# 当前Alpha外部版本的隔离完整组合验证

2026-10-20。产品源码基线`1f096ff1`，Core摘要`5095cf15…`。**原完整流程与独立审计均已执行并通过**，资格限Linux、VS Code1.142.0及下列精确成员组合。

三份产品包的运行文件来自同次CI VSIX，在隔离开发目录加载；八项外部成员和TwigPlus来自实际Alpha安装目录的副本。不是正式VSIX安装验收，也不是真人Windows客户端连接WSL Remote验收。日常Profile和正常产品源码均未修改。

## 原流程与结果

- 完整流程95.44秒退出0；原完整入口、操作顺序和150ms预算保持。保存/撤销/重做、格式化失败后恢复、YAML/XML/JSON、EditorConfig、Symfony到Twig上下文均通过。
- 真实Xdebug3.5.3、PHP8.5.9：断点第3行、单步到第4行，变量和观察值40→42，程序结果42且调试会话退出。
- PHPUnit编辑器任务实进程退出码0→1→0；故意断言失败与恢复均被正确观察，带空格路径、工作目录及PHP运行时核对通过。
- 真实vendor项目保留9100个噪声文件；50轮标量反馈P95 **81ms**，最大141ms；30轮union-shape反馈P95 **100ms**，最大456ms。原P95门槛150ms保持，最大值另列，不删除慢轮。定义等待最大1021ms单独保留，不归入已达标的反馈指标。
- 12成员的实际版本和加载目录、16个Core/Symfony运行文件、各一个PHP/Twig服务器均有运行时证明。生命周期异常关闭/重启失败/待处理版本刷新均0。
- 独立审计核对7333个冻结输入、25处符号链接、日志与归档；无输入变化。TwigPlus当前安装与冻结副本281文件逐字一致。所属服务器、任务进程、临时项目、独立显示服务及授权目录均已清理。

## 精确成员

| 扩展 | 版本 |
| --- | --- |
| `sohophp.php-companion` | 0.4.13 |
| `sohophp.php-companion-symfony` | 0.4.13 |
| `sohophp.php-companion-open-source-pack` | 0.4.13 |
| `sohophp.twig-plus` | 1.3.8 |
| `editorconfig.editorconfig` | 0.18.2 |
| `eiminsasete.apacheconf-snippets` | 1.4.0 |
| `junstyle.php-cs-fixer` | 0.3.21 |
| `mrmlnc.vscode-apache` | 1.2.0 |
| `neilbrayfield.php-docblocker` | 2.7.0 |
| `redhat.vscode-xml` | 0.29.3 |
| `redhat.vscode-yaml` | 2.0.0 |
| `xdebug.php-debug` | 1.40.2 |

## 驱动修正与保留失败

首轮完整功能命令退出0，但驱动退出1：拦截代码从原工作区加载了另一份`@vscode/test-electron`，因此没有运行额外观察入口，缺失实际运行资产和生命周期证明。首轮不授予完整资格，原日志和终态保留在`attempt-1/`。随后仅修正拦截模块的解析基准为隔离workspace，再运行原完整流程；没有降低预算、删案例或调整超时。

隔离编译测试仅将PHP Debug精确版本断言1.40.1改为目标1.40.2，修改前后摘要已记录，全部功能断言保持；正常测试源码未改。该通过结果不自动改变全平台冻结版本表。

复杂Controller原500/150ms性能仍失败；其它平台该组合、真人WSL、多小时真实项目及全部R4/最终六项检查继续开放。

证据：[机器报告](current-alpha-profile-2026-10-20.json)、[原命令终态](../../../.vscode-test/current-alpha-profile-2026-10-20/state.json)、[独立审计](../../../.vscode-test/current-alpha-profile-2026-10-20/audit.json)、[实际运行证明](../../../.vscode-test/current-alpha-profile-2026-10-20/evidence/acceptance-proof.json)。
