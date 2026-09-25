# Open Source Pack 交付链核对

日期：2026-09-25。范围是本仓库的构建、CI 产物、发布流程和检查表；未打包 VSIX、发布 Marketplace 或修改业务项目。

## 发现与修正

- `package:all` 构建 Core、SoPHP Symfony、Open Source Pack 三份 VSIX，`verify:vsix` 也核对这三份；不构建旧 Recommended Pack。
- CI 与 Release 原先只上传 Core 和 Pack。Pack manifest 直接包含 `sohophp.php-companion-symfony`，因此交付清单缺少必需依赖。现已把 Symfony VSIX 加入两处 artifact。
- 手动 Marketplace 流程原先只发布 Core 和 Pack。现按 Core → Symfony → Pack 发布，以便 Pack 发布时两个 SoPHP 成员已在 Marketplace 可用。此流程仍需显式 `publish` 输入及受保护的 `marketplace` 环境；本次未执行。
- 发布检查表已改为三份 VSIX 的干净 Profile 安装与冒烟检查，移除 Recommended Pack 的旧安装、发布步骤；以当前源码 manifest 的 10 项为核对基线，外部扩展实际版本在候选安装时记录。

## 验证与下一步

`ci.yml`、`release.yml` 均可由 PyYAML 解析；发布步骤顺序及 Symfony VSIX 路径已逐项核对；`git diff --check` 通过。工作流尚未在 GitHub Actions 执行，不能据此认定 artifact 上传或 Marketplace 发布成功。

下一步仍以 C3 新文件生成的一次 Redo 缺口为代码阻断项；只有准备新安装候选时才运行 `package:all`、`verify:vsix`、干净 Profile 和 WSL Remote 验收。R4 的完整 PHP 编辑体验目标不变。
