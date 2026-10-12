# SoPHP 0.4.13 发布验证

日期：2026-10-12。Core、Symfony、Open Source Pack 已同步发布 0.4.13；Pack 保持 10 个直接成员。

源码提交：`6025b1fa671287f9523475330aaf9abb4d74e0f7`，标签：`v0.4.13`。远端 `main` 已同步该提交。

## 已执行并通过

| 检查 | 结果 |
| --- | --- |
| [标签跨平台 CI](https://github.com/sohophp/php-companion/actions/runs/38233625772) | 18 项检查全部通过：三平台质量、扩展运行、Open Source Profile，以及 PHP 7.2–8.5 集成 |
| [发布工作流](https://github.com/sohophp/php-companion/actions/runs/38233625808) | 类型检查、代码规范、完整测试、24 个组件包、编辑性能基准、三份 VSIX、打包后的扩展运行、Profile 与 Marketplace 发布均通过 |
| [GitHub Release](https://github.com/sohophp/php-companion/releases/tag/v0.4.13) | 三份 VSIX 与 SHA256SUMS 已公开；公网重新下载后的内容及摘要均与发布构建一致 |
| Marketplace 指定版本下载 | 三个 0.4.13 VSIX 的版本、摘要与发布构建一致；Core 和 Symfony 的运行文件逐一核对通过，Pack 的成员清单一致 |
| 本地完整测试 | Semantic：190 文件、24,133 用例通过；Language Server：141 文件、1,644 用例通过、1 个既有条件跳过；Symfony：13 用例通过；根项目：113 用例通过 |
| 本机 Windows 与 Linux 编辑基准 | 各 500 次查询、50 次预热，原有性能、取消、缓存恢复和内存门槛通过；Windows 使用打包后的语言服务器 |

公开安装包摘要：

```text
e30e2024f1f002ffc83d25ce5b20e58d143ed0eb1a70312fa9b1c0cfa46eab45  php-companion-open-source-pack-0.4.13.vsix
9c239f750d26ce9528a3cca6a7a1185af41fbcf7d3d1c3b7414cf62588d662e4  php-companion-symfony-0.4.13.vsix
a1c4b7d4164503a52d3bb1dfc4dc02aba4edab6e96bdab8e17de22b0a65b7fdc  php-companion-0.4.13.vsix
```

## 发布过程发现的问题

- 修复 PHP 7.2–7.4 PostgreSQL 运行时字符串验证、Windows 旧缓存锁保护、内置函数按值重载后的对象类型、Symfony 自动装配查询刷新，以及备用引用搜索的标识符边界与补全前缀匹配。
- 修正测试样例中的 Windows 路径、无盘符文件 URI、CRLF 选区及旧生成操作预期。
- 根扩展包纳入 Changesets 工作区；本地 `pnpm check` 补入组件包验证。CI 与发布流程将组件包和性能检查提前至完整测试之前。
- 取消基准将查询与取消通知一次写入管道，避免把取消通知尚未到达时已完成的查询计为取消失败；保留全部原有查询、断言和性能门槛。失败指标也写入日志。
- 曾出现千文件索引测试超时、Symfony XML 测试固定等待后的断言失败、Windows 临时目录占用导致的清理失败。单独复验及相应作业复跑后通过；未增大测试超时、降低性能门槛或增加跳过条件。这些不稳定测试仍需改善。
- 主分支推送触发的重复 CI `38244673941` 已取消，使用相同源码提交已通过的标签 CI 作为发布证据。

## 未执行及剩余范围

本次未重新安装用户本地 Profile，也未执行真人 WSL 编辑器验收。此前 Profile 中的 0.4.13 候选包早于本次修复，需要重新安装本次正式 VSIX 并重载窗口才能取得最终代码。

完整 R4 功能、真人 WSL 验收及完整性能测试矩阵尚未完成；复杂 Controller 的诊断延迟与最终 `createFile` 备用方案的 Redo 限制继续跟进。本次发行不代表整个项目或这些剩余工作已完成。
