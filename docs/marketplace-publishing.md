# SoPHP 发布流程

## 首次配置

1. 登录 [Visual Studio Marketplace 发布者后台](https://marketplace.visualstudio.com/manage/publishers/sohophp)，选择 `sohophp` 下的 **Trusted Publishing → Create**。
2. 新增一条用于 SoPHP 的策略。策略名可用 `SoPHP Marketplace`。

   | 字段 | 填写值 |
   | --- | --- |
   | Repository owner | `sohophp` |
   | Repository | `php-companion` |
   | Workflow | `publish.yml` |
   | Environment | `marketplace` |

3. GitHub 仓库继续使用 [`marketplace` 环境](https://github.com/sohophp/php-companion/settings/environments) 的人工审批。Marketplace 的短期凭据由 GitHub Actions 通过 OpenID Connect（OIDC）申请。此工作流无需配置 `VSCE_PAT`。参见 [VS Code Trusted Publishing 文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publish-with-github-actions-and-trusted-publishing)。

## 每次发版

1. 同步更新 Core、Symfony 和 Open Source Pack 的 `package.json` 版本，更新发布说明。合并到 `main`，等待该提交的 CI 通过。
2. 在同一提交上创建并推送带说明的版本标签，例如 `v0.4.14`。**Release** 工作流会运行发布验证，生成三份 VSIX 并上传至 GitHub Release，说明取自标签。
3. 在 [Publish SoPHP to Marketplace](https://github.com/sohophp/php-companion/actions/workflows/publish.yml) 选择 **Run workflow**，分支选 `main`，填写同一版本标签，首次发布时 `package` 选 `all`。
4. 在该运行的 **Review deployments** 中批准 `marketplace`。工作流会核对三份包在 GitHub Release 上的 SHA-256、扩展标识和版本，然后依次发布 Core、Symfony 和 Open Source Pack。
5. 确认三个扩展都显示目标版本。若中途失败，先查看已发布的扩展和失败日志，再依顺序为仍缺失的包分别重跑同一标签，`package` 按需选 `core`、`symfony` 或 `pack`。已公开的标签和 Release 资产应保留，同版本重试继续使用原包。
