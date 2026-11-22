# Windows原生最低Node版本的编辑与恢复

2026-10-13。正常Core f60765a4、原benchmark-editing及断言保持，在新NTFS复制目录串行运行Windows原生Node20.0.0与24.16.0；PHP8.5/onDemand/PSR-4/500噪声函数，各50预热及500正式编辑。

## 已执行并通过

| 原生运行时 | 诊断P95 ms | 六类热查询最高P95 ms | 两取消最大 ms | 工作集结束减基线 MiB |
| --- | ---: | ---: | ---: | ---: |
| v20.0.0 | 45.78 | 8.96 | 19.20 | 53.75 |
| v24.16.0 | 43.70 | 6.56 | 28.42 | 14.23 |

原500/150/100ms、内存结束差值128MiB门槛通过；正式结果匹配版本，陈旧补全/Hover/Definition均0。空词与Alpha两查询均有非空正对照、实际取消通过；两阶段都损坏真实缓存，验证重建载荷，以及与磁盘不同的未保存内容重放后的补全/Hover/精确Definition/References恢复。

官方Windows20.0归档SHA256保持此前核对；现代对照使用现有node.exe。12复制资源与原文件摘要保持，1012冻结产品/测试输入保持。Get-CimInstance按本批NTFS路径核对无所属原生进程，所有新建临时项目消失，复制目录已删除；两阶段stderr为空、整驱动退出0。

Windows工作集为每十次编辑采样，不是进程真实高水位；结束减基线不代表垃圾回收后的保留堆，也不由版本间差值推断性能改善。

证据：[原始状态与命令](../../../.vscode-test/windows-node20-editing-2026-10-13/state.json)、[20.0结果](../../../.vscode-test/windows-node20-editing-2026-10-13/20.0.0.json)、[24.16结果](../../../.vscode-test/windows-node20-editing-2026-10-13/24.16.0.json)、[终态核对](../../../.vscode-test/windows-node20-editing-2026-10-13/final-audit.json)。

资格限Windows原生协议、上述两运行时和单模式普通合成项目；不代表Windows Node22 CI、真实VS Code/WSL窗口、其他模式/复杂Controller或多小时会话。最终同Core的Linux完整LSP已独立通过，见[对应记录](final-node20-lsp-2026-10-13.md)。复杂文件原预算、其余平台/真人及完整目标继续开放。未提交、推送、发布或更新Profile，功能扩展暂缓。
