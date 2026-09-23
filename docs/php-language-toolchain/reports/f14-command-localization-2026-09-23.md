# F14 Core/Symfony 命令标题简体中文本地化

日期：2026-09-23。Core 的 22 个命令和独立 Symfony 扩展的 1 个命令改用 VS Code manifest 的 `%key%` 本地化键。英文默认标题逐项保持[公开 manifest 基线](f14-public-manifest-baseline-2026-09-23.json)原值；`package.nls.zh-cn.json` 为 23 个命令提供简体中文标题。命令 ID、SoPHP 分类、激活事件和三个导航命令的启用条件保持不变。

源码门禁从两个 manifest 解析本地化键，检查英文默认文案、简体中文译文及原公开契约。另有打包 VS Code 1.138.0 Linux x64 隔离宿主的 `zh-cn` 测试：将简体中文语言包安装到临时 Profile，启动本地化编辑器，逐项比较 Core/Symfony 23 个运行时命令标题与各自 VSIX 内的中文译文，同时检查命令已注册。测试退出码 0；日志末尾为 `Verified Simplified Chinese command titles in packaged PHP Companion VSIX`。语言包安装和索引都只写入临时测试 Profile。

已通过 `pnpm exec vitest run test/unit/public-manifest-baseline.test.ts`、根项目和 Extension Host 测试的 TypeScript 类型检查、相关 ESLint、四份 VSIX 内容校验、上述中文宿主专项，以及英文默认界面的完整打包 Extension Host 回归。两次宿主均在 VS Code 1.138.0 Linux x64 隔离 Profile 中退出码 0。`pnpm check` 和从干净提交冻结候选的结果，以后续[当前候选报告](p9-alpha-candidate-current-2026-09-23.md)为准。

此增量只覆盖命令标题。设置说明、运行时提示与错误消息尚未完成逐项本地化；命令功能、设置迁移及旧 Profile 升级也仍需独立验收，F14 保持开放。
