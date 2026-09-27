# SoPHP Open Source Pack

面向希望直接使用自研 PHP Language Server 和开源 PHP 工具的开发者。扩展包保持职责精简，不安装重复的 namespace、重构、格式化或全项目静态分析扩展。

当前源码组合为 10 项：SoPHP Core、SoPHP Symfony 和下表的 8 项外部工具。原版 PHPUnit & Pest Test Explorer 3.9.40 在配置了测试目录的完整组合中仍会因测试文件 Rename 读取旧路径，因此已从默认安装清单移出。测试先使用项目 PHPUnit/Pest CLI；测试视图作为可选扩展单独评估。私有候选的准确源码提交、三份 VSIX 摘要与外部成员版本以其 `candidate.json` 和 `SHA256SUMS` 为准；公开 Marketplace 页面仍是旧清单。

成员职责、现有验证范围和 Core 下一步见[Open Source Pack 当前执行清单](https://github.com/sohophp/php-companion/blob/main/docs/php-language-toolchain/reports/open-source-pack-current-priority-2026-09-27.md)。[Marketplace 与源码清单核对](https://github.com/sohophp/php-companion/blob/main/docs/php-language-toolchain/reports/open-source-pack-marketplace-audit-2026-09-25.md)记录了公开旧包的实际成员与外部工具的稳定版本快照。

## 包含内容

| 扩展 | 职责 |
|---|---|
| SoPHP Core | PHP 补全、类型、导航、诊断、Composer/PSR-4、类型创建与按需安全重构 |
| SoPHP Symfony | 服务容器、依赖注入、路由、事件及 Controller → Twig 上下文 |
| TwigPlus | Twig 补全、导航、诊断和格式化 |
| YAML | YAML 语法、Schema、补全、诊断和格式化 |
| XML | XML 语法、XSD/DTD、补全、诊断、导航、重命名和格式化 |
| PHP Debug | Xdebug 断点、单步、变量和调用栈 |
| PHP CS Fixer | PHP 格式化和项目代码风格 |
| EditorConfig | 项目级缩进、换行和字符集 |
| Apache Conf Snippets | `.htaccess` / Apache 配置片段；依赖 Apache Conf 语法扩展 |
| PHP DocBlocker | 输入 `/**` 生成 PHPDoc，补全 `@param` 等标签；SoPHP 负责解析生成的类型 |

以上 10 项的扩展 ID 以本包 `package.json` 的 `extensionPack` 为准；Pack 只负责组合安装，成员的 Marketplace 版本不会被锁定。Apache Conf Snippets 所需的 `mrmlnc.vscode-apache` 已在其公开 VSIX 中声明为依赖。当前唯一维护的组合入口是 Open Source Pack，旧 Recommended Pack 不再随新候选生成。[公开 Marketplace 页面](https://marketplace.visualstudio.com/items?itemName=sohophp.php-companion-open-source-pack)仍是旧清单，且 SoPHP Symfony 尚未公开上架；不能用公开包的安装结果验证本仓库源码。Core、Symfony 和 Pack 要使用同一候选的三个 VSIX。实际使用前的运行位置、唯一语言服务和回退检查见[日常开发组合方案](https://github.com/sohophp/php-companion/blob/main/docs/php-language-toolchain/daily-use-assembly.md)。

**测试入口：**默认用项目 CLI 运行 PHPUnit/Pest。需要 PHPUnit 测试视图时，可单独试用 `aossoftware.aos-phpunit` 0.2.0：它已在隔离 Linux 的完整组合中通过实际 PHPUnit 运行和测试文件 Rename/Undo/Redo，但 Pest 与真实 WSL Remote 尚未验收，因此不随 Pack 自动安装。`recca0120.vscode-phpunit` 原版 3.9.40 在完整组合的文件 Rename 后有旧路径错误；若已单独安装并遇到此错误，应在该工作区禁用。见[测试提供者评估](https://github.com/sohophp/php-companion/blob/main/docs/php-language-toolchain/reports/open-source-pack-test-provider-candidates-2026-09-25.md)。

**新文件生成：**类、接口、Trait、Enum 和测试文件先预览再创建。本机 Linux 的主移动路径、工作区同级移动及目标目录最近已存在父目录中的隐藏 `.tmp` 备用移动均已通过一次 Undo/Redo，包括目标子目录尚不存在的情况。若所有移动失败并转为 `createFile`，一次 Undo 可删除文件，但隔离宿主的一次 Redo 未恢复；该情况下可重新执行生成命令。备用移动被 Undo 后，隐藏 `.tmp` 会保留给 Redo。真实 WSL Remote 和其它平台仍需验收。

在项目根目录运行已安装的测试工具：

```bash
./vendor/bin/phpunit
./vendor/bin/phpunit tests/ExampleTest.php
./vendor/bin/pest
./vendor/bin/pest tests/ExampleTest.php
```

按项目实际测试文件路径选用一条命令；需要指定配置时按项目的 `phpunit.xml` 或 `phpunit.xml.dist` 传入 `--configuration`。若上游修复发布或独立维护的替代扩展通过同一组合门禁，再评估恢复默认测试视图。

JSON/JSONC、HTML、CSS、JavaScript、TypeScript 和 Markdown 使用 VS Code 内建语言服务，不重复安装基础语言扩展。XML 由仍在维护的 Red Hat XML/LemMinX 负责，不采用长期未发布且依赖已废弃 `xmldom` 的 DotJoshJohnson XML Tools。拼写检查、CSS Peek 和数据库客户端不是 PHP 编码闭环的必要能力，按需单独安装；其中 Database Client 当前发行版闭源且部分功能收费，不属于本开源包。

第三方 Symfony Language Tools 不随 Pack 自动安装，也不属于受支持组合。0.20.1 与 0.20.2 都在重复门禁中参与普通 PHP 声明 Rename 并返回拒绝，导致 F2 不可用；扩展当前没有关闭该 Provider 的设置。Pack 直接安装自研 `SoPHP Symfony`，通用 Twig 能力仍由 TwigPlus 提供。

此 Pack 不安装第三方 PHP Language Server，并通过扩展包默认设置启用 SoPHP 自研语言服务器。若另外安装了 Intelephense 且没有显式选择，SoPHP 会保留该现有提供者并保持自身服务器关闭；用户设置的 `phpCompanion.languageServer.enabled` 明确值始终优先。

## 性能默认值

- SoPHP 仅按需索引，不在启动时扫描工作区。
- 粘贴 Import 默认显示预览。
- 实验性跨项目重构默认关闭。
- PHP CS Fixer 被设为 PHP 默认格式化器，但不会强制开启保存时格式化。
- Red Hat XML 被设为 XML 默认格式化器。

推荐在项目内安装 PHP CS Fixer，并通过工作区设置指定可执行文件和配置。

VS Code 内建 PHP 校验默认在保存时调用 PHP CLI。项目使用 PHP 8.5 等非 PATH 默认版本时，将 `php.validate.executablePath` 指向**运行项目的同一个环境**中的 PHP，例如 WSL Remote 中的 `/usr/bin/php85`；同时确认 SoPHP 的目标版本与项目一致。在多根 `.code-workspace` 中，把该设置放在工作区级 `settings`：内建校验只读取一个工作区级可执行文件，混合 PHP 版本的根目录应分开工作区验证。否则旧 CLI 可能把合法新语法报成错误。

## 本地候选安装

私有候选在 `artifacts/php-companion-alpha-<版本>-<提交号>/`，由 `pnpm candidate:alpha` 输出准确目录；它不属于公开 Marketplace 的发行文件。Symfony 尚按私有候选交付。本地试用须在隔离 Profile 安装同一候选的三个 VSIX，并先核对该目录中的 `SHA256SUMS`。具体 Profile、WSL Remote 和预检步骤见[Alpha 候选说明](https://github.com/sohophp/php-companion/blob/main/docs/php-language-toolchain/alpha-candidate.md)。日常 Core 开发按相关包运行定向测试；只有冻结下一批候选时才重新打包。

进入 `pnpm candidate:alpha` 输出的目录后运行 `sha256sum -c SHA256SUMS`。
