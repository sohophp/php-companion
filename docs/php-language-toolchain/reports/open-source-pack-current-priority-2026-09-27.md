# Open Source Pack 整理与 SoPHP Core 起点

日期：2026-09-27。本文是当前执行入口；历史报告保留当时的候选与测试结果。只核对 SoPHP 仓库和独立 Composer 夹具，不修改业务项目。

## 固定组合

[Pack manifest](../../../packages/php-companion-extension-pack/package.json) 有 **10 个直接成员**。下面版本来自 [0.4.7 冻结候选记录](open-source-pack-047-postfreeze-alpha-2026-09-27.md)中的 `candidate.json`，用于复现已验证组合；`extensionPack` 本身只列扩展 ID，不能锁定 Marketplace 后续安装的版本。

| 成员 | 候选版本 | 唯一负责的能力 |
| --- | --- | --- |
| `sohophp.php-companion` | 0.4.7 | 通用 PHP 补全、类型、导航、诊断、Composer 索引和受限重构 |
| `sohophp.php-companion-symfony` | 0.4.7 | 可证明的 Symfony 服务、路由、事件和 Controller 上下文 |
| `sohophp.twig-plus` | 1.3.8 | Twig 语言服务与格式化 |
| `redhat.vscode-yaml` | 1.24.0 | YAML 编辑 |
| `redhat.vscode-xml` | 0.29.3 | XML 编辑 |
| `xdebug.php-debug` | 1.40.1 | Xdebug 调试入口 |
| `junstyle.php-cs-fixer` | 0.3.21 | PHP 默认格式化器 |
| `EditorConfig.EditorConfig` | 0.18.2 | 项目编辑约定 |
| `eiminsasete.apacheconf-snippets` | 1.4.0 | Apache 配置片段；语法扩展由其依赖安装 |
| `neilbrayfield.php-docblocker` | 2.7.0 | `/**` 注释生成和 PHPDoc 标签建议 |

SoPHP Core 消费 PHPDoc 类型，Symfony 补框架事实，TwigPlus 负责 Twig 通用功能。Pack 默认启用 SoPHP 语言服务、按需索引和 PHP CS Fixer 格式化器，并关闭 PHP 通用单词建议。JSON、HTML、CSS、JavaScript、TypeScript、Git 和终端先用 VS Code 内建能力。PHPUnit/Pest 默认使用项目 CLI；PHPStan 由项目自行选择。旧 Recommended Pack 不再维护。

**暂不进入默认包：**原版 `recca0120.vscode-phpunit` 3.9.40 在完整组合中发生过测试文件 Rename 后读取旧路径的异常；测试视图仅单独评估。[替代候选的隔离结果](open-source-pack-test-provider-candidates-2026-09-25.md)不能代替 Pest 和真实 Remote 验收。另一个通用 PHP Language Server 和 `symfony.language-tools` 会造成能力冲突，均不纳入受支持组合。

## 当前可使用范围

最新可安装的私有候选冻结于 [`248ee1f8`](open-source-pack-047-postfreeze-alpha-2026-09-27.md)：同批 Core、Symfony、Pack 三份 VSIX，八个外部成员版本和产物摘要已记录。隔离 Linux 的完整组合宿主、PHP 7.2–8.5 九个**目标设置**的 C1 宿主，以及 WSL2 自动化规模基准已有通过记录。冻结后的源码修复不在该候选内。真实 VS Code WSL Remote 安装、Extension Host 归属、实际工具路径、人工编辑、其它平台和长会话仍待验收。

公开 [Marketplace Pack 页面](https://marketplace.visualstudio.com/items?itemName=sohophp.php-companion-open-source-pack)仍展示旧组合和旧说明，不能作为当前 10 项清单的安装入口。私有候选要从同一目录安装三份 VSIX，并以 `SHA256SUMS` 和实际安装成员为准。对已有 PHP 开发环境，先核对唯一通用 PHP 语言服务、唯一 PHP 默认 formatter、项目 PHP CLI 版本和 Remote 运行位置；不为每个 Core 小修复重打 VSIX。

## SoPHP Core 从哪里开始

| 顺序 | 要完成的操作链 | 通过条件 |
| --- | --- | --- |
| 1. C1 输入与跳转 | 在独立 Composer 项目复现 PHPDoc 类型跳转、普通类/成员补全与定义、未保存输入和跨文件导航缺口；先核对现有能力，再修最常见的实际错误 | 候选位置准确，说明文字和普通注释不误触发；未打开 vendor/项目类、别名和编辑后结果一致；完整 Pack 源码宿主通过 |
| 2. C2 同一份事实 | 对同一未保存声明连续检查补全、参数提示、Hover、Definition 和诊断，覆盖取消、关闭重开及 watcher 交错 | 不出现过期建议、错误诊断或相互矛盾的类型；记录用户可见等待与结果来源 |
| 3. C3 安全编辑 | 继续按实际使用频率验证 Import、Rename、Safe Move、Extract、Inline 和类型生成的预览、取消、应用结果、Undo/Redo | 每个支持场景可撤销且失败可解释；最终 `WorkspaceEdit.createFile` 兜底的 Redo 仍是明确未通过项，偶发 `Canceled` 根因未明 |
| 4. C4 交付组合 | 下个交付点一次性冻结三份 VSIX 和外部成员版本，在真实 WSL Remote Profile 检查 PHP→Symfony/Twig/YAML/XML→格式化→调试→CLI 测试 | 安装位置、唯一 Provider、工具路径及完整操作链通过；之后继续 Windows/macOS、PHP 版本矩阵和长会话 |

第一项的起手点已完成：[PHPDoc 类型跳转](c1-phpdoc-type-navigation-2026-09-27.md)在独立夹具复现了说明文字误跳，[跨行续写与未保存修改](c1-phpdoc-continued-type-navigation-2026-09-27.md)也已通过完整 Pack 源码宿主。[PHPDoc 引用及安全改名范围](c3-phpdoc-type-rename-safety-2026-09-27.md)随后修复了同名说明文字和数组形状键被误改的风险。PHPDoc 注释生成继续交给 DocBlocker。接下来优先处理可复现的 C1/C2 高频输入、反馈错误与等待；按用户可见影响调整顺序。

[C2 缓冲区关闭往返](c2-phpdoc-buffer-close-reference-2026-09-27.md)又确认默认 `onDemand` 下跨行 PHPDoc 的 References 与 Definition 跟随未保存内容，关闭后 References 恢复磁盘事实；单独运行时 `experimental` 模式的即时关闭查询尚无同样结论。继续检查更高频的普通 PHP 输入和跨能力反馈。

[完整语言服务器回归](c2-post-phpdoc-full-lsp-regression-2026-09-27.md)在最近 PHPDoc 解析改动后通过 21 个测试文件、383 项用例（1 项跳过），包括已有的普通 PHP 未保存成员与多能力反馈链。当前未复现新的普通 PHP 错误；下一项优先处理 C3 明确失败的文件创建 Redo 路径，或用户实际操作反馈中影响更大的 C1/C2 问题。

R4 的目标仍是完整、稳定、接近 PhpStorm 的 PHP 开发体验。成熟扩展可以长期负责独立能力；只有同场景准确性、等待和回退的独立证据证明 SoPHP 更好时才切换所有者。人工反馈可随时纳入，不阻塞独立源码与自动化工作。
