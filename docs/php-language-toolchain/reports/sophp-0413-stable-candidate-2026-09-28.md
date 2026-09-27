# SoPHP 0.4.13：稳定支持范围候选交接

日期：2026-09-28。当前公开版本仍是 0.4.12；0.4.13 是未发布候选，VSIX 对应源码提交 `e197c97abc0864afcc81444af6d7ed6125819352`，草稿 [PR #3](https://github.com/sohophp/php-companion/pull/3)。本候选只交付[第一阶段声明的范围](../stability-first-delivery.md)，不代表 R4 全部完成。

## 已验证的交付物

- `pnpm candidate:alpha` 与 `pnpm verify:vsix` 通过。`artifacts/php-companion-alpha-0.4.13-e197c97a/` 的三份 VSIX 均与 `SHA256SUMS` 相符：Core `fd0e359bef1e40c7d090732df4006092edf78c39e9977b20a1ed0f57d9541d30`，Symfony `4cf390cf0540a2bdf7bb667f7a47ad4bfcda015b6027a742e33559de970548a4`，Pack `8ca9a43fecf936dec422954dbaad074f29ac02250fb7c6ece99cc3c2e6867fd4`。
- 本批源码修复了全局命名空间中与 `<?php` 同行的 `use` 导入补全，并覆盖分组导入及未保存声明的关闭、还原。相关语义、真实 LSP 专项及完整源码测试已通过；跨平台状态以 [PR #3 最新检查](https://github.com/sohophp/php-companion/pull/3/checks)为准。前一候选 `66c255d0` 的完整 10 项 Pack 与 C3 支持路径打包宿主曾通过；其日志 `/tmp/sophp-stable-0413-full-pack-host-20260927.log`、`/tmp/sophp-stable-0413-c3-full-pack-host-20260928.log` **不代表当前 VSIX 已通过相同宿主检查**。
- WSL CLI 已使用 `--force` 安装本候选的三份 VSIX。`/tmp/sophp-0413-e197c97a-wsl-preflight-cli-20260928.json` 中候选文件、扩展版本及安装文件均匹配，未列出竞争通用 PHP Provider；该命令从普通 shell 运行，唯一错误为 `vscode-remote-terminal-required`。当前运行中的编辑器窗口尚未确认重载，**不算真实窗口通过**。

## 同一分支的日常使用

`work/sophp-next` 同时承载开发和随时发生的真实使用反馈，不另建人工测试分支。用户报告可复现的问题后，在此分支修复、验证并记录源码提交；积累一批改动后更新 WSL Profile，而非每次改动都安装或公开发布。真实使用反馈可随时进入，正式稳定版验收记录留到用户方便时进行。

本地分支现已到 `bb5745d037bf38f48603f5b95ade09bc80a99d8e`，比上述已安装候选多两笔括号式 namespace 的类、函数和常量导入补全修复。该源码的 `pnpm typecheck`、`pnpm lint`、`pnpm test` 均通过；语义测试 443 项、语言服务器测试 398 项通过且 1 项跳过。**这两笔修复尚未打包、安装或接受跨平台检查**；本报告开头的 VSIX 摘要仍只对应 `e197c97a`。

## 延后的人工验收

在已安装 0.4.13 的 WSL VS Code 窗口执行 `Developer: Reload Window`。然后从该窗口的**集成终端**、在仓库根目录运行：

```bash
pnpm alpha:preflight -- --candidate artifacts/php-companion-alpha-0.4.13-e197c97a --workspace test/extension/fixture --php /usr/bin/php --expected-php 7.2 --require-wsl --check-editor --extensions-dir /home/jason/.vscode-server/extensions --output /tmp/sophp-0413-e197c97a-wsl-integrated-preflight-20260928.json
```

记录 `gates.deterministicPassed`、WSL 扩展宿主中的 Core/Symfony 激活、唯一通用 PHP Provider，以及项目 PHP、fixer、Xdebug、测试 CLI 的实际路径。再在独立 Composer 项目进行至少两小时连续编辑，记录起止时间和 PHP 补全/参数提示/Hover/Definition/References、未保存修改、确定性 Import、受支持 Rename/Safe Move/类型生成预览与一次 Undo/Redo、Twig/YAML/XML、格式化、调试和 CLI 测试的结果。自动宿主结果不能代替这份记录。

`WorkspaceEdit.createFile` 最终兜底在一次 Undo 后无法可靠 Redo，仍是公开限制；可暂存移动的已支持路径有独立通过证据。没有新的可验证线索时，不重复调查该兜底。

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
