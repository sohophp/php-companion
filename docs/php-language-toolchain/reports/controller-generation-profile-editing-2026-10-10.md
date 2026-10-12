# Controller修复后的完整工具Profile与日常编辑

当前正常Core/Symfony构建的完整12扩展源码Profile与原25轮日常编辑均通过，原入口、顺序、查询数及150 ms热查询预算保持。

| 验收 | 当前结果 |
| --- | --- |
| 完整12扩展Profile | 全流程通过，PHP/Twig唯一实际服务器及扩展版本/路径核对 |
| 真实vendor标量补全 | 9,100噪声文件、50轮，P95 88 ms |
| Union/shape补全 | 原30轮，P95 98 ms |
| 日常编辑 | 原5场景各5轮、每轮100查询，共2,500查询通过 |
| 日常编辑性能 | 25轮全部满足150 ms，最大P95 149.91 ms |

日常编辑保留PHP7.2、PHP8.5合成场景，以及Winstar三个真实源码场景；未保存改动仅作用于隔离缓冲区，原磁盘保持。首次修改后的单次组合Hover为37 ms，仅是本次观测，不能当作激活时间或稳定上界。Profile原91份编译测试按摘要逐字复用，完整流程重新执行；2,482份运行输入和八个正常Core资产核对。

本次正常LS摘要为`0ae33e9b04c83f12ccbb8dd086a8f3c547818978acb383700b27e8a3f6a131d0`。Profile及日常编辑的冻结输入、链接和两仓库状态保持，实际服务器、宿主、驱动和专属显示进程均结束。分别归档59和66份文件，日常归档核验完整Profile证据，后者绑定当前1,476项完整LSP及52文件归档。见[同名JSON](controller-generation-profile-editing-2026-10-10.json)、[Profile归档](../../../.vscode-test/d1629-controller-generation-profile-evidence/manifest.json)及[日常编辑归档](../../../.vscode-test/d1631-controller-generation-ordinary-evidence/manifest.json)。

准备脚本继承了历史宿主日志目录；终态按本次唯一时间目录及实际fixture路径恢复当前日志，历史57份归档逐项复核保持，未为绿灯重复执行。[当前四组Linux编辑器](controller-generation-linux-editor-workflows-2026-10-10.md)资格独立保留。

上述结果只覆盖本次自动Profile及日常编辑场景。原Windows C2失败、createFile fallback Redo限制，以及完整激活矩阵、其它平台、长期和真人Windows/WSL Remote验收继续；未关闭P9或其它大项，未完成大项仍26。日常Profile未更新，未提交、推送、打包或发布，完整目标未完成。
