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
