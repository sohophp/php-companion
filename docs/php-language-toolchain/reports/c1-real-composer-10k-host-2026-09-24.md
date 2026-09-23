# C1 10,130 文件 Composer 项目的 VS Code 宿主验证

日期：2026-09-24。基于锁定 30 个包、含 1,029 个 PHP 文件的[独立 Composer fixture](c1-real-composer-vendor-2026-09-24.md)，测试运行器只在临时副本的 `src/Noise/` 生成 9,100 个无关 PHP 文件。写入 Consumer 后总计 10,130 个 PHP 文件；随后可见建议用例还在该临时项目中逐个写入六个 PHP 文件。业务项目与原始 fixture 均未修改。

复现入口：`PHP_COMPANION_TEST_C1_UI=1 PHP_COMPANION_TEST_C1_REAL_VENDOR=1 PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE=9100 pnpm test:extension:c1`。该命令构建源码并启动隔离 VS Code 1.139.0 Core 宿主，不打包 VSIX。首次运行复用了本轮已编译产物，通过相同环境变量直接调用 `node scripts/run-extension-test.mjs ./dist-test/runTest.js`；第二次使用上述完整入口。

| 宿主运行 | 首次 Implementation 命令 | 未保存切回后的 Implementation 命令 | 六个真实 vendor 建议可见时间，毫秒 | 中位数 | 最大值 |
| --- | ---: | ---: | --- | ---: | ---: |
| 已编译产物 | 2,485 ms | 800 ms | 210、212、216、222、219、223 | 218 ms | 223 ms |
| 完整构建入口 | 2,496 ms | 800 ms | 210、208、207、218、247、229 | 214 ms | 247 ms |

两轮均通过 Completion、Hover、Signature Help、Definition、Implementation、References 编辑链，以及未保存地切换到 Monolog Logger 再恢复的检查。首次 Implementation 找到 vendor Guzzle Response；12 次热态 Implementation 的中位数均为 4 ms，两轮最大值分别为 8、10 ms。每轮六种真实 vendor 类型的首个可见列表均包含目标方法、不含指定的无关方法，缓冲区保持未保存；宿主退出码均为 0，VS Code 内建 PHP 基础建议为关闭状态。

首次 Implementation 是从编辑器命令提交到测试取得正确结果的单次等待，包含宿主调度与可能的重试；可见建议时间来自 Workbench DOM 观察器。两轮各六个顺序样本不能估计长期 P95，也不证明物理键盘到屏幕像素、数小时会话、WSL Remote、Windows/macOS 或完整 Open Source Pack 组合。冷 Implementation 约 2.5 秒仍是后续体验优化对象。
