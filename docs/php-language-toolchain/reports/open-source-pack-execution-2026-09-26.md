# Open Source Pack 执行清单与 SoPHP 起点

日期：2026-09-26。本页按当前可用组合整理下一步。只改 SoPHP 仓库；没有修改业务项目。

## 组合已经定下

默认 Pack 的 10 个直接成员以 [manifest](../../../packages/php-companion-extension-pack/package.json) 为准：SoPHP Core、SoPHP Symfony、TwigPlus、Red Hat YAML、Red Hat XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets 和 PHP DocBlocker。每项编辑能力由一个提供者负责：Core 管普通 PHP 语义与安全编辑；Symfony 扩展管框架事实；其余工具分别管模板、配置、调试、格式化、项目编辑约定、Apache 片段和 PHPDoc 注释生成。Pack 不自动安装另一个通用 PHP Language Server、另一个格式化器或 Symfony Language Tools。

PHPUnit/Pest 默认由项目 CLI 执行。`recca0120.vscode-phpunit` 3.9.40 在完整组合中处理测试文件 Rename 时会读取旧路径并抛出 ENOENT；其上游 `main` 在 2026-09-26 仍为此前评估的 `90814392887e157c9fad92139571aa7fb6e01641`，没有新提交可据以解除阻断。`aossoftware.aos-phpunit` 0.2.0 已在隔离 Linux 的完整组合通过实际 PHPUnit 运行及测试文件 Rename/Undo/Redo，可按需单装；Pest 和真实 WSL Remote 没有同等证据，因此不加入默认 Pack。详见[测试视图提供者评估](open-source-pack-test-provider-candidates-2026-09-25.md)。

最新冻结候选是 [0.4.7 / `be1c39b2`](open-source-pack-047-frozen-profile-2026-09-26.md)：Core、Symfony、Pack 三份 VSIX 与八个外部成员在隔离 VS Code 1.139.1 Linux Profile 通过打包组合宿主。Pack 的 `extensionPack` 只列扩展 ID，不锁 Marketplace 版本；候选用独立清单固定实际版本。公开 Marketplace Pack 仍是旧清单，不能替代这份候选。真实 WSL Remote、实际工具路径及长期使用仍须单独验收。

## 接下来从 SoPHP 哪里开始

| 顺序 | 工作 | 可判定的结果 |
| --- | --- | --- |
| 1. C1 输入与导航 | 在独立 Composer 项目用完整 10 项 Profile 连续输入 PHP，核对候选可见、作用域、版本、Definition 和 References；优先处理可复现的错误建议或缺失跳转 | 同一输入在语义、真实 LSP 和 VS Code 可见建议中一致；HTML 与 PHP 边界、字符串插值均有正反例 |
| 2. C2 编辑反馈 | 未保存地改声明和用法，检查补全、签名、Hover、Definition、诊断，以及关闭重开和 watcher 事件后的恢复 | 旧结果被撤回，新结果归属当前文档与 Composer 根；有明确输入和宿主证据 |
| 3. C3 安全编辑 | 按实际频率验证 Import、Rename、Safe Move、Extract、Inline、类型生成的预览、取消、应用及一次 Undo/Redo | 完整应用才报成功；`createFile` 最终兜底的 Redo 单列为已知缺口，只在有新资源撤销路径证据时重开 |
| 4. C4 / R4 | 到下一个交付点冻结同批三份 VSIX，再验证真实 WSL Remote、PHP 版本、跨平台、规模、缓存恢复及持续使用 | 安装内容、唯一 PHP 提供者、工具路径和完整 PHP→Symfony/Twig/YAML/XML→格式化→调试→CLI 测试链通过；R4 保持最终目标 |

这条顺序已经开始执行：隔离分支 `feat/c1-interpolated-variable-completion` 修复了[插值字符串变量补全](c1-interpolated-variable-completion-2026-09-26.md)、[插值成员与普通文本的边界](c1-interpolated-member-boundary-2026-09-26.md)、[普通函数与常量建议的表达式边界](c1-function-constant-completion-boundary-2026-09-26.md)、[类名补全的代码边界](c1-type-completion-code-boundary-2026-09-26.md)、[混合 PHP/HTML 文件的补全边界](c1-mixed-php-html-variable-completion-2026-09-26.md)和[自动 PHP 版本宿主门禁](c1-auto-version-host-gate-2026-09-26.md)。语义回归与实际 VS Code 补全请求通过，完整 10 项源码 Profile 通过。这些增量已包含在 0.4.7 冻结候选中。后续继续按可见错误推进 C1/C2；不因每个小改动重新打包，也不等待人工反馈才执行独立验证。

C2 已补上[按需模式的跨文件联合数组形状反馈](c2-ondemand-union-shape-feedback-2026-09-26.md)：未打开形状字段的类文件时，共有成员仍能补全并跳到两个定义；Factory 的 PHPDoc 在未保存缓冲区改为单一分支后，使用方的补全、Hover 和定义同步更新。独立 Composer 真实 LSP、完整 10 项源码宿主及 0.4.7 打包宿主通过；真实 WSL Remote 仍待 C4。
