# 可追溯稳定候选与当前阻断

2026-10-20。稳定版计划执行中的阶段结果，完整目标未完成。

## 已执行并通过

- 只读核对发现：原工作区生产修改已包含在远程 `64395e09`，远程后续稳定性修复位于 `fix/legacy-constructor-rename-20261015`。未覆盖原工作区；新建独立工作树 `/var/www/node/php-companion-stable-20261020`、分支 `work/stable-20261020`，以 `1f096ff102cb26b5cdcbd9e53872dbcceacfaf2a` 为代码基线。
- 该源码提交的[CI 39277517219](https://github.com/sohophp/php-companion/actions/runs/39277517219)已完成并通过20个作业，包含三系统质量、扩展宿主、开源组合、九个实际PHP集成版本和两个Node20运行时。保存完整作业及步骤终态，未将其他分支绿灯当成原8219候选资格。
- 下载同次CI的三份VSIX；独立工作树离线冻结依赖安装及Core构建通过，八个Core运行资产与下载包逐字一致。通过原候选组装入口生成 `artifacts/php-companion-alpha-0.4.13-1f096ff1/`，包含三包、`candidate.json`、`SHA256SUMS`及中文安装说明；源码提交可追溯，仍标为Alpha候选。
- WSL已安装Core的18个文件及Pack的6个文件与CI包一致；Symfony原有4个Provider文件不同，备份16个旧安装文件并回读核对后，通过服务器本地安装入口更新。最终Symfony的15个包内文件也全部一致，共39个文件核对通过。`package.json`忽略安装器生成的`__metadata`后比较；Alpha Profile仍为15成员，其余14个条目逐字保持，仅Symfony安装器标识及metadata更新，版本和位置保持。
- 原远程CLI安装调用未产生输出，安装目录核对仍与备份一致；结束该自有CLI进程后使用服务器本地入口，实际安装退出0。未强制重载用户窗口，未执行真人操作验收。
- 复杂Controller原25轮完整诊断与可见补全摘要均与既有工作流一致；诊断正反例、磁盘未变、实际服务器退出0及缓存清理通过。

| CI安装包 | SHA-256 |
| --- | --- |
| Core 0.4.13 | `5bea7fed04844a9874c549e8a46e07d5691a30aa1ce4e56410fd9e6b886901dd` |
| Symfony 0.4.13 | `06111deb7d7e22d28da41b04e773928d9215772b87ef63cffe384d0a3a9febef` |
| Open Source Pack 0.4.13 | `9e4ee5d32977792a52e720aa07829ca6e8672c3f0f0fff7be7028e5fc14f1c51` |

Core语言服务器摘要为 `5095cf1541e5fdbe8d72277987358676e21382bcdcc2f6429700e3aadafe7e8c`。

## 已执行但失败

构建结束后执行固定真实Controller、PHP8.5/onDemand原25轮，保留全部样本，不排除首轮或较慢查询：

| 指标 | P95 | 中位数 | 最大值 | 原门槛 |
| --- | ---: | ---: | ---: | ---: |
| 诊断 | 1527.62 ms | 1352.88 ms | 2281.52 ms | 500 ms，失败 |
| 补全 | 634.57 ms | 130.50 ms | 636.13 ms | 150 ms，失败 |

此前同一候选的首轮25次测量与本地TypeScript构建重叠，原日志和统计保留在`firstControllerRun`，不授予性能资格。构建退出后才进行上表补验，未放宽门槛或改变输入。该表限原固定工作流，不能推导完整性能或全平台达标。

另一个新成本调查：[来源文件精确声明筛选](callable-source-lookup-cost-2026-10-20.md)每编辑中位43.79 ms，未达预定50 ms原型调查门槛，结束该方向，不制作新缓存。

## 正在执行与尚未完成

- 发现版本/模式矩阵仍绑定旧Core `078d8ae7…`。独立分支本地提交 `193cda54`只将预期Core改为`5095cf15…`，不改变原版本、三模式、三系统、500次编辑和预算。该提交尚未推送；不能称其远程CI已通过。原代码基线`1f096ff1`的20作业资格与此工作流修正分开记录。
- 当前Linux九版本三模式矩阵已全部退出0并通过[独立核对](stable-linux-full-matrix-2026-10-20.md)：13500次正式编辑、27个实际目标加载证明，原预算保持。当前构建其余平台完整矩阵仍需补齐，不把普通场景通过等同于复杂性能达标。
- Alpha Profile的实际外部成员与候选冻结版本仍有两项差异：YAML为2.0.0（冻结1.24.0）、PHP Debug为1.40.2（冻结1.40.1）。本次未改动其余14项成员，因此三份产品包一致不能等同于完整Profile冻结一致；当前外部版本已完成[Linux隔离完整组合验证](current-alpha-profile-2026-10-20.md)，原完整流程与独立审计通过；其它平台和真人资格保持开放。[只读核对](../../../.vscode-test/stable-candidate-1f096ff1-2026-10-20/external-profile-review.json)保留差异，组合通过资格以新增精确版本报告为准。
- 复杂文件性能、真人WSL重载及六步操作、真实项目多小时使用、当前最终候选完整矩阵和最终六项检查均未完成；没有发布新版本。

证据：[机器汇总](stable-candidate-1f096ff1-2026-10-20.json)、[CI原始作业记录](../../../.vscode-test/stable-baseline-2026-10-20/remote-ci-1f096ff1.json)、[三份下载包及运行文件摘要](../../../.vscode-test/stable-candidate-1f096ff1-2026-10-20/artifacts.json)、[本地Core八资产复核](../../../.vscode-test/stable-candidate-1f096ff1-2026-10-20/local-core-assets.json)、[25轮终态](../../../.vscode-test/stable-candidate-1f096ff1-2026-10-20/controller-25-after-build/result.json)、[安装终态复核](../../../.vscode-test/stable-candidate-1f096ff1-2026-10-20/installation-review.json)。
