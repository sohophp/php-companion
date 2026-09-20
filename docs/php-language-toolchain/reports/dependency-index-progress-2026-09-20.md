# 依赖索引进度准确性

日期：2026-09-20

功能提交：`07cb587e22c75da7470e0651007041d7e5e630f8`

## 问题

索引器在进入 Composer 依赖阶段后仍把项目 PHP 文件数作为进度总数。真实 Winstar 工作区有 2,275 个项目文件；受 10,000 文件预算限制的索引在依赖阶段可到 9,999 个文件，因此状态栏会出现不可能的 `9999/2275`，而 VS Code 进度值长期停在 95%。这会让已经正常推进的依赖扫描看起来像无限索引。

修复前的真实只读探针记录了 9,999 个进度事件，其中 7,724 个事件满足 `files > total`。

## 实现

- 项目阶段以项目 PHP 文件数为总数，Winstar 显示为 `2275/2275`。
- 依赖阶段以“项目文件 + 本次预算内实际安排的依赖文件”为累计总数；受 10,000 文件预算截断时，最后一个已处理事件显示 `9999/10000`。
- Language Server 将项目阶段映射到 10%–60%，依赖阶段映射到 60%–95%；阶段切换时进度保持单调，不会从项目完成值回退。
- 100% 仍只在整个索引流程结束后报告；本次修改不改变文件预算、索引结果或索引耗时。

## 精准回归

`@php-companion/index` 新增三文件样本，验证项目事件为 `1/1`，依赖事件依次为 `2/3`、`3/3`，并断言每个事件都满足 `files <= total`。

重新构建索引包后，对真实 Winstar 工作区执行同一 9,999 文件只读探针：

| 项目 | 修复前 | 修复后 |
| --- | ---: | ---: |
| 进度事件 | 9,999 | 9,999 |
| `files > total` 事件 | 7,724 | 0 |
| 项目阶段末值 | `2275/2275` | `2275/2275` |
| 依赖阶段末值 | `9999/2275` | `9999/10000` |
| 项目索引完整 | 是 | 是 |

真实 Winstar 全量审计仍完成 2,275 个项目文件，100/100 抽样声明可解析，References P95 为 19.239 ms、最大 76.437 ms，Doctrine oracle 通过。该冷启动审计耗时 83.072 秒、峰值 812.1 MiB；这些是当前基线，本增量只修复进度契约，没有宣称改善冷启动性能。

## 验证与候选

- `@php-companion/index` 3 个测试文件、27 项全部通过。
- Language Server 5 个测试文件、196 项全部通过。
- TypeScript、相关 ESLint、24 个隔离 tarball 和四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 同时加载核心与独立 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过；机器结果见 [Winstar JSON](alpha-preflight-winstar-index-progress.json) 与 [CoreRepo JSON](alpha-preflight-corerepo-index-progress.json)。

候选目录：`artifacts/php-companion-alpha-0.4.5-07cb587e/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `6e445f764847e2523217b0f8b0a92cbf70cfd9f9b00f414110987378b7676a95` |
| `php-companion-symfony-0.4.5.vsix` | `12c0721aed08a8b2fbd3374064854e54a3e9a40d05152bb23f175e1c7573ca9a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `2ccb97143d7ded65cc64ae0d76028b918cc9adf0cf8cc59be146917c550f05a9` |
| `php-companion-recommended-pack-0.4.5.vsix` | `cb311b9994f337b8316ec99e238f6a558419b444f2d9e01b8883860402262c95` |

核心与独立 Symfony 候选已覆盖安装到 WSL RockyLinux8。候选包与安装目录中的 `dist/language-server.js` SHA-256 均为 `ca0d758b034e0f9fe5c1a2379c400fb6d5bbc693d4b0db2b636ae01546e769bc`；旧进程终止后，VS Code Extension Host 已自动启动新语言服务器进程。
