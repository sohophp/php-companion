# C1 10,130 文件 Composer 项目的 VS Code 宿主验证

日期：2026-09-24。基于锁定 30 个包、含 1,029 个 PHP 文件的[独立 Composer fixture](c1-real-composer-vendor-2026-09-24.md)，测试运行器只在临时副本的 `src/Noise/` 生成 9,100 个无关 PHP 文件。写入 Consumer 后总计 10,130 个 PHP 文件；随后可见建议用例还在该临时项目中逐个写入六个 PHP 文件。业务项目与原始 fixture 均未修改。

复现入口：`PHP_COMPANION_TEST_C1_UI=1 PHP_COMPANION_TEST_C1_REAL_VENDOR=1 PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE=9100 pnpm test:extension:c1`。该命令构建源码并启动隔离 VS Code 1.139.0 Core 宿主，不打包 VSIX。首次运行复用了本轮已编译产物，通过相同环境变量直接调用 `node scripts/run-extension-test.mjs ./dist-test/runTest.js`；第二次使用上述完整入口。

| 宿主运行 | 首次 Implementation 命令 | 未保存切回后的 Implementation 命令 | 六个真实 vendor 建议可见时间，毫秒 | 中位数 | 最大值 |
| --- | ---: | ---: | --- | ---: | ---: |
| 已编译产物 | 2,485 ms | 800 ms | 210、212、216、222、219、223 | 218 ms | 223 ms |
| 完整构建入口 | 2,496 ms | 800 ms | 210、208、207、218、247、229 | 214 ms | 247 ms |

两轮均通过 Completion、Hover、Signature Help、Definition、Implementation、References 编辑链，以及未保存地切换到 Monolog Logger 再恢复的检查。首次 Implementation 找到 vendor Guzzle Response；12 次热态 Implementation 的中位数均为 4 ms，两轮最大值分别为 8、10 ms。每轮六种真实 vendor 类型的首个可见列表均包含目标方法、不含指定的无关方法，缓冲区保持未保存；宿主退出码均为 0，VS Code 内建 PHP 基础建议为关闭状态。

首次 Implementation 是从编辑器命令提交到测试取得正确结果的单次等待，包含宿主调度与可能的重试；可见建议时间来自 Workbench DOM 观察器。两轮各六个顺序样本不能估计长期 P95，也不证明物理键盘到屏幕像素、数小时会话、WSL Remote、Windows/macOS 或完整 Open Source Pack 组合。冷 Implementation 约 2.5 秒仍是后续体验优化对象。

## 后续：去掉已打开文件事件引起的重复扫描

测试模式分段计时确认，约 2.5 秒的首次 Implementation 是一次编辑器命令和一次 LSP 请求；服务器内部先扫描约 1.3–1.4 秒，随后因项目版本变化重扫约 0.8–1.0 秒。变化来自 VS Code 在 Consumer 已打开后补发该文件的监视事件。该事件原先使候选扫描失效；增量处理本身已有逻辑优先使用打开的缓冲区内容。

现在监视事件对已打开的 PHP 文件继续执行增量处理，但不再使整个候选扫描失效。独立的真实 stdio 用例验证磁盘内容变动后打开缓冲区仍为准确信息，且不发生这次多余失效；关闭文件、其它 PHP 文件和 Composer 元数据的处理继续按原规则。另将候选扫描的进度提示创建改为异步：客户端故意延迟确认进度时，定向 stdio 用例验证 Implementation 先返回准确结果，确认后仍发送进度开始及结束消息。这项进度调整消除了潜在的客户端确认等待；本机 10k 宿主的主要收益来自去掉重复扫描。

| 隔离宿主 | 首次 Implementation 命令 | 候选扫描次数 | 六个真实 vendor 建议 |
| --- | ---: | ---: | --- |
| 修复前两轮 | 2,485、2,496 ms | 后续诊断确认同类请求扫描两次 | 6/6 正确 |
| 修复后两轮 | 1,357、1,398 ms | 每轮一次 | 6/6 正确 |

修复后两轮都通过完整编辑链、未保存类型往返和快速输入的 10 轮可见建议检查；宿主退出码均为 0。语言服务器全套回归通过 18 个测试文件、316 项通过、1 项原有跳过。一次中间诊断构建的快速输入用例曾未在 10 秒内显示最终建议，后续两轮完整检查通过；这仍需更长会话继续观察。以上时间均为本机小样本，不是冷查询 P95，也不关闭 C1 跨平台与真实使用门槛。

清理临时细分计时后的最终源码另以同一 10k 项目运行不含 Workbench 建议观察的隔离宿主：首次 Implementation 命令 1,500 ms，服务器处理 1,490 ms，候选扫描 1,488 ms，项目版本重扫次数 0，六项编辑查询和未保存类型往返通过，退出码 0。
