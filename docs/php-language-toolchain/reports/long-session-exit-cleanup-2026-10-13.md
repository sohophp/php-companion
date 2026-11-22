# 长期会话基准异常退出清理

2026-10-13。本批只修复Linux长期会话基准的异常退出，产品Core保持 `8e1a08c7`，未增加功能。

旧工具的finally发送SIGTERM后无限等待子进程退出。实际暂停工具拥有的真实语言服务器，原20秒协议等待到期后父子进程仍存活；24秒观察终点临时项目仍残留，必须由私有测试脚本SIGKILL救援。

现新增terminate清理方法：对尚未结束的本工具子进程发送SIGTERM，一秒后仍存活则SIGKILL；等待注册的退出事件完成，再清理项目并保存失败报告。已正常退出的服务器只等待已有终态。原20秒响应期限、正常shutdown/exit、故障注入、性能预算及会话断言保持。

已执行并通过：真实SIGSTOP故障回归，超时错误退出1，所属服务器已消失，临时目录为空，报告保持failed/qualified=false并标记清理完成。正常30秒、interval=0完整操作链退出0，382轮/1910次核对、陈旧0；实际进程故障及缓存损坏恢复通过，服务器与项目清理通过，stderr为空。定向ESLint与根TypeScript检查通过；首次Lint的no-unsafe-finally失败已修正，未将其算作通过。

旧实现运行同一新回归用例，因原期限后仍未退出而预期失败；当前完整根测试23文件119项通过、0失败。

证据：[旧实现真实观察](../../../.vscode-test/long-session-exit-cleanup-2026-10-13/before.json)、[故障回归](../../../.vscode-test/long-session-exit-cleanup-2026-10-13/focused.json)、[正常会话完整报告](../../../.vscode-test/long-session-exit-cleanup-2026-10-13/normal-evidence/run.json)。回归已由根Vitest默认收集，无需修改发布或CI入口。

30秒流程不代表两小时资格。此前两小时报告属于原工具快照，本次改动未重新执行两小时测试。资格限Linux包内真实服务器协议及工具退出流程；真实编辑器/Remote、复杂Controller的原500/150ms预算及完整计划仍开放。未提交、推送、发布或更新Profile，功能扩展暂缓。
