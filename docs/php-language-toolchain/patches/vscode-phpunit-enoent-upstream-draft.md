# 上游修复草稿：Rename 或删除测试文件后忽略过期解析任务

状态：仅供审查，**尚未向上游提交 Issue 或 PR**。2026-09-25 核对：`recca0120/vscode-phpunit` 主分支仍为 `90814392887e157c9fad92139571aa7fb6e01641`、Marketplace 仍为 3.9.40；[补丁](vscode-phpunit-3.9.40-enoent.patch) SHA-256 为 `8f01959504eb0683740b51823d107f72c286dcd374f7a8cc6f2db60fcca81fe5`，对该提交 `git apply --check` 通过。

## 建议 PR 标题

Handle test files removed before queued parsing

## 建议 PR 说明

### Problem

When a test file is renamed or deleted while file watcher work is queued, `TestParser.parseFile()` can attempt to read its old path. `readFile()` then rejects with `ENOENT`. Some collection change handlers do not await that parse, so the rejection can surface as an uncaught extension error. This was reproduced in a configured PHPUnit project with several VS Code extensions active; it is distinct from a missing PHP executable (`spawn ... ENOENT`).

### Change

Treat `ENOENT` from the file read as an empty parse result, since the queued file no longer exists. Keep other read errors visible. Add a regression test for a missing file.

### Verification

- Upstream package build, extension type check, production bundle and the missing-file unit test passed on the pinned source.
- Directly parsing a missing file returns `undefined`; reading a directory still rejects with `EISDIR`.
- A locally patched VSIX passed isolated VS Code 1.139.0 Linux checks for the full SoPHP Open Source Pack profile, PHPUnit and Pest discovery/runs, and test-file rename sequences. These checks do not establish Windows, WSL Remote or long-session behavior.

### Files

`packages/phpunit/src/TestParser/TestParser.ts` and `packages/phpunit/src/TestParser/TestParser.missing-file.test.ts`.

## 提交前仍需检查

上游维护者可决定是否另行调整未等待的 collection handler Promise；本补丁只处理已删除文件的读取竞态，不隐藏权限、目录或其它读取错误。提交时附上[隔离评估](../reports/phpunit-enoent-patch-evaluation-2026-09-25.md)和[安装验收](../reports/phpunit-enoent-installed-vsix-2026-09-25.md)的范围说明，避免把 SoPHP 的组合样本当成上游全平台保证。
