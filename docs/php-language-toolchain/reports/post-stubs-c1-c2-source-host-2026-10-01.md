# phpstorm-stubs 接入后的 C1–C3 源码宿主复核（2026-10-01）

在当前未提交源码上分别运行 `pnpm test:extension:c1`、`pnpm test:extension:c2` 与 `pnpm test:extension:c3`，三条命令均重新构建源码并启动隔离 VS Code Extension Host，退出码均为 0。没有打包 VSIX 或更新用户 Profile；这不代表真实 WSL 窗口验收。

C1 宿主覆盖自动 PHP 版本选择、普通与 Composer vendor 候选、多根目录、未保存接收者编辑，以及补全、Hover、Signature Help、Definition、Implementation 和 References 的连续查询。日志报告 VS Code 内建 PHP 建议关闭；12 次温态命令样本中，补全中位 6 ms、最大 11 ms，引用中位 83 ms、最大 97 ms。单次激活后的首次补全报告 115 ms。这些是隔离宿主样本，数量不足以重新声明项目规模 P95。

C2 宿主覆盖未完成语法后的诊断与 Undo、`never` 返回、同文件和跨文件实参类型、未保存修改及关闭恢复、Composer classmap、`array_filter` 回调模式和键类型的补全与 Undo/Redo。日志中快速诊断最终可见约 146 ms，跨文件诊断撤回／恢复约 105／104 ms；各用例通过。上述数字为宿主日志中的单次或少量样本，不替代长期会话及真实 UI 测量。

C3 宿主覆盖 Import、Rename、Safe Move、Extract、参数重构和 PHP 类型生成；日志确认预览、取消／应用、冲突拒绝及一次 Undo/Redo 的已支持路径，完整进程退出码 0。这说明本轮解析器和内置声明改动没有在该源码宿主链中引入可见回归，不扩张 C3 的声明支持范围。

原始日志：`/tmp/sophp-c1-host-after-stubs-20261001.log`、`/tmp/sophp-c2-host-after-stubs-20261001.log` 与 `/tmp/sophp-c3-host-after-stubs-20261001.log`。三者均是源码宿主结果；Pack 组合、跨平台、安装候选和真实 WSL 使用继续按各自门槛验收。
