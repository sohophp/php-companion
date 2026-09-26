# C1/C2 普通 PHP 编辑链与 PHPDoc 改动后的语言服务器回归

日期：2026-09-27。SoPHP 隔离源码分支 `7464bb6` 之后，运行 `pnpm --dir packages/language-server test`，完整 **21/21** 测试文件通过，**383** 项通过、**1** 项跳过；日志 `/tmp/sophp-language-server-after-phpdoc-20260927.log`。没有修改业务项目、安装扩展或打包 VSIX。

该套件包含真实 stdio 的普通 PHP 类成员补全、Hover、Definition、诊断、未保存声明更改、onDemand 联合形状反馈和取消/关闭生命周期回归，也包含新加的跨行 PHPDoc References/Definition 缓冲区与磁盘往返。此次完整运行没有发现最近 PHPDoc 名称解析改动对这些已列场景的回归。

这证明测试覆盖的输入和运行环境；它不能代替实际可见建议等待、打包候选、真实 WSL Remote、其它平台或长时间编辑。C3 最终 `WorkspaceEdit.createFile` 兜底 Redo 的已知失败也不在该测试套件内，仍按[目标目录备用移动报告](c3-type-generation-destination-stage-2026-09-27.md)跟踪。
