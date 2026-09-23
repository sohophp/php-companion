# F14 Core 设置说明简体中文本地化

日期：2026-09-23。Core manifest 的 30 个公开设置都使用 VS Code `package.nls` 键提供英中说明。其中 23 个既有英文说明保留原文，7 个原本没有说明的设置补充英文默认文案和简体中文译文。路由提供器的嵌套 `cacheUntilInvalidated` 选项，以及旧启动索引设置的弃用提示也改用本地化键。设置 ID、类型、作用域、默认值、枚举和其他结构约束保持不变。

[英文说明基线](f14-setting-description-baseline-2026-09-23.json)固定 30 个设置、嵌套选项和弃用提示的默认文案。`test/unit/public-manifest-baseline.test.ts` 验证所有 32 个键的英文默认值、简体中文译文，以及原[公开 manifest 结构基线](f14-public-manifest-baseline-2026-09-23.json)。该单元测试 2 项、根项目和 Extension Host 测试的 TypeScript 类型检查、相关 ESLint 与四份 VSIX 内容校验均通过。VS Code 1.138.0 Linux x64 的 `zh-cn` 隔离宿主还逐项比较打包扩展运行时解析出的 32 处文案与中文译文；英文默认宿主完整回归也退出码 0。完整门禁与候选摘要见[当前候选报告](p9-alpha-candidate-current-2026-09-23.md)。

此增量仅覆盖 manifest 设置说明。运行时消息、错误文案、配置迁移及旧 Profile 升级仍需逐项核验，F14 最终验收保持开放。
