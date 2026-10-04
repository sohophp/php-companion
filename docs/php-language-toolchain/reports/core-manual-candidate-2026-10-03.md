# SoPHP Core 真人测试候选

2026-10-03；本地提交 `910d35e74566203b888811748ba8203a8ffed744`，分支 work/sophp-next。未推送、发布或打包 VSIX。

Core 0.4.13 已直接更新到现有 WSL 安装目录，19 项文件逐字核对。源码对应独立构建的七项 runtime 哈希；安装 manifest 保留原有安装元数据。备份：`/home/jason/.local/share/sophp-checkpoints/20261003-160543-910d35e7`。完整证据另存该目录 delivery.json 及安装目录 sophp-checkpoint.json。

完整 LSP 33 文件／510 项、Core C2 65 条、支持包 175 项、根 noEmit、独立 24 包构建及 9 项冒烟通过。真人 WSL 验收尚未完成。

## 开始测试

1. 在 SoPHP Profile 的 WSL 窗口执行 Developer: Reload Window。
2. 在独立 Composer 项目测试 clas／enu／func，class／enum 名称处过滤，类内 public、__construct 和 return 接受后的空格。
3. 测试 new ArrayObject、命名参数、成员补全、数组回调与未保存修改；接受建议后检查实际文本和 Undo/Redo。
4. 正常编码，若出现错误记录输入片段、操作与实际结果。准备引用应正常结束；若持续不结束，记录等待时间和当前状态。

外部格式化器的可选补丁未纳入更新；VS Code 批量输入 getItemsByProvider 异常仍未解决。自动化通过不代替真人验收。

此候选交付后按用户要求暂停 goal，不启动新功能。

## 真人反馈修正：Symfony Finding

2026-10-03 已修正上次 Core 单独更新遗漏的 Symfony Provider 快照兼容性，见[交付记录](symfony-snapshot-delivery-compatibility-2026-10-03.md)。Symfony dist 8 项文件已备份同步；实际项目三次请求仅扫描一次。请重载窗口后继续观察，goal 仍暂停；本次没有打包或更新 Pack。

## 后续源码进展与当前交付范围

2026-10-04 用户已要求继续路线图，goal 重新 active。上文的暂停状态是该次交付时点，当前安装候选仍以它自己的 checkpoint 为准；源码继续开发不等于 Profile 已升级。

后续本地源码里程碑 fc87ff6（生成／继承权限／readonly 诊断）与 a1b6236（重构预览重验、不可读 watcher、Move／Rename 环境保护）均未更新 Profile。当前注释密集声明补全优化也尚未交付，完整 LSP 组合回归正在核对。源码证据见[当前路线图](../future-core-plan.md#当前执行顺序)，不能把本页旧的 510 项完整 LSP 数字用于后续源码。

下一次用户要求更新候选后，优先复测真实窗口的声明／魔术方法连续输入和接受文本、未保存修改后候选刷新、引用准备与 Symfony Finding 的终态，以及独立临时 Composer 项目的 Rename／Move 预览、取消、应用和一次 Undo/Redo。运行环境变化拒绝场景也应在临时项目中测试，恢复原设置后确认正常操作。自动化源代码与隔离宿主证据继续单列，未安排或要求用户立即开始测试。
