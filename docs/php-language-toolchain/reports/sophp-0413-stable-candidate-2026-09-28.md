# SoPHP 0.4.13：稳定支持范围候选交接

日期：2026-09-28。当前公开版本仍是 0.4.12；0.4.13 是未发布候选，源码提交 `66c255d0c9af67984435fc3059942a4c7e350dfb`，草稿 [PR #3](https://github.com/sohophp/php-companion/pull/3)。本候选只交付[第一阶段声明的范围](../stability-first-delivery.md)，不代表 R4 全部完成。

## 已验证的交付物

- `pnpm candidate:alpha` 与 `pnpm verify:vsix` 通过。`artifacts/php-companion-alpha-0.4.13-66c255d0/` 的三份 VSIX 均与 `SHA256SUMS` 相符：Core `9c70220131be24bfb0bf25bf6fae02ecec5fd6a36f8c4841428d4db2f4836dd2`，Symfony `0865f7c301f57def75ddeb7379cabe172275391bb2e56c4d8e4eaee1293e99a1`，Pack `b002bab7c6df8ca714bcac989debe90e154fa4e5c833eaeae9a5b2f34319a130`。
- 完整 10 项 Pack 的 0.4.13 打包宿主退出码 0，日志 `/tmp/sophp-stable-0413-full-pack-host-20260927.log`。C3 支持路径的打包专项退出码 0，日志 `/tmp/sophp-stable-0413-c3-full-pack-host-20260928.log`。这是隔离宿主证据。
- [0.4.13 PR 跨平台 CI](https://github.com/sohophp/php-companion/actions/runs/36331468043) 18/18 作业通过，覆盖 Windows、Linux、macOS 质量与扩展宿主、完整 Profile，以及 PHP 7.2–8.5 集成矩阵。
- WSL CLI 已成功安装三份 0.4.13 VSIX。`/tmp/sophp-0413-wsl-preflight-cli-20260927.json` 中候选文件、扩展版本及安装文件均匹配，未列出竞争通用 PHP Provider；该命令从普通 shell 运行，唯一错误为 `vscode-remote-terminal-required`，因此**不算真实窗口通过**。

## 下次人工验收

在已安装 0.4.13 的 WSL VS Code 窗口执行 `Developer: Reload Window`。然后从该窗口的**集成终端**、在仓库根目录运行：

```bash
pnpm alpha:preflight -- --candidate artifacts/php-companion-alpha-0.4.13-66c255d0 --workspace test/extension/fixture --php /usr/bin/php --expected-php 7.2 --require-wsl --check-editor --extensions-dir /home/jason/.vscode-server/extensions --output /tmp/sophp-0413-wsl-integrated-preflight-20260928.json
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
