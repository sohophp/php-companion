# SoPHP 0.4.5 Winstar 人工验收记录

状态：进行中。自动门禁已通过；真实 WSL Remote 持续编辑尚未完成，不能据此判定 Alpha 通过。

## 候选身份

- 候选目录：`artifacts/php-companion-alpha-0.4.5-81580890/`
- 源码提交：`81580890599c2535741254772baf1280a98607fe`
- Core SHA-256：`965d4e829be9d0f436365bb500bb703dd27757dbff22da0e4b6c8ade07f62661`
- Symfony SHA-256：`484f6a843f18f384ab7b383668fb0ae48f2e36fc92d28f44539b7a2c5c466510`
- Open Source Pack SHA-256：`850f255b3c594ca5080c05d4b22d31ad94357817ef4c661b614482c79ee02e7d`
- Recommended Pack SHA-256：`8bbd96af2d5c3ba38594b6631223db69f558cee38a12941f73453d2f5dab6011`

## 已完成的自动证据

- `pnpm check` 通过：TypeScript、ESLint、全部包级与根目录测试、四份 VSIX 打包及内容校验通过。
- Language Server：261 项通过、1 项跳过。
- Winstar `/var/www/php/8.5/winstar2024`：候选摘要、WSL2、Composer 根、`bin/php-runtime` 与 PHP 8.5 确定性预检通过。
- CoreRepo `/var/www/php/7.2/CoreRepo`：候选摘要、WSL2、Composer 根、`phpbin` 与 PHP 7.2 确定性预检通过。
- 两个 Pack 均包含 `eiminsasete.apacheconf-snippets`；冻结试用版本为 1.4.0。该扩展声明依赖 `mrmlnc.vscode-apache`。

## Winstar 人工检查

以下结果由实际 VS Code WSL Remote Profile 记录。自动测试不能代替这些项目。

- [ ] 确认 SoPHP Core、SoPHP Symfony 和工作区扩展运行于 WSL Extension Host。
- [ ] 确认只安装 Open Source Pack 或 Recommended Pack 之一。
- [ ] 确认 Intelephense、PHP Tools、Phpactor 与 Symfony Language Tools 未在该 Profile 中竞争 PHP Provider。
- [ ] 从 VS Code WSL 集成终端运行带 `--check-editor` 的严格预检并保存输出。
- [ ] 记录空缓存立即 References、后台源码就绪后、选中符号预热后和 Reload 后首次 References 的等待时间。
- [ ] 验证 Completion、Hover、Signature Help、Definition、Implementation 和 References。
- [ ] 在测试代码中验证 Rename、Safe Move Preview、Extract Variable、Extract Method，以及 Apply、Undo、Redo。
- [ ] 验证支持范围内诊断出现并在修复源码后消失。
- [ ] 验证 PHP CS Fixer、PHPUnit 与 Xdebug 使用 Winstar 的 PHP 8.5 项目包装器。
- [ ] 验证 TwigPlus、YAML、XML、JSON/JSONC，以及 `.htaccess` 的 Apache 语法和片段。
- [ ] 连续编辑至少两小时，记录陈旧结果、CPU、内存、Language Server 重启及工作区编辑失败。

## 反馈格式

反馈可以直接发在当前对话。每项至少记录：

1. 候选目录、提交号或 Core VSIX SHA-256。
2. 操作文件和光标位置；敏感业务内容可用最小复现替代。
3. 预期结果、实际结果和能否稳定复现。
4. 大致发生时间，以及当时是否有构建或测试任务并发占用 WSL CPU。
5. 截图；如涉及 Language Server，再附 SoPHP Output 中对应时间附近的日志。

错误补全、错误诊断、错误跳转、漏改或错误工作区编辑属于 Alpha 阻断缺陷。支持范围外返回空结果记为能力缺口，不直接判定阻断。

## 当前结论

候选已经具备开始人工试用的自动证据。WSL Extension Host 所属、竞争 Provider 状态、实际交互和持续编辑均待用户测试，因此 Alpha 状态保持进行中。
