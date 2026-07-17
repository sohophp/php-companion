# Changelog

## [0.4.0] - 2026-07-17

### Added

- 正式提供 Import Class Quick Fix/命令，候选限定到当前 Composer PSR-4 项目并按 namespace 距离排序。
- Paste Auto Import 不再依赖实验重构开关；多候选不猜测，alias 冲突要求明确选择。
- 新增带 Preview/Apply 流程的 Optimize Imports，支持 class/function/const、group use、alias、PHPDoc 和 Attribute。
- 新增 `imports.optimize.preview` 与 `imports.sort` 配置。

### Changed

- Import 与 Optimize Imports 按需索引 Composer 项目，保持激活阶段零扫描。
- 无法可靠分析、语法错误、取消或文档版本变化时不执行部分修改。
- 实验性 Safe Move 改为全有或全无：PSR-4 不规范、目标 FQCN 冲突、语法错误、索引缺失或未保存的相关文件会拒绝引用更新。
- Safe Move 不再依赖 `experimental.refactoring`，默认处理资源管理器内的 Composer PSR-4 PHP 文件移动；可通过 `move.enabled` 关闭。
- Safe Move 改为在文件操作完成后基于最新文档做幂等协调，串行处理连续移动，并自动收敛其他 PHP 扩展可能产生的新旧重复 `use`。
- 修正资源级配置读取与搜索根目录作用域警告；移动冲突现在报告实际声明文件路径。

本项目遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 的格式。

## [0.3.0] - 2026-07-17

### Added

- 以零启动扫描、懒加载 Composer/PHP 检测的方式恢复 PHP Companion 运行时。
- 新增 PSR-4 类型创建、FQN/namespace/类引用/相对路径复制，以及打开文件的 namespace/path 诊断和 Quick Fix。
- 新增性能日志、诊断报告、索引模式和文件数/大小/总量资源上限。
- 重新开放 Open Source Pack 和 Recommended Pack，以精简且不重复的 PHP 工具组合取代空占位包；Recommended Pack 额外提供 Intelephense。
- 正式接管 PHP 类型声明上的标准 F2 Rename，更新语义代码/PHPDoc 引用并可预览同步重命名 PSR-4 文件。

### Changed

- 项目级 Tree-sitter 索引与重构改为显式实验功能，只在用户触发后加载。
- Intelephense 保持可选协作，不作为强制扩展依赖。
- Rename 不再依赖实验重构总开关；普通字符串、配置文本和关联测试文件不会被自动重命名。
- 修正 `indexing.mode` 与粘贴 Import 设置的配置作用域读取，避免 VS Code Extension Host 产生 scope warning。
- Rename 重复符号检查现在只认 Composer 可解析的 PSR-4 规范声明，忽略路径不匹配的旧文件，并在真实冲突时报告具体文件路径。
- 修正 Refactor Preview 按构建顺序校验 WorkspaceEdit 时，目标文件文本编辑早于 `renameFile` 而导致 Apply 失败的问题。
- 增加 interface/trait Rename 准备、显式 alias 保留、全部 class-like 解析和非规范重复声明的 Extension Host 回归覆盖。

## [0.1.3] - 2026-07-17

### Changed

- 暂停全部运行时功能，移除自动激活、命令、设置、语言 Provider、文件监听和工作区索引，避免持续占用 Extension Host 资源。
- Open Source Pack 和 Recommended Pack 改为空占位包，不再为新用户安装其他扩展。
- Marketplace 显示名称改为 `PHP Companion (Paused)`；保留原扩展 ID，让现有用户自动升级到安全占位版本。

## [0.1.2] - 2026-07-17

### Changed

- Open Source Pack 和 Recommended Pack 默认将 PHPStan 设为手动分析模式，避免大型项目在启动、保存文件或修改配置时自动执行全项目分析并阻塞 Extension Host。
- PHP Companion 改用渐进式索引：自动索引打开文件及其 PSR-4 Import，跨项目重命名时按需补齐索引；完整索引会分批解析并主动让出事件循环，同时释放被替换或清空的 Tree-sitter 语法树。
- 新增 PSR-4 文件移动重构，移动 PHP 类时同步更新 namespace 与相关引用。
- 不再注册 `Shift+F6`，避免与 IntelliJ IDEA Keybindings 的 Rename 操作冲突；仍可从命令面板执行 PHP Companion 重命名。

## [0.1.1] - 2026-07-16

### Added

- 为 PHP Companion、Open Source Pack 和 Recommended Pack 添加不同的 256×256 Marketplace 图标与横幅配色。
- 自动校验图标尺寸以及三个 VSIX 是否包含图标。

## [0.1.0] - 2026-07-16

### Added

- PHP 7.2–8.5 的工作区级版本检测和手动选择。
- Composer PSR-4/Tree-sitter 符号索引与兼容性报告。
- class、interface、trait 和 enum 的 Shift+F6 安全重命名。
- PHP 代码复制粘贴时的 import 元数据与补全。
- 独立的 Open Source Pack 和包含 Intelephense 的 Recommended Pack。
- 中英文命令、设置和扩展包说明。

[0.1.0]: https://github.com/sohophp/php-companion/releases/tag/v0.1.0
[0.1.1]: https://github.com/sohophp/php-companion/compare/v0.1.0...v0.1.1
[0.1.2]: https://github.com/sohophp/php-companion/compare/v0.1.1...v0.1.2
[0.1.3]: https://github.com/sohophp/php-companion/compare/v0.1.2...v0.1.3
[0.3.0]: https://github.com/sohophp/php-companion/compare/v0.1.3...v0.3.0
[0.4.0]: https://github.com/sohophp/php-companion/compare/v0.3.0...v0.4.0
