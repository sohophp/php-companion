# C1 Composer path repository 的符号链接归属

日期：2026-09-24。独立 Composer fixture 用 `repositories.type=path` 安装本地包，`vendor/local/package` 是指向 `packages/local` 的真实目录符号链接。父项目的 `composer.lock` 与 `vendor/composer/installed.json` 同时记录该依赖。

F04-NAV-17 经真实 stdio 打开 vendor 链接路径的包声明，再从声明查询 References，能找到父项目调用；改用同一文件的真实路径打开后，首次复测却返回空结果。原因是 onDemand 发现真实路径下的 `composer.json` 后，只用字面路径判断它是否为父项目的依赖，误把同一包登记为另一个语义根。

修复后，发现候选 Composer 根时先沿用原有字面路径判断，再对已安装依赖和候选根比较文件系统真实路径。真实路径仍落在依赖根内时保留父项目归属。F04-NAV-15 的独立嵌套项目继续隔离；F04-NAV-16 的普通 vendor 包继续归属父项目。F04-NAV-15–17 的真实 stdio 定向 4/4 通过，Project 组件 11/11 通过，Language Server 构建、ESLint 和 `git diff --check` 通过。

本测试证明这两个已打开 URI 的 References 归属；尚未覆盖 symlink 环、链接目标迁移、跨盘路径、Windows/macOS 真实宿主、实际键入补全列表及长期编辑。未修改业务项目，未打包 VSIX。
