# 正式模式旧响应回归已纳入仓库

2026-10-20。本地测试提交`b2ccc332`，独立分支`work/stable-production-tests-20261020`，工作树`/var/www/node/php-companion-production-tests-20261020`。基于产品候选`a7e9166a`，只修改测试入口、测试支持代码与文档，产品源码、依赖、manifest和候选VSIX保持。

## 可重复执行的入口

新增真实服务器协议回归进入根Vitest默认范围。正式安装编辑器模式通过既有`runPackagedTest`入口选择`PHP_COMPANION_TEST_INSTALLED_PROFILE=1`；它复用原完整index套件，先校验候选包与全部安装成员，再由测试专用传输适配器控制真实在途响应。业务返回仍由真实服务器产生，服务器Test模式保持false。

输入要求显式候选目录、独立扩展目录和外部版本清单。原默认PHP Debug版本保持1.40.1；正式安装模式从已经核对的清单传入实际固定版本，本次为1.40.2。YAML本次为2.0.0，其它平台支持表未改。子集入口、缩小轮数及非Linux编辑器模式会被拒绝。

执行说明已保存于独立分支的`docs/php-language-toolchain/installed-profile-regression.md`。本次没有临时NODE_OPTIONS或预加载脚本替换原入口。

## 已执行并通过

- 仓库内正式入口实际退出0，89.66秒；独立审计通过，4993个执行输入保持。三包39文件及完整12成员1537份安装载荷核对，真实旧Hover暂存/版本2确认/原字节释放/旧结果拒绝与恢复通过。
- 原50轮标量及30轮联合类型反馈P95为84/108ms，原150ms门槛保持；原始较慢样本保留。真实格式化、Xdebug及PHPUnit0→1→0流程完成，所属进程、临时项目和显示服务清理通过。
- 完整根单元156项，零失败/零跳过；其中只新增一个真实协议案例。根及编辑器TypeScript编译、六个修改源码文件的Lint通过；24组件边界及43公开合同检查均零违规。
- 审计后仅补充F13编号和文档，最终提交的受测代码摘要保持。保留原188个编号，新增F13-HOVER-01/02后为190；编号和编辑器复用阶段不计作新增测试案例。原工作区188编号的历史静态报告不改写为本分支结果。

初版测试采集因根包未声明testkit包名导入而失败，改为已有相对构建路径；初版类型注解检查失败，补齐后编译通过。以上不计为产品功能失败；最终结果分别保留。

产品候选仍为a7e9166a，未重新生成或安装产品包；测试代码分支b2ccc332未推送。此前针对a7e9166a的推送授权问题仍待答，不扩展为测试分支授权。日常Profile未改，当前远程CI、macOS完整矩阵、真人WSL、复杂Controller原500/150ms和六项最终检查继续开放。

证据：[机器报告](production-test-harness-2026-10-20.json)、[原入口终态](../../../.vscode-test/production-test-harness-2026-10-20/state.json)、[独立终态审计](../../../.vscode-test/production-test-harness-2026-10-20/audit.json)、[最终代码与编号核对](../../../.vscode-test/production-test-harness-2026-10-20/final-commit-proof.json)、[完整根单元](../../../.vscode-test/production-test-harness-2026-10-20/final-root-tests.json)。
