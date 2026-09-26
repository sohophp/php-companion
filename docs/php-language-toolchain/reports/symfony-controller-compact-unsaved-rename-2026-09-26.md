# `compact()` 模板变量的未保存改名反馈

日期：2026-09-26。沿用独立 Composer 夹具与隔离 VS Code Profile；没有修改业务项目。

在 Controller 中将连续赋值的 `$title` 和对应的 `compact('title')` 一起改为 `$headline`，不保存文件。分析器对新快照返回完整的 `localUser` 与 `headline` 上下文，旧的 `title` 消失；TwigPlus 对同一模板中的旧名称停止跳回 PHP，新名称获得补全和定义跳转。Revert 后恢复磁盘上的原上下文。

框架定向回归通过；隔离 Core＋Symfony＋TwigPlus 宿主退出码 0，日志 `/tmp/sophp-compact-rename-focus-20260926.log`。包含 10 项的完整 Open Source Pack 源码 Profile 也退出码 0，日志 `/tmp/sophp-pack-compact-rename-20260926.log`。测试宿主 TypeScript、相关 ESLint 和 `git diff --check` 通过。单独运行 Symfony 上下文宿主时使用隔离用户数据目录，避免影响当前 VS Code Profile。

这验证的是源码组合对未保存编辑与 Revert 的自动反馈；旧 `15a5254` 安装候选没有此增量。真实 WSL Remote 与长期使用仍属 C4 验收。
