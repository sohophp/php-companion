# C1 键入到可见补全列表的首批基线

日期：2026-09-24。此前隔离 Extension Host 只测量 `vscode.executeCompletionItemProvider` 命令及语言服务器 handler，无法证明建议列表实际出现的时间。F04-HOST-06 在专项运行时给 VS Code 1.139.0 开启仅监听本机的 Chromium 调试端口，连接 Workbench 页面。每次显示一个新的独立 Composer PHP 文件，把光标放在 `$value->` 后，通过 VS Code `type` 命令输入 `r`。页面中的 `MutationObserver` 从命令提交前开始计时，直到 `.suggest-widget.visible` 有可见行；用行文本核对该文件专属的 `renderVisibleN` 方法。下一个样本开始前确认上次弹窗已不再可见，并确认输入实际进入未保存缓冲区。

两次隔离 Core 宿主运行各采 6 个不同类名和方法名：

| 运行 | 原始可见时间，毫秒 | 中位数 | 最大值 | 结果 |
| --- | --- | ---: | ---: | --- |
| 固定调试端口试运行 | 306、256、211、238、218、216 | 228 | 306 | 6/6 候选正确，退出码 0 |
| 自动分配端口复测 | 293、236、240、235、217、224 | 236 | 293 | 6/6 候选正确，退出码 0 |

复现入口：`PHP_COMPANION_TEST_C1_UI=1 pnpm test:extension:c1`。该入口构建源码并运行隔离宿主，不打包 VSIX；调试端口由测试运行器自动选择，普通 C1 测试不启用。测试直接测 Workbench DOM 中的列表可见状态，包含 VS Code 调度、自动补全延迟、语言客户端、服务端、候选汇总和 DOM 更新，但不等同于物理键盘输入到屏幕实际像素呈现。

目前只有小型 fixture 的 12 个顺序样本，不能估计长期 P95；大型 vendor、连续未完成输入、缓存冷热切换、WSL Remote、Windows/macOS 和完整 Open Source Pack 组合仍需验证。此报告不声称 C1 已关闭。

2026-09-26 补充：[零建议延迟和 Workbench 直接输入对照](c1-visible-suggestion-delay-attribution-2026-09-26.md)各通过六个独立 PHP 类的可见候选检查；两种变化均未明显降低约 200 ms 级等待，因此目前不调整 Pack 默认值，也不据此声称已定位所有等待阶段。

同日把 C1 可见建议门禁接入当前 10 项 Open Source Pack 的隔离源码 Profile；宿主另外检查 Core、Symfony、Pack 和八个直接外部成员均可被 VS Code 发现。VS Code 1.139.0 Linux x64 下，普通 PHP 方法六次可见等待为 297、227、240、226、240、250 ms，中位 240 ms；真实 Composer vendor 方法六次为 249、262、233、261、251、243 ms，中位 250 ms。两组候选均 6/6 正确。未保存接收者类型 A→B→A 的三次可见候选正确，另外 10 轮快速切换未出现旧类型候选。完整 C1 多根与六查询宿主也通过，退出码 0；日志 `/tmp/sophp-pack10-c1-visible-source-host-20260926.log`。这证明源码 Pack Profile 中的候选可见且本样本无类型串扰，不代表已安装 VSIX、WSL Remote、人工键盘体验或长期 P95。可复现入口是 `PHP_COMPANION_TEST_C1_ONLY=1 PHP_COMPANION_TEST_C1_OPEN_SOURCE_PROFILE=1 PHP_COMPANION_TEST_C1_UI=1` 配合隔离扩展目录和源码宿主运行器；不重复打包 VSIX。
