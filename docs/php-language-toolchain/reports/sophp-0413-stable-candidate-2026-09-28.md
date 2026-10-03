# SoPHP 0.4.13：稳定支持范围候选交接

日期：2026-09-28。当前公开版本仍是 0.4.12；最新本地 0.4.13 候选的三份 VSIX 对应源码提交 `91d5a952df5cdf9cc41dfc5f61ab4f08975acb5f`。它只交付[第一阶段声明的范围](../stability-first-delivery.md)，不代表 R4 全部完成。候选尚未推送；此前安装到 WSL 扩展目录的是旧候选 `77761b4c`，并非本节新产物。

## 候选之后的未打包源码

当前 `work/sophp-next` 的 HEAD 为 `32e7e6a`，另有未提交的 Core 源码与测试改动。它们补齐匿名闭包参数、捕获变量后的返回类型及 DNF 类型位置的类名补全。未保存的 PSR-4 类型声明改名后，Hover 与 Definition 撤回旧结果；Composer classmap 声明改名后，成员补全、参数提示、Hover 与 Definition 也从当前缓冲区撤回旧结果。语义、真实 stdio LSP 及隔离 C1 源码宿主包含相应正反例。

这批最新未提交源码的完整质量门禁已通过：`pnpm typecheck`、`pnpm lint`、`pnpm test` 均退出 0；语义包 449 项通过，语言服务器 21 个文件共 400 项通过、1 项跳过，Symfony 包 13 项、根包 69 项也通过。日志依次为 `/tmp/sophp-current-source-typecheck-final-20260928.log`、`/tmp/sophp-current-source-lint-final-20260928.log`、`/tmp/sophp-current-source-test-final-20260928.log`。此前还单独验证了 classmap、原生类型、命名参数和 Attribute 共五条 stdio 用例。现有用例检查即时查询结果，但没有强制锁定最窄的通知与查询交错时序。

同一源码的 C1、C2、C3 隔离 VS Code **源码宿主**均退出 0。C1 由 `pnpm test:extension:c1` 构建并运行，日志 `/tmp/sophp-current-source-c1-host-final-20260928.log`；C2、C3 复用该次构建的产物，分别以 `PHP_COMPANION_TEST_C2_ONLY=1`、`PHP_COMPANION_TEST_C3_ONLY=1` 运行 `node scripts/run-extension-test.mjs ./dist-test/runTest.js`，日志 `/tmp/sophp-current-source-c2-host-final-20260928.log`、`/tmp/sophp-current-source-c3-host-final-20260928.log`。C3 已支持的安全编辑路径含预览、取消、应用及多项一次 Undo/Redo；已知失败的最终 `createFile` 兜底 Redo 探针没有启用。这些源码宿主结果不证明当前 WSL 已安装扩展的行为。

当前 Core、Symfony、Pack 源码加冻结的外部扩展也通过完整 10 项 Open Source Pack **源码宿主**，日志 `/tmp/sophp-current-source-pack-host-final-20260928.log`、退出码 0。它使用独立 PHP 8.5.9 与临时工具项目的 fixer/PHPUnit，测试断言 Pack 清单、所需成员、Provider 排他设置和 C1/C2 组合反馈；没有生成 VSIX，也没有更新用户 WSL 扩展目录。Symfony 源码构建日志为 `/tmp/sophp-current-symfony-source-build-20260928.log`。

这批工作树源码没有对应的新 VSIX、24 包验证、跨平台 CI 或真实 WSL 编辑器验收；下文 `91d5a952` 的打包与宿主证据不能转记给它。按当前开发安排，暂不为日常增量重新打包、安装、提交或推送。

## 最新本地候选 `91d5a952`

- `pnpm candidate:alpha`、`pnpm verify:vsix` 和候选目录内 `sha256sum -c SHA256SUMS` 均通过。目录 `artifacts/php-companion-alpha-0.4.13-91d5a952/` 的 Core、Symfony、Pack 摘要依次为 `ddae33dab89ed83d4c66110949829160737af81dcaa71123dfa43d2d852dc2ea`、`a5d91eb98c0f80fc14ee69f3c3e565ae386830c56a092b20ef01a903abc88043`、`3f994247f1b96820352449f6d0f2ca5926a675fbaec534e68b8029a7cfa748b5`；生成时源码干净且三份版本均为 0.4.13。原始日志 `/tmp/sophp-0413-91d5a95-candidate.log`。
- `pnpm verify:packages` 在隔离消费者中验证 24 个组件包，退出码 0，日志 `/tmp/sophp-0413-91d5a95-verify-packages.log`。此前 `8a80a19` 的完整源码类型检查、Lint 和测试已通过；后续 `2ac18ee` 只修正测试专用 Paste 光标，定向语义测试、相关 ESLint、当前源码 Pack 与 C3 宿主均通过。
- 同一候选三份 VSIX 在 VS Code 1.139.1 的隔离 10 项 Open Source Pack 打包宿主退出码 0，日志 `/tmp/sophp-0413-91d5a95-full-pack-host.log`；C3 已支持路径专项打包宿主退出码 0，日志 `/tmp/sophp-0413-91d5a95-c3-pack-host.log`。两者不包含 `WorkspaceEdit.createFile` 最终兜底 Redo 的成功证明。
- 尚无 `91d5a952` 的跨平台 CI 或真实 WSL 编辑器验收；此候选未安装到用户扩展目录，也未公开发布。

## 旧候选 `77761b4c` 的历史证据

- `pnpm candidate:alpha` 与 `pnpm verify:vsix` 通过。`artifacts/php-companion-alpha-0.4.13-77761b4c/` 的三份 VSIX 均与 `SHA256SUMS` 相符：Core `8e6c790258777c669ff70f92ba34c6ffb2fac9b441d9568b839754ee22853700`，Symfony `6a48028c0fc2c9dff8aa482cdfe518a8a88b52c2941773a187b754f3e36d9776`，Pack `c75f819600849edac5ce8b3579b2139540f9d8dbb43d045787227602e1b28678`。
- 本批包含全局与括号式 namespace 中同一行的类、函数、常量导入补全修复。`pnpm typecheck`、`pnpm lint`、`pnpm test` 均通过：语义测试 443 项、语言服务器测试 398 项通过且 1 项跳过。`pnpm verify:packages` 在隔离消费者中验证 24 个组件包，日志 `/tmp/sophp-0413-77761b4-verify-packages.log`。
- 当前三份 VSIX 的完整 10 项 Pack 打包宿主退出码 0，日志 `/tmp/sophp-0413-77761b4-full-pack-host.log`；C3 已支持路径专项打包宿主退出码 0，日志 `/tmp/sophp-0413-77761b4-c3-pack-host.log`。两者是隔离宿主证据。此源码尚未推送，因此**没有对应提交的跨平台 CI 结果**。
- WSL CLI 已使用 `--force` 安装本候选的三份 VSIX。`/tmp/sophp-0413-77761b4c-wsl-preflight-cli-20260928.json` 中候选文件、扩展版本及安装文件均匹配，未列出竞争通用 PHP Provider；该命令从普通 shell 运行，唯一错误为 `vscode-remote-terminal-required`。当前运行中的编辑器窗口尚未确认重载，**不算真实窗口通过**。

## 同一分支的日常使用

`work/sophp-next` 同时承载开发和随时发生的真实使用反馈，不另建人工测试分支。用户报告可复现的问题后，在此分支修复、验证并记录源码提交。日常开发运行源码检查；候选冻结时才集中打包三份 VSIX，并在临时隔离宿主验证。只有用户要试用或进入正式验收时才更新其 WSL 扩展目录，不为每个开发增量安装、推送或公开发布。真实使用反馈可随时进入，正式稳定版验收记录留到用户方便时进行。

上节旧候选的 VSIX 摘要只对应 `77761b4c`；后续本地源码提交不能自动算进已安装候选。

旧候选之后的本地源码提交 `6906457`、`d3d84a2` 修复了括号式全局 namespace 的 Import 插入位置，以及重复同名括号 namespace 中类、函数、常量补全误用前一个代码块导入的问题。语义包 392 项测试、受影响文件 ESLint、语义包构建与语言服务器类型检查均通过；独立真实 LSP 的按需补全请求确认类 Import 编辑落在第二个代码块。这两项修复已进入本报告开头的 `91d5a952` VSIX，尚未进入用户已安装的旧候选。

随后补充独立 Composer `onDemand` 源码回归：新建但尚未落盘的 PHP 类经 `didOpen` 后可供另一文件的补全、签名、Hover 和 Definition 使用；未保存地改动、恢复参数类型时，使用方的参数类型诊断跟随变化；`didClose` 后旧诊断和 Definition 撤销。这是定向真实 LSP 自动化证据，不等同 WSL 编辑器人工验收。

以上增量汇总到本地提交 `8a80a19` 后，集中源码门禁 `pnpm typecheck`、`pnpm lint`、`pnpm test` 均以退出码 0 结束。完整语义包 447 项通过，语言服务器 399 项通过、1 项跳过；`pnpm test` 原始日志为 `/tmp/sophp-head-8a80a19-test.log`。此门禁只证明该提交的源码测试，没有为 `8a80a19` 重打 VSIX、运行完整 Pack 打包宿主或取得跨平台 CI，也没有更新 WSL 扩展目录。

同一 `8a80a19` 产品源码在 VS Code 1.139.1 的隔离 10 项 Open Source Pack **源码宿主**通过，日志 `/tmp/sophp-head-8a80a19-pack-source-host.log`、退出码 0。C3 专项首次在测试专用 Paste 命令失败：命令把插入点固定到 `<?php` 之前的文件开头，而新的作用域检查会拒绝在 PHP 代码外插入 Import。提交 `2ac18ee` 将该测试命令改为接收代码中的真实光标，并固定文件开头拒绝导入的语义断言；同一 C3 专项随后退出码 0，日志 `/tmp/sophp-head-c3-position-recheck.log`。随后 `91d5a952` 候选补齐打包宿主证据；跨平台 CI 和用户 WSL 编辑器验收仍未完成。`WorkspaceEdit.createFile` 最终兜底 Redo 仍未通过。

## 延后的人工验收

用户准备验收时，先确定验收 `91d5a952` 已打包候选，还是届时更新的源码。若验收前者，再按该候选目录的 `README.zh-CN.md` 安装三份 VSIX，并在 WSL VS Code 窗口执行 `Developer: Reload Window`；若验收后者，须先另行冻结、打包与验证同源候选，不能沿用以下目录和命令。验收 `91d5a952` 时，从该窗口的**集成终端**、在仓库根目录运行：

```bash
pnpm alpha:preflight -- --candidate artifacts/php-companion-alpha-0.4.13-91d5a952 --workspace test/extension/fixture --php /usr/bin/php --expected-php 7.2 --require-wsl --check-editor --extensions-dir /home/jason/.vscode-server/extensions --output /tmp/sophp-0413-91d5a952-wsl-integrated-preflight.json
```

记录 `gates.deterministicPassed`、WSL 扩展宿主中的 Core/Symfony 激活、唯一通用 PHP Provider，以及项目 PHP、fixer、Xdebug、测试 CLI 的实际路径。再在独立 Composer 项目进行至少两小时连续编辑，记录起止时间和 PHP 补全/参数提示/Hover/Definition/References、未保存修改、确定性 Import、受支持 Rename/Safe Move/类型生成预览与一次 Undo/Redo、Twig/YAML/XML、格式化、调试和 CLI 测试的结果。自动宿主结果不能代替这份记录。

2026-09-28 后续源码增量：本地 `file` 工作区已取消 `WorkspaceEdit.createFile` 最终兜底。三次暂存移动都失败时，命令现在报告失败且不创建目标文件；此前成功路径的一次 Undo/Redo 仍通过定向源码宿主。VS Code 的 `createFile` Redo 本身没有修复，其它文件系统的创建与真实 WSL Remote 仍需独立验收。详情见[收口记录](c3-createfile-redo-resolution-2026-09-28.md)。本段增量没有重新打包或安装，不属于上文 0.4.13 候选产物。

## 安装与回退

候选目录的 `README.zh-CN.md` 给出三份 VSIX 和八个外部成员的安装命令。安装后重载窗口并用上述预检确认，不能只看 CLI 已安装列表。

若候选出现阻断回归，从[公开 0.4.12 Release](https://github.com/sohophp/php-companion/releases/tag/v0.4.12)下载 Core、Symfony、Pack 与 `SHA256SUMS`，校验后依次覆盖安装三份 VSIX：

```bash
mkdir -p /tmp/sophp-rollback-0.4.12
gh release download v0.4.12 -R sohophp/php-companion -D /tmp/sophp-rollback-0.4.12
cd /tmp/sophp-rollback-0.4.12
sha256sum -c SHA256SUMS
code --install-extension php-companion-0.4.12.vsix --force
code --install-extension php-companion-symfony-0.4.12.vsix --force
code --install-extension php-companion-open-source-pack-0.4.12.vsix --force
```

重新执行 `Developer: Reload Window`，核对三份扩展均为 0.4.12。八个外部成员版本在本次候选中未变。上述回退包已实际下载，公开 `SHA256SUMS` 对三份 VSIX 均通过；**未执行回退安装**，以免改变当前 0.4.13 候选环境。

人工验收未完成前，PR 保持草稿，不创建发布标签或宣称稳定版已发布。
