# SoPHP 0.4.7 后续私有 Alpha 候选

日期：2026-09-27。仅在 SoPHP 隔离工作树生成候选；没有修改业务项目、安装到用户 Profile 或公开发布。

## 冻结内容

源码冻结于干净提交 `248ee1f899c2d47cb19326d0f9fffcc9b2a5427d`。运行一次 `pnpm candidate:alpha`，只生成 Core、Symfony、Open Source Pack 三份 VSIX，目录为 `/tmp/sophp-c1-interpolation-20260926/artifacts/php-companion-alpha-0.4.7-248ee1f8`。`pnpm verify:vsix` 和该目录的 `sha256sum -c SHA256SUMS` 均通过。`candidate.json` 固定三份产物与八个外部扩展版本；Pack 的 10 个直接成员未变。

| VSIX | SHA-256 |
| --- | --- |
| `php-companion-0.4.7.vsix` | `6af59e6ae654fe05913f6bee9a50e26edc89a8546fd15f9d44bfb32d44d73e01` |
| `php-companion-symfony-0.4.7.vsix` | `b5ea9c24f1f623f57ee90aaffb32416798edf2e4d19c4216ce8470de44069ec0` |
| `php-companion-open-source-pack-0.4.7.vsix` | `bbe4bffd21361fe1351991b91ebfe630caeef5d91e16268470d3eb7543aed64c` |

这批产物包含前一冻结 `be1c39b2` 之后的 PHPDoc 类型补全、Symfony Controller→Twig 紧邻赋值与未保存编辑反馈、类型生成最终创建结果核对，以及 Symfony Rename 只对受影响文档执行版本校验。源码总门禁在 `93d9d43` 通过；其后改动的 Symfony 单元测试、TypeScript、ESLint、完整 10 项源码 C3 宿主通过。后加的最终 `createFile` Redo 探针仅用于暴露已知失败，不纳入默认通过统计。

## 隔离宿主结果

使用 VS Code 1.139.1 Linux x64、TwigPlus 1.3.8、其余冻结外部扩展，以及独立测试工具中的 PHP 8.5.9、PHP CS Fixer 3.95.27、PHPUnit 11.5.56：

- 打包 Open Source Profile 的 PHP/Symfony/Twig/YAML/XML/格式化/调试配置/CLI 测试组合链退出码 0，日志 `/tmp/sophp-047-248ee1f8-packaged-profile-20260927.log`。
- 打包完整 C3 Profile 首次在 Symfony 服务 Rename 回归之后以 VS Code `Canceled` 退出码 1，日志 `/tmp/sophp-047-248ee1f8-c3-packaged-profile-20260927.log`。增加阶段日志后，同一冻结 VSIX 连续两次完整退出码 0，日志 `/tmp/sophp-047-248ee1f8-c3-cancel-phase-20260927.log`、`/tmp/sophp-047-248ee1f8-c3-cancel-phase-repeat-20260927.log`。阶段日志属于冻结后的测试入口改动，不改变三份 VSIX。它没有找到首次取消的根因。

## 继续工作的边界

最终 `WorkspaceEdit.createFile` 兜底路径在 VS Code 1.139.1 中，一次 Undo 删除文件后 Redo 仍不能恢复；见[独立预期失败探针](c3-type-generation-fallback-redo-2026-09-26.md)。正常与同文件系统备用移动路径有独立通过证据。`Canceled` 的偶发性尚未关闭，因此 C3 不能标成稳定绿灯。此候选还没有真实 WSL Remote、其它平台、规模、缓存恢复或长期会话验收；R4 保持未完成。
