# 0.4.13 后续源码增量的完整门禁与连续编辑复核

日期：2026-09-29。源码基线为 `32e7e6a` 加当前未提交改动，包含 C1/C2 的补全与未保存反馈，以及 C3 的安全编辑增量。本报告只记录 Linux x64 本机源码结果；它不代表打包候选、跨平台 CI 或真实 WSL Remote 编辑器验收。

## 运行环境与结果

- Node.js 22.14.0；Linux x64；Intel Xeon E5-2696 v3。
- `pnpm test`：退出码 0。包括全部组件包、Symfony 包和根扩展测试；其中语义包 484/484 通过，语言服务器 21 个测试文件、443 项通过、1 项跳过。
- `pnpm typecheck`：退出码 0。
- `pnpm lint`：退出码 0。
- `node scripts/benchmark-editing.mjs 500 50`：退出码 0；500 次测量、50 次预热。交替修改打开缓冲区的对象类型，每轮检查补全、Hover、Definition，末尾注入持久缓存损坏并重启。
- `pnpm test:extension:open-source-profile:source`：退出码 0。VS Code 1.139.1 Linux x64 的隔离源码宿主加载 Core、Symfony、Pack、TwigPlus 与固定外部成员，测试独立 Composer 工作区的 Pack 操作链。运行时设置 `PHP_COMPANION_TEST_PROFILE_SOURCE=1`、`PHP_COMPANION_TEST_PROFILE_SYMFONY_CONTEXTS=1`，外部扩展目录为 `/tmp/sophp-pack-source-context-20260926`，TwigPlus 源码为 `/var/www/node/twig-plus/packages/vscode`，PHP 8.5 与隔离的 fixer/PHPUnit CLI 由现有测试工具目录提供。宿主日志明确通过 C2 未保存命名参数、已知数组展开、10 轮局部标量编辑（P95 142 ms）、联合数组形状反馈和 Symfony 未保存上下文到 Twig 的刷新。

| 连续编辑指标 | P95 | 冻结预算 |
| --- | ---: | ---: |
| 更新到诊断 | 32.56 ms | 500 ms |
| 热成员补全 | 2.11 ms | 150 ms |
| 有类型的实参补全 | 3.27 ms | 150 ms |
| 空实参补全 | 2.91 ms | 150 ms |
| 已输入前缀的成员补全 | 3.61 ms | 150 ms |
| Hover | 1.54 ms | 150 ms |
| Definition | 1.79 ms | 150 ms |

取消耗时 1.15 ms，结果为 `cancelled`。补全、Hover 与 Definition 的过期结果计数均为 0。语言服务器 RSS 基线 170.19 MiB，峰值 171.11 MiB，末尾 162.19 MiB；损坏缓存可重建，重启后补全可恢复。

这次门禁关闭的是当前源码组合的回归检查，并在隔离 Pack 源码宿主复核了独立 Composer 操作链。第 2 项的其它持续编辑与可见弹窗场景、人工 WSL Remote 验收、冻结 VSIX 与发布门禁仍按候选阶段单独判定。
