# Open Source Pack 原版 PHPUnit 的 C3 组合复核

日期：2026-09-25。独立 VS Code 1.139.0 Linux x64 源码宿主；Core、Symfony、Pack 为本仓库源码，外部成员使用冻结目录。未修改业务项目，未打包 VSIX。

## 同日结果

| 外部 PHPUnit 构建 | 结果 | 日志 |
| --- | --- | --- |
| Marketplace 原版 3.9.40，`dist/extension.js` SHA-256 `e4269794cc1e45b4e2718ec0aa5c474d3390c125199d953b8dac002df444aa1c` | 完整 C3 源码宿主退出码 1；在**已配置** `phpunit.xml` 的测试文件 Rename 后，`TestParser.parseFile()` 异步读取旧路径 `tests/C3ConfiguredTest.php`，未处理 `ENOENT`；严格断言失败 | `/tmp/sophp-c3-pack-original-after-preview-20260925.log` |
| 本地隔离补丁版 3.9.40，同 ID，仅供对照 | 首两次在开头 `addImport` 暂停请求门禁停止，未走到测试文件 Rename；第三次完整 C3 宿主退出码 0，未出现目标 `ENOENT` | `/tmp/sophp-c3-pack-patched-after-preview-20260925.log`、`/tmp/sophp-c3-pack-patched-after-preview-retry-20260925.log`、`/tmp/sophp-c3-pack-patched-pause-diagnostic-20260925.log` |

前两次补丁版失败来自测试等待暂停请求时，清理阶段又以“释放失败”覆盖了原始断言。测试辅助函数现仅在确实观察到暂停后，才断言释放成功；第三次运行通过。前两次没有提供补丁版 C3 文件操作的结果，不能算作补丁行为反例；这项启动时序仍需单独定位。

原版失败再次证明：限定测试目录不能消除测试文件 Rename 的旧路径读取竞态。复核当时的 11 项 Pack manifest 仍引用原版 Marketplace ID，因此该组合的 C3 文件操作门禁**不通过**。复核之后，源码 Pack 已将此成员移出默认清单，改为 10 项；内部补丁未交付到 Marketplace，也未成为默认成员。测试默认通过项目 CLI 运行 PHPUnit/Pest。Core 的独立 C3 宿主已通过最近的预览反馈与文件事件场景；这与原 11 项组合失败是两项不同证据。
