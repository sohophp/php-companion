# 跨平台候选验收报告

日期：2026-09-14。源码：`c9adcf7e6c38dcf776871e7f54f0d725f28ce75f`。自动化证据：[GitHub Actions CI 34771375887](https://github.com/sohophp/php-companion/actions/runs/34771375887)。

## 通过范围

- Linux x64、Windows x64 与 macOS arm64 的 `typecheck`、ESLint、全部组件和根扩展测试通过；当前测试总数为十五个组件 590 项、根扩展 33 项，共 623 项。
- 三个系统均从真实 tarball 在仓库外安装十五个组件，检查发布文件、依赖版本范围和 ESM 导入，并启动已安装的 `@php-companion/language-server` 完成 LSP initialize、文档符号查询、shutdown 与 exit。
- 三个系统均完成 50 次预热和 500 次连续编辑测量；每次等待当前版本诊断并验证对应类型补全。全部平台陈旧补全为 0，损坏持久缓存被重建，Language Server 重启后精确补全恢复。
- 三个系统均构建并校验主扩展、Open Source Pack 与 Recommended Pack；主扩展在 VS Code 1.137.0 的真实打包 Extension Host 中通过。Linux CI 另外通过开发模式和安装 Intelephense 时的兼容模式宿主测试。
- PHP 7.2、7.3、7.4、8.0、8.1、8.2、8.3、8.4 与 8.5 的运行时集成任务全部通过。

## 编辑与恢复指标

| CI 系统 | 处理器 | 诊断 P95 | 热补全 P95 | 取消 | 最终 RSS 增长 | 陈旧补全 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Linux x64 | Intel Xeon Platinum 8370C | 1.48 ms | 0.49 ms | 0.62 ms，已取消 | 3.14 MiB | 0 / 500 |
| Windows x64 | Intel Xeon 6973P-C | 1.83 ms | 0.71 ms | 52.79 ms，请求先完成 | 1.83 MiB | 0 / 500 |
| macOS arm64 | Apple M1 Virtual | 0.91 ms | 0.33 ms | 0.34 ms，已取消 | 3.06 MiB | 0 / 500 |

三个系统均满足冻结预算：诊断 P95 不超过 500 ms、热补全 P95 不超过 150 ms、取消或完成不超过 100 ms、最终 RSS 增长不超过 128 MiB。原始结果分别见 [Linux JSON](editing-resilience-linux-x64-ci-2026-09-14.json)、[Windows JSON](editing-resilience-windows-x64-ci-2026-09-14.json)和[macOS JSON](editing-resilience-macos-arm64-ci-2026-09-14.json)。

## 产物

CI 上传的主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `debabacb7180661648bf37fa4a56526b0329326cd208af0701c5207a7116d3d8`。该校验值只标识本次 CI 归档产物；没有把本地重新打包的时间戳差异混入此证据。

## 未关闭边界

本报告关闭当前候选的三系统自动门禁，不代表 R4/F13 整体完成。Windows + WSL Remote 自动矩阵、三个系统的完整第三方插件组合、多小时大型真实项目会话、发布后 Marketplace 干净安装和人工图标检查仍待执行。没有执行 npm 包或 VS Code Marketplace 发布。
