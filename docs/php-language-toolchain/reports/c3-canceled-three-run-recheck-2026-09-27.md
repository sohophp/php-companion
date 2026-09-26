# C3 偶发 Canceled 的三次同配置复核

日期：2026-09-27。使用当前 SoPHP 源码、隔离 VS Code 1.139.1 Linux x64、完整 10 项 Open Source Pack Profile 与独立 Composer 夹具；未修改业务项目或重新打包 VSIX。

在新增目标目录备用移动和生成文件权限修复后，同一配置连续执行三次完整 C3 宿主，三次退出码均为 0。每次日志都包含 Symfony 服务 Rename 在无关打开文档编辑后继续返回、目标目录备用移动 Undo/Redo，以及类型生成的预览、应用和撤销链。日志分别为 `/tmp/sophp-c3-cancel-audit-1-20260927.log`、`/tmp/sophp-c3-cancel-audit-2-20260927.log`、`/tmp/sophp-c3-cancel-audit-3-20260927.log`。

这三次没有复现此前偶发的 VS Code `Canceled`。Symfony Rename Provider 的取消令牌检查与语言服务器请求异常处理均未在本轮改动；历史失败日志仍有效，三次通过不足以证明根因已消除或长期稳定。当前没有可重复的单一取消步骤，因此不通过吞掉 `Canceled` 或静默重试来制造绿灯。下一个可复现取消应记录当时的 VS Code 命令、Provider 请求、文档版本和阶段日志，再判断是编辑器主动取消、测试时序还是产品错误。
