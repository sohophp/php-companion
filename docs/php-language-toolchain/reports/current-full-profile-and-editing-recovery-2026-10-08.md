# 当前完整工具组合与连续编辑恢复

2026-10-08。当前正常 Core／Symfony 和当前 TwigPlus 的 **Linux 原完整 source Profile 门禁通过**，退出0、114.53秒。两种模式的连续编辑、取消和损坏缓存恢复均正确；**onDemand 因 RSS 增量超过原门槛而整轮未通过**，experimental 整轮通过。组合与两个基准分别只执行一轮，保留原断言、顺序和预算，没有重复失败运行求通过。详见[机器证据](current-full-profile-and-editing-recovery-2026-10-08.json)。

## 完整 source Profile

原 `runPackagedTest.ts` 的 source Profile 与完整 `suite/index.ts` 入口保持，启用原真实vendor默认9,100噪声文件／50轮标量反馈／30轮联合形状，以及 Symfony Controller→Twig 自动刷新检查。只在原流程后追加运行资产、实际进程和生命周期核对，没有预热或缩成部分功能。正常生产资产复制到隔离目录，当前测试以原配置严格编译89份JS通过；TwigPlus原精度宿主的源码与运行资产保持，仅历史报告文档有变化，不重建或修改Twig产品。

实际清单为 Pack 的10个声明成员、Pack自身和Apache传递依赖，共12项；包括当前Core／Symfony／TwigPlus，锁定YAML 1.24.0、XML 0.29.3、PHP Debug 1.40.1、PHP CS Fixer扩展0.3.21、EditorConfig 0.18.2、Apache snippets 1.4.0、PHP DocBlocker 2.7.0及Apache语言扩展1.2.0。没有安装Intelephense或被排除的Symfony／XML／PHPUnit Provider。

PHP导航／引用、命名参数／unpack、跨文件未保存编辑、联合形状与诊断恢复，Twig／YAML／XML／JSON格式化、PHP实际格式化与撤销、EditorConfig、PHP Debug启动／结束、真实PHPUnit测试写入，以及Symfony未保存context键编辑／Undo后的Twig补全与Definition通过。工具为独立锁定目录中的PHP 8.5.9、PHP CS Fixer 3.95.27及PHPUnit 11.5.56；原旧工具目录缺少PHPUnit入口却返回0，版本文本预检未通过，未用于产品资格，也没有修改旧目录。

真实vendor反馈的标量50轮P95 **155 ms**、联合形状30轮P95 **538 ms**，首次组合Hover **1292 ms**；首轮服务器计时中hoverWorkspace为1219 ms，说明当前首轮成本集中于工作区准备，但不证明全部后续联合形状延迟的原因。原组合套件按正确性等待，并没有对这些观察设置硬性能门槛，故通过不等于延迟达标。50轮中六次首请求Definition均落到正确声明；嵌套Composer PHP 7.2版本诊断、30轮后的watcher／打开缓冲区优先与受控旧Hover恢复保持。宿主RSS采样不能替代独立语言服务器峰值或长会话。

实际Linux VS Code 1.140.0／扩展宿主Node v24.21.0，一个PHP语言服务器和一个Twig语言服务器分别绑定当前运行资产；Core使用正确两份WASM。最终默认自研服务器启用、onDemand及原12项路径／版本保持；意外关闭、重启失败、待版本刷新均为0，无正在或已安排重启。原完整流程退出后两个服务器和专属显示器均终止；原日志保留，不宣称所有外部扩展日志零警告。

## 当前正常服务器的连续编辑与恢复

原 `scripts/benchmark-editing.mjs` 直接启动当前正常语言服务器和两WASM。两个模式各100预热＋1000正式编辑，500噪声函数、PSR-4夹具保持；每轮四种补全、Hover、Definition及精确版本诊断，共2200轮／13,200次循环查询。两种非取消有结果对照及实际取消、缓存损坏／schema 2重建摘要与长度验证、重启后补全／Hover／Definition和未保存缓冲区优先均通过；onDemand另有原References恢复检查。每模式观察两个实际服务器，终态均退出。

| 模式 | 四种补全最高热P95 | Hover／Definition热P95 | 编辑→诊断P95 | 取消最大等待 | RSS基线→结束 | RSS增量／门槛 | 整轮 |
|---|---:|---:|---:|---:|---:|---:|---|
| onDemand | 4.67 ms | 1.64 / 1.67 ms | 29.52 ms | 5.01 ms | 223.39 → 362.52 MiB | 139.12 / 128 MiB | 未通过 |
| experimental | 4.52 ms | 1.85 / 1.91 ms | 30.01 ms | 0.70 ms | 224.63 → 269.53 MiB | 44.89 / 128 MiB | 通过 |

热查询原门槛150 ms、诊断500 ms、取消100 ms均保持并通过。onDemand仅因 **139.125 > 128 MiB** 的结束减基线RSS而退出1，该失败保留；不能用experimental通过替代它。RSS每十轮采样，并非真实高水位；结束减基线也不是retained heap或泄漏证据，不强制GC、放宽预算或重复原轮求绿色。

三轮终态26814份冻结输入（含原14,393依赖／工具输入）、全部源码／生产／编译／复制资产、链接与两仓状态保持。完整目标仍包括未达标引用／普通编辑／规模内存、当前其它版本／平台／模式、VSIX完整组合、真人WSL和多小时使用、其余高级类型／重构及P0–P9/F01–F14。历史超时、listener警告和createFile回退Redo限制不由本次关闭。下一步对当前onDemand RSS增长做有界阶段与对象保留取证，并保留本次组合反馈延迟作为独立性能缺口；有新证据再选择不同方案。

本批未修改正常产品源码、提交、打包、推送、发布或更新日常Profile。
