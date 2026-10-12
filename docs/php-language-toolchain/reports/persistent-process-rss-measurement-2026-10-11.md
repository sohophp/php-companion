# 持久缓存进程验收脚本修正

2026-10-11。修正[benchmark-persistent-processes](../../../scripts/benchmark-persistent-processes.mjs)的两处验收缺口：实际缓存已采用schema 2独立不可变blob，原损坏注入仍读取schema 1内联payload；现验证原blob长度/摘要，写入新的按内容摘要命名的blob并更新选定条目，保留不可变封装，继续检验内部语义校验失败后只重建一文件。RSS继续保留10ms样本，并取样本与workspace/parser清理后process.resourceUsage().maxRSS的较大值，覆盖采样间隙及清理阶段。预算保持384/768/1536 MiB。

1k四阶段控制通过；进一步五轮、20个独立worker全部通过，最大RSS 151.11/384 MiB。冷索引解析全量、热恢复零解析、两种损坏各只解析一文件；三条Callable事实、跨文件补全和继承派生事实失效断言保持。定向Lint退出0，先前Buffer导入缺失的Lint失败保留。

完整1k/10k/50k各五轮、60个worker矩阵现已终态通过（功能与RSS范围）；[运行状态](../../../.vscode-test/d1749-persistence-scale-matrix-run.json)和[220输入摘要](../../../.vscode-test/d1749-persistence-scale-matrix-input.json)绑定实际脚本、Node、209包JS及八正常运行时资产。两小时LS持续运行同期进行，计时不作为独占机器数据。正常产品源码、包产物及八资产未因本修正重建，日常Profile未更新；原单进程缓存RSS失败和历史50k余量结论继续保留。

这是Linux合成Composer项目的包API worker验收，RSS覆盖worker至清理阶段；父进程、缓存体积、当前bundle完整规模、真实项目、编辑器、Windows/macOS/Remote及整个F13/P9/R4仍开放。沿用现有F13性能范围，不新增编号；166编号/14家族、未完成大项26保持。[机器记录](persistent-process-rss-measurement-2026-10-11.json)。

原[四阶段同进程缓存基准](../../../scripts/benchmark-persistent-index.mjs)已具备schema2适配与最终清理后整进程RSS统计，本轮保持其源码、断言、四次加载/两种损坏/目标水合/派生失效及缓存体积门槛执行1k控制：退出0，整体峰值153.51/384 MiB，热缓存5.48/64 MiB，所有精确性检查通过，自有进程/fixture均已结束。三规模各五轮同进程完整复测绑定222输入，已在独立worker矩阵终态后接续串行运行，尚未终态；[状态](../../../.vscode-test/d1752-whole-process-cache-matrix-run.json)。它补充原整进程范围，控制单轮尚不关闭完整规模或历史内存失败。

同进程矩阵的终态核对另沿用冷索引8/60/300秒门槛，并按热缓存原始bytes核对64/512/2560 MiB；父驱动本身只将RSS/缓存报告纳入退出判断，终态审计补充冷时间和精确字节检查。原1k单轮控制在此加强核对下通过，仍不代替五轮完整矩阵。核对器及单轮证据见[终态核对](../../../.vscode-test/d1761-whole-process-cache-canary-terminal-audit.json)。

## 完整独立worker矩阵终态

15轮/60独立worker全部通过；每轮完整保留cold、warm、layerRecovery及callableRecovery，30次schema2内部损坏恢复、Callable三事实、目标水合与继承失效断言保持。220输入、八正常资产与实际终态核对，全部60 worker/15父基准及15自有fixture已结束/移除；40文件归档摘要核对。

| 文件数 | 轮数/独立worker | 最大RSS MiB | 冻结RSS预算 MiB |
| --- | --- | --- | --- |
| 1000 | 5/20 | 151.11 | 384 |
| 10000 | 5/20 | 279.84 | 768 |
| 50000 | 5/20 | 871.26 | 1536 |

各规模五个cold索引计时仍按8/60/300秒原门槛单独核对，结果见机器报告；此计时来自包API，不是首个UI可见结果。RSS涵盖worker至workspace/parser清理，父进程/缓存体积/完整bundle及编辑器/真实项目仍不由本矩阵证明。同期有长期合成会话、一次真实项目只读尝试及定向工具检查，时间不作为独占机器数据。

[终态审计](../../../.vscode-test/d1750-persistence-scale-matrix-terminal-audit.json)与[40文件归档](../../../.vscode-test/d1750-persistence-scale-matrix-archive/manifest.json)。原同进程矩阵已接续运行；其冷时间/RSS/原始缓存字节仍待15轮终态核对，原历史整进程失败/50k余量及完整F13/P9/R4继续保留，166编号/14家族、未完成大项26保持。

原同进程15轮矩阵现已完整终态，冷时间/整进程RSS/精确缓存字节三类门槛全部通过，见[persistent-whole-process-matrix-terminal-2026-10-11](persistent-whole-process-matrix-terminal-2026-10-11.md)。本页此前“运行中/待终态”为当时记录；历史失败与各资格范围保持。
