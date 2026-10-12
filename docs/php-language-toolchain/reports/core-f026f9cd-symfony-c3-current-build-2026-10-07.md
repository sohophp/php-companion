# D343–D348：当前 Symfony 构建与 Linux 完整 C3

2026-10-07，正常 Core `f026f9cd` 保持，四份正常 Symfony Provider bundle 已按当前源码刷新；Linux 原完整 C3 **通过**。详见[机器报告](core-f026f9cd-symfony-c3-current-build-2026-10-07.json)。

准备阶段独立执行正常 TypeScript 编译产物对照，83 个 JS 与实际 dist-test 相同；正常 Symfony esbuild 配置的独立输出发现四份 Provider bundle 尚未同步，D343 预检退出 1，未启动宿主。该构建一致性失败和原产物完整保留。D344 先备份全部八份资产，再正常执行 `node esbuild.mjs --production`；只有四份既有 Provider bundle 改变，结果与独立构建候选逐项一致，Core、扩展入口、Winstar Provider、WASM、生产源码及两仓状态保持。

四个完整 Provider 单测文件 **45／45 通过**，无失败、跳过或 TODO。设置实际正常 bundle 路径后，原跨进程引用恢复与变更输入拒绝协议 **1 项通过**，另 543 项由名称筛选未执行；不计为整份 stdio 或完整 LSP 通过。两轮实际终态及冻结输入均保持。

Linux 原完整 Core＋Symfony C3 **205.75 秒退出 0**，4344 冻结输入、两仓、Node、九份实际 PHP CLI、编辑器二进制／package／product 均保持。实际宿主 VS Code 1.140.0、Linux／Node v24.21.0，PHP 目标 8.5／onDemand。只选择完整 C3，无子集或 Pack 标记；测试入口包装器调用未修改的原完整 C3 后追加设置及生命周期核验。原宿主和外层进程均自然退出 0，最终意外关闭／重启失败／待处理版本刷新均为 0，重启中／已安排重启均为 false。

原流程包括导入与整理、生成、Rename／Safe Move、提取与参数修改，实际预览／取消／应用／UndoRedo，旧请求／外部磁盘／未保存内容保护，Symfony PHP／YAML 路由导航、跨 YAML／XML／PHP 服务 Rename、未保存事件引用撤回，以及第二 Composer 根生成。原事件日志的 “Pack host” 是既有文字；本轮实际只加载 Core＋Symfony，不扩大为 Pack／TwigPlus／外部工具组合。26 份宿主日志及全部原失败／构建前后资产、脚本和输入输出附哈希，不以日志行数或编译文件数充当测试案例数。

此前 [D321 的 1321 项完整 LSP](core-f026f9cd-full-regression-2026-10-07.md)继续绑定其原 Provider 资产组合；本轮四份正常 bundle 更新后，不能直接继承完整组合资格。下一项独立核验当前组合完整 LSP，随后推进原 C4／性能与其它独立缺口。[当前 Linux C2 与 Windows 限制](core-f026f9cd-c2-platform-check-2026-10-07.md)保持：Windows 在更新结束后重新冻结实际安装再补验，不重复等价启动或绕过更新。

普通编辑 **157.74／150 ms**、正常完整 10k RSS **920.54／768 MiB** 仍失败；50k、高级语义与重构、其它版本／平台／模式、完整工具组合、长会话与真人 WSL，以及全部原 C1–C4／R4、P0–P9／F01–F14 继续开放。未提交、推送、打包、安装、更新 Profile 或发布。
