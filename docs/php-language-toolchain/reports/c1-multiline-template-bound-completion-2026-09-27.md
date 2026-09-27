# C1 PHPDoc 模板约束换行补全

日期：2026-09-27。仅修改 SoPHP 隔离工作树和独立 Composer/VS Code 测试夹具；未修改 Winstar 或重新打包 VSIX。

## 问题与修复

在 PHPDoc 写到 @template T of 或 @phpstan-template U as 后换行，下一行输入项目类名前缀时，Core 不再给出类建议。单行模板约束已有支持。新增语义用例先以 typeCompletionContext 返回 undefined 失败，再修正续行识别：仅模板约束的 of/as 后允许这次换行，并在合并两行时保留词间空格。普通说明文字、模板名及没有完整约束的文本仍不进入类型补全。

## 证据和边界

- 语义包完整测试 427/427，根扩展与 Symfony 源码构建、语义包和扩展测试 TypeScript、改动文件 ESLint 通过。
- 独立真实 Composer vendor 的 C1 六项查询及两轮未保存类型切换通过；隔离 Core C2 宿主的未保存诊断、跨文件返回、关闭重开等链路通过。这些基线测试发生在本项源码改动之前，用于选择下一个具体缺口。
- VS Code 1.139.1 Linux x64 的完整 10 项 Open Source Pack 源码宿主，使用已发布 TwigPlus 1.3.8 和其余冻结外部成员，对未打开的项目类执行实际 PHPDoc 补全请求；第二次运行整条 C1 链退出码 0，日志为 /tmp/sophp-c1-template-multiline-pack-repeat-20260927.log。第一次运行在一条原有数组形状补全断言上失败，尚未定位为请求时序还是产品结果波动，不能将单次重跑通过写作该项稳定性已证明。
- 本项修复未进入已冻结的 248ee1f8 0.4.7 VSIX；真实 WSL Remote 编辑、其它平台和长时间使用仍待 C4。

准备隔离扩展目录时，首次执行的 VS Code CLI 被当前 WSL Remote 转发，在用户 WSL 扩展目录执行了 TwigPlus 1.3.8 的 --force 安装。随后清除该转发环境变量并仅在 /tmp/sophp-pack-c1-template-20260927 安装测试成员；产品源码与业务项目未受该安装命令影响。用户 WSL 扩展目录原有的 TwigPlus 1.3.7 目录仍在，1.3.8 目录的修改时间为本次命令时间。

## 数组形状补全波动复核

将原有数组形状断言的失败信息扩展为实际候选标签、详情和种类；断言仍要求首次请求就返回正确项目类，不增加等待或重试。使用同一隔离 Pack 目录连续运行三次完整 C1 宿主，三次均退出码 0，日志为 /tmp/sophp-c1-pack-shape-repeat-1-20260927.log、/tmp/sophp-c1-pack-shape-repeat-2-20260927.log、/tmp/sophp-c1-pack-shape-repeat-3-20260927.log。本次未再次复现首次失败，因此没有可归因的产品修复；该波动仍保持开放，后续若再出现可以直接看到实际候选内容。
