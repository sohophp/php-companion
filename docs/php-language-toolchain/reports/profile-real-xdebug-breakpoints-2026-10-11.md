# 完整扩展组合中的真实Xdebug断点验收

2026-10-11。将既有完整 `debugBreakpoints` 接入原完整12扩展源码Profile的可选真实调试分支，位于原launch/结束入口检查之后。只增加index的import及调用分支；既有真实调试源/编译模块逐字保持，严格测试编译/定向Lint通过，94个资格依赖中93个逐字保持，全部101个编译文件只有index变化。正常产品、八运行时资产和既有1,488项LSP资格保持。

本轮明确启用 `PHP_COMPANION_TEST_PROFILE_REAL_DEBUG=1`，指定与Profile相同的 `SOPHP_DEBUG_PHP` 和已探测空闲的 `SOPHP_DEBUG_PORT`。真实Linux VSCode1.140.0/PHP8.5.9/Xdebug3.5.3/PHP Debug1.40.1，在带空格程序路径第3行命中breakpoint：实际调用栈文件/行正确，scope变量与watch求值均为40；执行next后第4行stop reason为step，watch值为42；continue后实际程序写出42及正确cwd，会话结束。自有断点、tracker/监听、debug session、宿主及所有关联进程清理已核对，程序与结果逐字归档。

原格式化保存/失败恢复、Twig/配置格式化、调试入口和真实PHPUnit及全部组合检查保持。本轮原50/30轮反馈P95为97/113 ms，150 ms门槛通过；原165 ms失败保留，性能根因和修复仍未证明。31,468运行输入/185链接和两仓保持，PHP二进制/Xdebug模块/实际ini也冻结，77文件归档。

新增F12-DEBUG-02，编号162增至163，14家族保持。上述真实调试属于Linux自动编辑器宿主，不替代真人UI、原生Windows、WSL Remote或全部版本/调试功能矩阵；完整F12、原C3/Windows/createFile/性能、长期/真实VSIX及原全部范围继续，未完成大项26，日常Profile未更新。精确DAP结果、源码/编译摘要、运行时和终态见[机器报告](profile-real-xdebug-breakpoints-2026-10-11.json)。
