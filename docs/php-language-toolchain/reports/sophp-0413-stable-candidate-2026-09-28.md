# SoPHP 0.4.13：稳定支持范围候选交接

日期：2026-09-28。当前公开版本仍是 0.4.12；0.4.13 是未发布候选，VSIX 对应源码提交 `77761b4ca394c3681191c12df3c6f38d3e494f52`。远端[草稿 PR #3](https://github.com/sohophp/php-companion/pull/3)仍停在旧提交，本候选没有推送。本候选只交付[第一阶段声明的范围](../stability-first-delivery.md)，不代表 R4 全部完成。

## 已验证的交付物

- `pnpm candidate:alpha` 与 `pnpm verify:vsix` 通过。`artifacts/php-companion-alpha-0.4.13-77761b4c/` 的三份 VSIX 均与 `SHA256SUMS` 相符：Core `8e6c790258777c669ff70f92ba34c6ffb2fac9b441d9568b839754ee22853700`，Symfony `6a48028c0fc2c9dff8aa482cdfe518a8a88b52c2941773a187b754f3e36d9776`，Pack `c75f819600849edac5ce8b3579b2139540f9d8dbb43d045787227602e1b28678`。
- 本批包含全局与括号式 namespace 中同一行的类、函数、常量导入补全修复。`pnpm typecheck`、`pnpm lint`、`pnpm test` 均通过：语义测试 443 项、语言服务器测试 398 项通过且 1 项跳过。`pnpm verify:packages` 在隔离消费者中验证 24 个组件包，日志 `/tmp/sophp-0413-77761b4-verify-packages.log`。
- 当前三份 VSIX 的完整 10 项 Pack 打包宿主退出码 0，日志 `/tmp/sophp-0413-77761b4-full-pack-host.log`；C3 已支持路径专项打包宿主退出码 0，日志 `/tmp/sophp-0413-77761b4-c3-pack-host.log`。两者是隔离宿主证据。此源码尚未推送，因此**没有对应提交的跨平台 CI 结果**。
- WSL CLI 已使用 `--force` 安装本候选的三份 VSIX。`/tmp/sophp-0413-77761b4c-wsl-preflight-cli-20260928.json` 中候选文件、扩展版本及安装文件均匹配，未列出竞争通用 PHP Provider；该命令从普通 shell 运行，唯一错误为 `vscode-remote-terminal-required`。当前运行中的编辑器窗口尚未确认重载，**不算真实窗口通过**。

## 同一分支的日常使用

`work/sophp-next` 同时承载开发和随时发生的真实使用反馈，不另建人工测试分支。用户报告可复现的问题后，在此分支修复、验证并记录源码提交。日常开发只在本地构建和隔离环境验证；以后只有用户要试用或进入正式验收时才更新其 WSL 扩展目录，不为每个开发增量安装、推送或公开发布。真实使用反馈可随时进入，正式稳定版验收记录留到用户方便时进行。

本报告开头的 VSIX 摘要只对应 `77761b4c`，后续本地源码提交不能自动算进已安装候选。

候选之后的本地源码提交 `6906457`、`d3d84a2` 修复了括号式全局 namespace 的 Import 插入位置，以及重复同名括号 namespace 中类、函数、常量补全误用前一个代码块导入的问题。语义包 392 项测试、受影响文件 ESLint、语义包构建与语言服务器类型检查均通过；独立真实 LSP 的按需补全请求确认类 Import 编辑落在第二个代码块。两项提交尚未打入 VSIX，也没有推送；下次候选冻结时再合并验证。

## 延后的人工验收

在已安装 0.4.13 的 WSL VS Code 窗口执行 `Developer: Reload Window`。然后从该窗口的**集成终端**、在仓库根目录运行：

```bash
pnpm alpha:preflight -- --candidate artifacts/php-companion-alpha-0.4.13-77761b4c --workspace test/extension/fixture --php /usr/bin/php --expected-php 7.2 --require-wsl --check-editor --extensions-dir /home/jason/.vscode-server/extensions --output /tmp/sophp-0413-77761b4c-wsl-integrated-preflight-20260928.json
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
