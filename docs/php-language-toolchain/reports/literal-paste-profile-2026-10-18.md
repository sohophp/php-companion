# 字符串粘贴卡顿修复与 Alpha Profile 更新

日期：2026-10-18。范围：在 `$a = '';` 等字符串值中粘贴已有文本；修复后更新一次现有 `PHP Companion Alpha` Profile。实现和安装均使用独立修复工作区，原工作区 225 个受保护路径保持原样。

## 原因与修改

旧粘贴入口没有检查目标是否位于字符串内。文本包含大写类名样式单词时，会读取磁盘建立文档保护快照，再逐个请求 `importCandidates`，甚至在字符串中产生 `use` 导入编辑。粘贴会等待这条链完成。

增加使用当前编辑器 UTF-16 偏移的本地词法预检查。在任何磁盘快照、项目索引或语言服务器请求之前，识别完全位于字符串文本中的目标并返回普通粘贴。支持单引号、双引号、转义字符、Heredoc/Nowdoc、多选区及 PHP/HTML 切换；有歧义的插值表达式保留原处理路径。新旧粘贴入口共用这一判断。普通标量文本的检查也移到磁盘快照之前，并保留读取剪贴板期间的文档版本保护。

## 已执行并通过

- 根单元测试：23 个文件、143 项；其中粘贴单元测试 29 项。
- 根 TypeScript 检查、受影响文件 ESLint、扩展测试 TypeScript 编译、完整 Core 构建与 VSIX 打包。
- Linux VS Code 1.142.0 扩展宿主：LSP 模式和旧入口各 8 次提供器调用，覆盖单引号、双引号、中文和 Nowdoc，分别使用普通文本及带复制符号元数据的文本。8 次实际剪贴板粘贴及撤销、2 次正常代码导入均通过。测试使用独立文件并检查初始原文，保留未保存的编辑。
- 冻结对照使用相同测试和完全相同的语言服务器文件。旧前端的普通文本处理耗时 715–1909 ms，带元数据约 19–20 ms，8 次均错误地产生导入编辑；修复前端在 LSP 模式为 0.9–2.8 ms，旧入口为 0.8–2.7 ms，16 次均无导入编辑。这里计时为测试命令到粘贴提供器返回，未把它当作真人端到端输入延迟。

## 已执行但失败及纠正

最初的宿主测试使用不存在的类，代码导入断言失败；随后一次启动与构建清理冲突，另一次独立启动继承了 `ELECTRON_RUN_AS_NODE`。修复版首次测试还复用了同一 URI，文件缓存导致后续样例使用旧文档。这些日志均保留，不作为性能结论。改用现有 `UserService`、冻结产品目录、清理宿主启动环境和独立 URI，并核对实际原文后，最终三个宿主任务均退出 0。

## Profile 安装

已备份 Profile 清单及旧 Core 文件，并从归档回读校验。Core 更新为包含本次修复的 **0.4.13 本地构建**，没有发布新版本。Profile 仍为 `PHP Companion Alpha`（`5db630d7`），共 15 个扩展，其余 14 个扩展的标识、版本、路径和 metadata 保持一致。VS Code 仅规范化了 YAML 扩展条目的 UUID/URI 序列化。

远程 `code` CLI 忽略 `--profile` 参数，因此安装后直接检查 Alpha Profile 的真实扩展目录：VSIX 中 18 个文件全部匹配，`package.json` 校验忽略 VS Code 生成的 `__metadata`。旧包的 `.vsixmanifest` 为安装器文件。

- 新前端 SHA-256：`aed7f3fbeae383567481c0b7bf609e5c9201f1891d43b433d7aa766fdcf153a0`
- 未改变的语言服务器 SHA-256：`26110ba9a3f7c0fb2c8f3a52808f991397f12d6b560fae232a81a907a20d43a4`
- VSIX SHA-256：`17d666e48ef52f82f38ebb5033f044949c0e532263b4a74a0a40d45afb0e479d`

## 未执行与保留事项

本次未运行远程 CI、未发布版本、未执行真人 WSL 窗口验收。安装完成后需执行 `Developer: Reload Window` 才会加载新构建。复杂 Controller 的性能门槛继续保留为独立任务。

详细数值与文件校验见 [JSON 记录](literal-paste-profile-2026-10-18.json)。原始日志、旧 Profile 备份、冻结对照输入和清理归档位于修复工作区 `.vscode-test/literal-paste-2026-10-18/`；测试产品、项目和用户数据目录已归档回读校验后清理。

复现修复版宿主测试：先构建 Core 并编译扩展测试，再使用 `PHP_COMPANION_TEST_LITERAL_PASTE_ONLY=1 PHP_COMPANION_TEST_CORE_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js`。可通过 `PHP_COMPANION_TEST_VSCODE_EXECUTABLE` 指定已有 VS Code 可执行文件。
