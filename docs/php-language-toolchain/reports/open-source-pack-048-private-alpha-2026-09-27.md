# SoPHP 0.4.8 私有 Alpha 候选

日期：2026-09-27。仅在 SoPHP 隔离工作树生成候选；没有修改业务项目、安装到用户 Profile 或公开发布。

源码冻结于干净提交 `cbd82a7276adef929a6187f065422b93331c4220`，候选目录为 `/tmp/sophp-c1-interpolation-20260926/artifacts/php-companion-alpha-0.4.8-cbd82a72`。一次 `pnpm candidate:alpha` 只生成 Core、Symfony、Open Source Pack 三份 VSIX；`pnpm verify:vsix` 和 `sha256sum -c SHA256SUMS` 均通过。`candidate.json` 固定三份产物与八项外部扩展版本，Pack 仍有 10 个直接成员。

| VSIX | SHA-256 |
| --- | --- |
| `php-companion-0.4.8.vsix` | `0c03c1e2b3f04c1324fbabcb900032bd5ac9b56e9ee6ee5201c988b8ff389d7b` |
| `php-companion-symfony-0.4.8.vsix` | `c17fa6d0a0e9030d466c69886abc339fe8ccca054b262cb797d437c8ca1d3686` |
| `php-companion-open-source-pack-0.4.8.vsix` | `be253522e9246a6da6c10f8ee1da48a6539e95c5f4cc142895cb197e274f365a` |

## 自动化证据

- 冻结前完整 `pnpm test` 退出码 0：语义 428/428，Language Server 391 通过、1 跳过，Symfony 10/10，根项目 69/69；其它组件测试亦无失败。`pnpm lint`、`pnpm typecheck` 退出码 0。日志：`/tmp/sophp-pre048-full-test-20260927.log`、`/tmp/sophp-pre048-lint.log`、`/tmp/sophp-pre048-typecheck.log`。
- VS Code 1.139.1 Linux x64 的隔离打包 Open Source Profile 退出码 0，覆盖 PHP、Symfony、Twig、YAML/XML、格式化、调试配置与项目 CLI 测试入口。使用独立 PHP 8.5.9、PHP CS Fixer 3.95.27 和 PHPUnit 11.5.56；日志 `/tmp/sophp-048-packaged-profile-20260927.log`。
- 同一候选的完整打包 C3 Profile 退出码 0，包括新目录类型生成的最近现有父目录暂存移动与一次 Undo/Redo，以及其它安全编辑链；日志 `/tmp/sophp-048-c3-packaged-profile-20260927.log`。

## 未通过与待验收

最终 `WorkspaceEdit.createFile` 兜底路径在 VS Code 1.139.1 中仍有一次 Undo 后 Redo 不恢复文件的已知缺口；暂存移动成功的路径已有通过证据。旧候选的完整 C3 宿主曾偶发 VS Code `Canceled`，本次一次通过尚不能证明波动根因已消失。真实 VS Code WSL Remote Profile、Windows/macOS、全部 PHP 版本、规模与长会话仍需分别验收；R4 尚未完成。
