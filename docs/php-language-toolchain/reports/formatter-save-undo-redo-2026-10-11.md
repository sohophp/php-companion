# PHP/Twig 格式化后的保存、撤销与重做

2026-10-11。新增持久场景 `F11-FORMAT-04`（PHP）与 `F11-FORMAT-05`（Twig），共享真实编辑器生命周期 helper，接入原完整12扩展源码 Profile。每次实际执行 `editor.action.formatDocument`，分别核对文档默认formatter为PHP CS Fixer和TwigPlus；原提供编辑与PHP失败恢复等全部断言、顺序和预算保持。

两种文档均从已保存的未格式化源开始：格式化改变缓冲区并置dirty，但不写磁盘；显式Save逐字保存格式化缓冲区并清除dirty；一次Undo精确恢复原文且dirty，磁盘仍是已保存的格式化内容；一次Redo精确恢复格式化缓冲区并清除dirty，磁盘仍保持。原文及实际格式化结果完整记录于机器报告。测试覆盖手动格式化后保存，format-on-save另行验收。

严格扩展测试编译和两文件Lint通过，原92个资格依赖保持，其中91个逐字相同，index仅增加import及两个调用，新增helper后资格依赖93个；原额外7个编译文件保持。正常产品源码、八个运行时资产、Twig来源和既有1,488项LSP资格保持。

新增场景后的原完整12扩展源码Profile功能通过，本轮原50/30轮反馈P95为86/107 ms，150 ms门槛通过。原165 ms失败保留，性能根因和修复仍未证明。31,413运行输入/185链接及两仓保持，实际PHP/Twig/宿主/显示和夹具均结束，69文件归档。

编号从153增至155，14家族保持；完整F11还需Twig失败恢复、format-on-save与全版本/平台/Provider矩阵。原C3/Windows/createFile、长期使用、真实VSIX/WSL及原全部目标继续开放；未完成大项26，日常Profile未更新。源与编译摘要、实际完整证明和限制见[机器报告](formatter-save-undo-redo-2026-10-11.json)。
