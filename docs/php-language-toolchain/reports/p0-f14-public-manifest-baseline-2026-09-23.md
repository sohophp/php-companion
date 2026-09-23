# P0 / F14 公开 manifest 基线

日期：2026-09-23。机器可读基线为 [Core/Symfony manifest JSON](f14-public-manifest-baseline-2026-09-23.json)，由当前 `package.json` 与独立 Symfony 扩展 manifest 投影生成，不包含测试时的其他工作树改动。

基线固定两扩展的 ID、激活事件、23 个命令的 ID/标题/分类，以及 30 个设置的类型、作用域、默认值、枚举与其余结构约束；说明文案可单独修订。测试还拒绝重复命令 ID，并要求命令分类显示为 SoPHP。`test/unit/public-manifest-baseline.test.ts` 对当前 manifest 与基线逐项比较；有意修改公开契约时须连同兼容或迁移说明更新基线。

验证：`pnpm exec vitest run test/unit/public-manifest-baseline.test.ts` 1 项通过；根项目 `pnpm exec vitest run` 12 个文件、47 项通过；`pnpm exec tsc --noEmit` 与相关 ESLint 通过。后续提交 `059d2194` 的 `pnpm check` 全量退出码 0；打包 Core/Symfony 候选在 VS Code 1.138.0 隔离宿主中逐项验证全部 23 个 manifest 命令实际注册，宿主退出码 0。产物摘要和预检见[当前候选报告](p9-alpha-candidate-current-2026-09-23.md)。

此证据固定源码 manifest 与打包扩展的命令注册；每个命令的实际行为、设置迁移、中文本地化、两个 Pack 的安装及旧 Profile 升级仍需分别验证；P0 现有功能回归基线和 F14 最终验收不因此关闭。
