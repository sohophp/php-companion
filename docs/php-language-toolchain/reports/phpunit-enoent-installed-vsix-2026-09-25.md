# PHPUnit 旧路径修复的隔离 VSIX 验收

日期：2026-09-25。只构建了一个第三方测试扩展 VSIX，未打包 SoPHP 的四个扩展，也未修改用户当前安装或业务项目。此文件仅用于隔离 Profile 验收，**不可当作上游已发布的 3.9.40 或公开候选传播**：包内仍使用上游 `recca0120.vscode-phpunit` ID 和版本，字节与 Marketplace 原版不同。

| 来源/产物 | 固定值 |
| --- | --- |
| 上游源码 | `recca0120/vscode-phpunit` 提交 `90814392887e157c9fad92139571aa7fb6e01641`，版本 3.9.40 |
| [最小补丁](../patches/vscode-phpunit-3.9.40-enoent.patch) SHA-256 | `8f01959504eb0683740b51823d107f72c286dcd374f7a8cc6f2db60fcca81fe5` |
| 本地候选 | `artifacts/phpunit-enoent-eval-20260925/vscode-phpunit-3.9.40-sophp-enoent.vsix` |
| VSIX SHA-256 | `90cbe1019142a0730ca11da43ecc119e4b6028366233b4a76d7e997e418bf870` |
| 扩展入口 `dist/extension.js` SHA-256 | `5aef9848114ad20acf616e024871e31406481ddc15adfc20571bbb37738a7148`；隔离安装后与构建目录一致 |

构建依次运行上游 `@vscode-phpunit/phpunit` 库构建、扩展类型检查及生产 bundle，再用 `vsce package --no-dependencies` 创建单个 VSIX。补丁单测此前 1/1 通过，且不会吞掉 `EISDIR` 等其它读取错误。VS Code 1.139.0 Linux x64 CLI 把 VSIX 装入 `/tmp/sophp-phpunit-isolated-repro/extensions-patched-vsix`；`--list-extensions --show-versions` 确认 3.9.40，安装入口字节哈希匹配。

同一已安装 VSIX 与 SoPHP Core、Symfony、Pack 源码以及其它外部成员运行两道门禁：

1. 完整 11 项 C3 序列，含测试文件创建/删除、配置测试文件及类 Rename、Undo/Redo：退出码 0，未记录旧路径 ENOENT；日志 `/tmp/sophp-c3-pack-patched-vsix-20260925.log`。
2. Open Source Profile 源码宿主：使用独立夹具、PHP 8.5.9、PHPUnit 11.5.56 和 PHP CS Fixer 3.95.27，覆盖外部测试扩展的测试发现、运行单文件/套件、重命名后的再运行，以及格式化和 PHP Debug：退出码 0；日志 `/tmp/sophp-open-source-patched-vsix-profile-20260925.log`。
3. Pest 4.7.8 独立 Composer 项目：PHP 8.5 CLI 单测 1/1 通过；已安装的同一补丁 VSIX 在 VS Code 1.139.0 源码 Pack 宿主中自动选择 Pest，执行当前文件、全部测试，以及测试文件 Rename 后的套件，退出码 0；日志 `/tmp/sophp-pest-patched-vsix-20260925.log`。对照直接运行 `vendor/bin/phpunit` 返回退出码 255 并要求改用 Pest，因此执行标记能区分两个入口。可复现输入及宿主入口见 `test/extension/pest-profile-fixture/`、`test/extension/runPestProfile.ts` 与 `test/extension/suite/pestProfile.ts`。

这证明本地补丁能被打包、安装并通过上述 Linux 隔离门禁，包括 PHPUnit 与 Pest 的基本运行；尚未证明 Windows/WSL Remote、长会话、Pest 调试及真实日常操作。当前 Pack manifest 仍指向 Marketplace 原版，故默认组合风险未解除。若要公开交付，应先取得上游修复，或以明确新 ID、来源归属和维护责任发布经完整验收的分支；不能把这个同 ID 本地 VSIX 直接称为上游版本。
