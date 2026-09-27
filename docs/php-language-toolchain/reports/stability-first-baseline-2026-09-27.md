# 稳定版优先：首轮源码与打包宿主基线

日期：2026-09-27。源码基点 `c38fbc0f11b3`，分支 `work/sophp-next`。公开版本仍为 0.4.12；此基点比已发布主线多三项分组导入增量，以下 VSIX 仅为本地未发布构建。没有修改业务项目或当前 WSL 用户的扩展安装。

## 已通过

- `pnpm check` 退出码 0：类型检查、Lint、源码测试、三份 VSIX 构建及内容校验通过。Semantic 442/442；Language Server 398 通过、1 跳过。
- `pnpm test:extension:open-source-profile` 退出码 0：VS Code 1.139.1 Linux x64 隔离宿主加载本地打包的 Core、Symfony VSIX，执行打包测试。此命令未设置 `PHP_COMPANION_TEST_EXTENSIONS_DIR`，因此这次是 Core/Symfony 的隔离打包宿主门禁，不是 10 项外部扩展的完整 Profile 门禁。
- `git diff --check` 通过。测试日志分别为 `/tmp/sophp-stable-baseline-20260927.log` 和 `/tmp/sophp-stable-packaged-profile-20260927.log`。

本地构建摘要：

```text
dd383a82d9dbdfd7aa9fdecced7c9e074c7cf980c71e61e3512fe131e2785f1e  php-companion-0.4.12.vsix
434e407d966fb49d044199e4b72feca9836591e7cf1ba61227e7446f1203ccad  php-companion-symfony-0.4.12.vsix
4b7ff62cb7041fb901617a943c4b30c44e84aff93b9d7cf2ede49aa08fd0d96c  php-companion-open-source-pack-0.4.12.vsix
```

## 尚未通过的交付门槛

当前 WSL 用户扩展列表中的 Core、Symfony、Pack 均为 0.4.10；隔离宿主没有覆盖这些安装。真实 WSL Remote 的新进程运行位置、唯一 PHP Provider、项目工具路径、人工连续编辑及完整 10 项组合仍需独立验收。以上自动化结果不能称为已验收稳定版。

`WorkspaceEdit.createFile` 最终兜底的 Redo 缺口仍开放。已验证的暂存移动路径与该兜底路径分开记录；没有新证据时不再重复同类探针。下一批先使用[稳定版执行计划](../stability-first-delivery.md)冻结支持范围，再集中准备实际安装候选。
