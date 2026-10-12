# 当前完整C3 onDemand编辑器验收

2026-10-11。当前正常Core/Symfony在Linux VS Code1.140.0执行原完整C3 onDemand流程，全部原断言和顺序保持，完整流程通过。正常产品、源码、八Core资产、八Symfony资产及95个当前编译依赖逐字保持，既有1,488项完整LSP资格保持。

本轮复用私有Move Member观察器，移除旧前缀第三次命令后的停止点；只在内存包裹原command并记录命令/预览回调与编辑器快照，随后执行原完整suite。七次Move Member结果为六次拒绝及最后一次应用：取消、新增调用者、预览期间调用者输入、实际验证响应延迟中的调用者/目标/磁盘修改均被保护；最终三文件移动、一次Undo/Redo及磁盘未自动保存由原断言验证。第三次preview/beforeApply各实际执行一次，回调后与命令结束时用户注释、version和dirty逐项相同，该版本由实际编辑器快照验证。

协议观察器没有捕获LS子进程或消息，原driver因此qualified=false，原记录保留。新的终态审计直接核对原宿主通过/proc记录的唯一正常LS、WASM参数、宿主PID及结束状态；另保留最初审计误把fixture父目录/tmp当清理目标的工具失败，改为核对准确的自有fixture根；没有重跑产品，不声明协议观测完成，也不以此证明原progressive根因。

完整其它重构检查及原40组生成完整/未完成边界均通过，原期限保持。31,480输入/185链接/两仓库及终态核对；真实LS、宿主、自有fixture/display均结束，68文件归档。源码哈希、七次回调结果及终态见[机器报告](current-full-c3-ondemand-observed-2026-10-11.json)。

新增F08-MOVE-01，164编号增至165，14家族、未完成大项26保持。这里是带被动观测的完整Linux onDemand宿主结果，观测可能影响时序。原progressive失败及其有界前缀未复现记录保留；本轮不能证明原失败根因或修复，完整四流程仍未达标。原生Windows/createFile/165 ms、真人/Remote/当前VSIX/长期和全部原范围继续，日常Profile未更新。
