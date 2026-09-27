# Open Source Pack 整理与 SoPHP Core 起点

日期：2026-09-27。本文是当前执行入口；历史报告保留当时的候选与测试结果。只核对 SoPHP 仓库和独立 Composer 夹具，不修改业务项目。

## 当前决定

- **Pack 保持 10 项，暂不增删。** Core 与 Symfony 负责 PHP 和可证明的框架事实；TwigPlus、Red Hat YAML/XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets 和 PHP DocBlocker 各负责一项独立能力。测试默认走项目 PHPUnit/Pest CLI。旧 Recommended Pack 不再维护。外部成员升级须复核组合，Pack 的 `extensionPack` 无法锁定 Marketplace 版本。
- **先使用同批私有候选。** 当前 [0.4.8 候选](open-source-pack-048-private-alpha-2026-09-27.md)是 Core、Symfony、Pack 三份 VSIX；公开 Marketplace Pack 仍是旧组合。项目 PHP、Composer、fixer、Xdebug 与测试命令需要在实际 Extension Host 环境中配置；隔离 Linux 宿主已通过，真实 WSL Remote 安装及完整操作链仍属 C4 验收。
- **Core 起点是普通 PHP 的 C1/C2 连续输入链。** 在独立 Composer 项目核对未打开 vendor 类、未保存声明的补全、定义、实现、引用、参数提示、Hover 和诊断，先复现首个用户可见错误或明显等待，再做定向修复。若没有新的 C1/C2 错误，转向 C3 已知的文件创建 `createFile` 回退 Redo；交付时统一冻结候选并做 C4。人工反馈随时并入，不阻塞独立源码工作。R4 的完整 PhpStorm 式体验目标不变。

最新 C1 增量：[类体 trait `use` 补全](c1-trait-use-completion-2026-09-27.md)已从可复现缺口修复到语义、按需 stdio、独立 C1 与 10 项 Pack 源码宿主通过。它尚未进入 0.4.8 私有候选；日常增量继续不重复打包。

[继承与实现语句的候选类型](c1-inheritance-kind-completion-2026-09-27.md)又修复了 `extends`/`implements` 混入错误声明种类的问题，完整语义与 10 项 Pack 的 VS Code C1 源码宿主通过；同属候选冻结后的源码增量。

[创建、类型检查与 Attribute 候选种类](c1-construction-kind-completion-2026-09-27.md)进一步筛选 `new`、`instanceof` 和 Attribute 的声明种类。随后 [Attribute 类身份筛选](c1-attribute-class-completion-2026-09-27.md) 在按需声明层保留类头标记，排除未标记的普通 class；解析器、语义和 10 项 Pack C1 源码宿主通过。目标位、重复使用与真实 Remote 仍待验收。

[未保存 Attribute 声明跨文件刷新](c2-unsaved-attribute-marker-completion-2026-09-27.md)补齐了 C2 的对应宿主证据：去掉、恢复 `#[Attribute]` 后，另一文件的候选会撤回、再出现；10 项 Pack C2 源码宿主通过。下一步仍按普通 PHP 连续编辑的错误结果与可见等待推进，优先修可复现的高频问题，再处理 C3 剩余安全编辑与 C4 安装验收。

下表、证据和历史进展解释这些决定；以本节顺序为准。

本轮[普通 PHP C1/C2 基线复核与 PHPDoc 模板续行](c1-multiline-template-bound-completion-2026-09-27.md)已通过独立 Composer vendor 的六项查询和 C2 源码宿主，并修复多行模板约束的项目类补全。完整 Pack 源码宿主第二次运行通过，首次在原有数组形状补全处有一次尚未归因的失败；该 C1 波动继续记录，C3 最终创建 Redo 和 C4 安装门槛仍开放。新增源码已进入 0.4.8 候选。

[多异常 catch 类型补全](c1-multicatch-type-completion-2026-09-27.md)已从语义红灯修复到完整 Pack 源码宿主通过，覆盖跨命名空间异常类、自动导入和不重复候选；普通表达式与无效交叉符号不进入该上下文。它已进入 0.4.8 候选。

[新目录类型生成的最近父目录暂存移动](c3-type-generation-missing-directory-stage-2026-09-27.md)已在完整 Pack 源码宿主通过一次 Undo/Redo：即使系统临时目录和工作区同级移动失败，只要目标目录的现有父目录可用，仍能保持可重做的资源移动。所有移动都失败时最终创建兜底仍可创建文件，但该路径的 Redo 缺口继续开放。

## 先用这套组合开始开发

1. 以同一批候选安装 SoPHP Core、SoPHP Symfony 和 Open Source Pack 三份 VSIX；`SHA256SUMS` 与 `candidate.json` 标识这批确切内容。公开 Marketplace 的 Pack 页面仍是旧组合，不能用它安装下表的当前组合。Pack manifest 只固定扩展 ID，外部成员版本以候选记录和实际安装结果为准。
2. 在 PHP 项目使用的 VS Code Extension Host 中确认只有 SoPHP 负责通用 PHP 语言能力，PHP CS Fixer 是唯一默认 PHP formatter，TwigPlus 负责 Twig，Red Hat 扩展分别负责 YAML/XML。`php.validate.executablePath`、PHP CS Fixer、Xdebug 和测试 CLI 指向同一个项目运行环境；Pack 不会安装这些项目工具。
3. 在独立 Composer 项目走一次输入、补全、跳转、PHPDoc、Symfony/Twig、格式化、调试和 PHPUnit/Pest CLI 的链路。任何一步缺失时记录候选摘要、扩展宿主位置、操作输入和结果。真实 WSL Remote 及长期使用仍是 C4 验收项，现有隔离 Linux 宿主结果不能替代它们。

这套 10 项组合可用于已列明的功能范围；测试视图和额外通用 PHP 语言服务器暂不自动安装。Open Source Pack 继续作为唯一维护的组合入口，不恢复 Recommended Pack。

## 固定组合

[Pack manifest](../../../packages/php-companion-extension-pack/package.json) 有 **10 个直接成员**。下面版本来自 [0.4.8 冻结候选记录](open-source-pack-048-private-alpha-2026-09-27.md)中的 `candidate.json`，用于复现已验证组合；`extensionPack` 本身只列扩展 ID，不能锁定 Marketplace 后续安装的版本。冻结后的 C1/C2 源码修改尚未进入这批 VSIX。

| 成员 | 候选版本 | 唯一负责的能力 |
| --- | --- | --- |
| `sohophp.php-companion` | 0.4.8 | 通用 PHP 补全、类型、导航、诊断、Composer 索引和受限重构 |
| `sohophp.php-companion-symfony` | 0.4.8 | 可证明的 Symfony 服务、路由、事件和 Controller 上下文 |
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

最新可安装的私有候选冻结于 [`cbd82a72`](open-source-pack-048-private-alpha-2026-09-27.md)：同批 Core、Symfony、Pack 三份 VSIX，八个外部成员版本和产物摘要已记录。隔离 Linux 的完整组合与 C3 打包宿主通过。PHP 7.2–8.5 九个**目标设置**的 C1 宿主，以及 WSL2 自动化规模基准属于先前 0.4.7 候选的通过记录，尚未用 0.4.8 重跑。真实 VS Code WSL Remote 安装、Extension Host 归属、实际工具路径、人工编辑、其它平台和长会话仍待验收。

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

[关闭未保存文件后的即时引用](c2-phpdoc-close-index-modes-2026-09-27.md)已在源码中补上同项目关闭事件与后续语义查询的顺序约束，并让尚未完成全量索引的 `experimental`/`progressive` 模式按有界缓存恢复磁盘事实。独立 stdio 用例覆盖默认 `onDemand`、`experimental` 和 `progressive`，完整 stdio 回归 196 项通过、1 项跳过；该增量未进入 `248ee1f8` 冻结候选。Pack 默认仍使用 `onDemand`。

[PHPDoc 模板约束补全](c1-phpdoc-type-completion-2026-09-27.md)继续推进 C1：Core 识别 `@template T of ...`、`as ...` 和 PHPStan/Psalm 方言中的类型输入位置，隔离 Core 源码宿主验证建议与 Definition；DocBlocker 仍负责注释生成。此源码增量也未进入现有候选。

[已限定原生类型名补全](c1-qualified-native-type-completion-2026-09-27.md)进一步修复了 `new \Vendor\...`、导入的 namespace 别名、相对限定名、`extends` 和原生返回类型位置。独立语义测试及真实按需 stdio 请求验证了未打开的 PSR-4 类、准确 namespace 与不重复插入 import。它仍只是冻结后源码，尚未进入 `248ee1f8` 候选；下一个 C1 输入缺口继续按真实复现和用户可见影响选择。

R4 的目标仍是完整、稳定、接近 PhpStorm 的 PHP 开发体验。成熟扩展可以长期负责独立能力；只有同场景准确性、等待和回退的独立证据证明 SoPHP 更好时才切换所有者。人工反馈可随时纳入，不阻塞独立源码与自动化工作。

限定类型名的同一输入链还补上了下一段 namespace 建议，并阻止类型位置被同前缀的 PHP 函数补全抢占。独立 Composer PSR-4 stdio、完整语义包及语言服务器 stdio 回归已通过；隔离 VS Code 1.139.1 C1 源码宿主还实际接受了 namespace 建议并核对别名类补全。已安装 VSIX 与真实 WSL Remote 仍待下次候选验收。

绝对类型名的第一段也已补齐：`new \Dom` 可建议 Composer 的根 namespace。语义、定向真实 LSP 和隔离 C1 源码宿主已通过，结果仍属于冻结后源码。

[classmap 根 namespace 等待](c1-classmap-root-namespace-latency-2026-09-27.md)进一步显示，约 1 万 PHP 文件时同前缀重复请求原需 247 ms。复用有界的不完整搜索结果及已装载文件后，该脚本样本降到 4 ms；namespace 与类型候选并行查询又让首次请求从约 406 ms 降到 239 ms。真实 VS Code 与更大 classmap 项目仍须复核等待。

[Pack 清单复核与 Symfony `compact()` 函数身份](open-source-pack-audit-and-symfony-compact-2026-09-27.md)已核对当前 10 项 manifest、冻结 Profile 和 0.4.7 候选摘要，默认成员无需调整。随后修复了 Controller 导入同名 `compact()` 时向 Twig 发布虚假变量的问题；框架、Provider 与按需索引的 VS Code 源码宿主通过。该修复尚未进入 `248ee1f8` 安装候选。下一项先核对同命名空间跨文件 `compact()` 的实际解析与 Twig 上下文，再处理独立 Composer 项目的可见 C1/C2 错误；C3 创建文件 Redo 与 C4 Remote 验收门槛仍开放。

[跨文件 `compact()` 函数身份](symfony-cross-file-compact-context-2026-09-27.md)现覆盖已打开 PHP 文件与项目 Composer `autoload.files` 中的同命名空间声明，并处理未保存编辑、Undo、关闭及 watcher 导致的上下文刷新。默认按需索引的 VS Code 源码宿主与最终源码的定向真实 LSP 回归通过；完整 LSP 回归在最后一条 watcher 改动前通过，详细证据边界见报告。此增量未进入现有 0.4.7 VSIX；下一步回到普通 PHP 的 C1 候选可见性和 C2 同版本编辑反馈，同时继续保留 C3、C4 和 R4 验收门槛。
