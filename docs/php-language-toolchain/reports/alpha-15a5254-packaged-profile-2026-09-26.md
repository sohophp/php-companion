# SoPHP 0.4.5 私有 Alpha 候选 15a5254

日期：2026-09-26。候选目录：[`artifacts/php-companion-alpha-0.4.5-15a5254b`](../../../artifacts/php-companion-alpha-0.4.5-15a5254b)。本地冻结分支 `alpha/sophp-0.4.5-15a5254`，提交 `15a5254b74676afe8e3b153f8277928ab2595c05`。候选未发布到 Marketplace，也未安装到当前用户的 WSL 扩展目录。

## 冻结与门禁

共享工作树原有暂存、修改和未跟踪文件保持原样。将 103 个当前改动路径复制到独立工作树，逐文件 SHA-256 比对无差异；其中 101 个文件相对原提交形成实际变更。独立工作树提交后干净，`candidate:alpha` 的源码预检通过。此次仅在冻结点打包 Core、Symfony、Open Source Pack 三份 VSIX。

共享源码的 `pnpm typecheck` 通过。全仓 `pnpm lint` 初次误扫 Composer 在测试夹具生成的 `vendor/` JavaScript；将该生成目录排除后通过。`pnpm test` 的包测试均通过，包括语言服务器 370 通过、1 跳过；根测试初次只有公共 manifest 基线漏记四个已实现且有中英文本地化的预览命令。更新基线后定向 2/2、根测试 68/68 通过。故本轮记录为“包测试通过且根测试在基线修正后通过”，不把初次 `pnpm test` 写成退出码 0。

| VSIX | SHA-256 |
| --- | --- |
| Core `php-companion-0.4.5.vsix` | `9518a76317cc349d2a2d3cd6b42bf7c5a7239fe3a02d0b29fe4597c4339d0ef9` |
| Symfony `php-companion-symfony-0.4.5.vsix` | `9a8482bb69abc2f77324945b647ae67d2315ddb3c67e03606d40859fa6b64781` |
| Open Source Pack `php-companion-open-source-pack-0.4.5.vsix` | `32eb378688090ecfce6b8e889a9a193f1319b9b27714d1dfbc15e50bc3f0fdef` |

`verify:vsix` 与复制到共享仓库后的 `sha256sum -c SHA256SUMS` 均通过。候选清单固定八个外部成员版本；同批 Core、Symfony、Pack 的摘要与完整提交号以 `candidate.json` 为准。

## 隔离组合验证

VS Code 1.139.0 Linux x64 的隔离宿主从三份实际 VSIX 解出的扩展目录加载产品，并使用冻结的八个外部成员。完整 Open Source Pack 组合流程退出码 0，日志 `/tmp/sophp-alpha-15a5254-packaged-profile-20260926.log`。独立 PHP 8.5 与临时 Composer 工具项目中的 PHP CS Fixer、PHPUnit 被用于格式化、测试和编辑器能力链；没有读取业务项目的工具脚本。`alpha:preflight` 对独立 Composer 夹具确认候选摘要、WSL 与 PHP 8.5，`deterministicPassed: true`；机器报告在候选目录 `preflight-independent.json`。

## 尚未通过的 C4 门槛

后续又用本候选的同一批 VSIX 内容和冻结外部成员，完成[PHP 7.2–8.5 九个目标版本的 C1 隔离宿主门禁](f02-alpha-nine-target-host-2026-09-26.md)，九次均退出码 0；六个本机 PHP CLI 的版本探针也通过。该补充测试未重新打包或改变上述三个摘要。

隔离宿主加载 VSIX 内容不等于在真实 Windows 客户端连接的 WSL Remote Profile 中安装和操作。当前用户的 WSL 扩展目录与本候选内容不同；扩展运行位置、竞争 PHP Provider 启用状态、真实项目工具路径、Windows/macOS、其它 PHP 版本和长时间使用仍需单独验收。R4 最终目标保持开放。
