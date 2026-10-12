# foreach／立即取消构建的 Linux 编辑器验证

2026-10-11，正常构建 `eeeb904eb440d72c21f6fbe8b3e16e32dcb5a0bdff5024e30ae20f0a016ac545`。

原完整 C1 onDemand、C2 onDemand、C3 onDemand 和 C3 progressive 四流程全部通过。C2 包含新增 foreach 断言八次实际提供器查询：正向／分支断言、循环参数重绑定、未知调用、恢复以及一次 Undo/Redo；补全、Hover、精确跳转随当前未保存文本变化，原磁盘保持。两个 C3 保留80组生成边界，以及实参副作用和默认值求值的原多文件预览／取消／应用／并发拒绝／UndoRedo。

本轮重新严格编译98文件；138源输入和98产物核对。固定VS Code 1.140.0／Linux，实际LS／WASM／编辑器参数、30156输入／184链接／两仓库及自有进程终态独立核验。375文件归档及其摘要再次确认。证据`.vscode-test/d2231-current-editor-terminal-audit.json`及`d2231-current-editor-archive/manifest.json`。四轮分别111.67／147.62／283.16／269.48秒，是整个工作流时长，不是查询P95或性能资格。

编辑器资格单独记录；原4eb4a28b完整协议1533／1534中的物理取消失败保持，不能由四流程覆盖。当前eeeb904e的新完整协议、完整扩展组合、真实引用／普通编辑／规模性能、其他平台／WSL Remote、长期和真人仍待验。177编号／14家族和26未完成大项保持；未打包、安装Profile、提交或推送。
