# SoPHP Open Source Pack

面向希望直接使用自研 PHP Language Server 和开源 PHP 工具的开发者。扩展包保持职责精简，不安装重复的 namespace、重构、格式化或全项目静态分析扩展。

当前源码组合为 11 项：SoPHP Core、SoPHP Symfony 和下表的 9 项外部工具。已冻结的 0.4.5 私有 VSIX 候选仍是先前的 10 项组合，尚未包含后来加入的 PHP DocBlocker；要体验 11 项组合，须等下一次同批候选冻结，或使用已验证的源码 Profile。公开 Marketplace 页面也仍显示旧说明，不能当作当前源码清单。

## 包含内容

| 扩展 | 职责 |
|---|---|
| SoPHP | Composer/PSR-4、类型创建、项目工作流和按需安全重构 |
| SoPHP Symfony | 服务容器、依赖注入、路由、事件及 Controller → Twig 上下文 |
| TwigPlus | Twig 补全、导航、诊断和格式化 |
| YAML | YAML 语法、Schema、补全、诊断和格式化 |
| XML | XML 语法、XSD/DTD、补全、诊断、导航、重命名和格式化 |
| PHP Debug | Xdebug 断点、单步、变量和调用栈 |
| PHPUnit & Pest Test Explorer | 测试发现、运行和调试 |
| PHP CS Fixer | PHP 格式化和项目代码风格 |
| EditorConfig | 项目级缩进、换行和字符集 |
| Apache Conf Snippets | `.htaccess` / Apache 配置片段；依赖 Apache Conf 语法扩展 |
| PHP DocBlocker | 输入 `/**` 生成 PHPDoc，补全 `@param` 等标签；SoPHP 负责解析生成的类型 |

以上 11 项的扩展 ID 以本包 `package.json` 的 `extensionPack` 为准；Pack 只负责组合安装，成员的 Marketplace 版本不会被锁定。Apache Conf Snippets 所需的 `mrmlnc.vscode-apache` 由该扩展自身声明为依赖。当前唯一维护的组合入口是 Open Source Pack，旧 Recommended Pack 不再随新候选生成。[公开 Marketplace 页面](https://marketplace.visualstudio.com/items?itemName=sohophp.php-companion-open-source-pack)可能仍是旧版，不能用其说明或安装结果验证本仓库的 0.4.5 私有候选；Core、Symfony 和 Pack 要使用同一候选的三个 VSIX。实际使用前的运行位置、唯一语言服务和回退检查见[日常开发组合方案](https://github.com/sohophp/php-companion/blob/main/docs/php-language-toolchain/daily-use-assembly.md)。

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

## 本地候选安装

只有需要生成并试用新候选时才执行以下打包命令；日常 Core 开发按相关包运行定向测试。Symfony 尚按私有候选交付，因此本地试用须安装同一次构建的三个 VSIX。

```bash
pnpm package:all
code --install-extension php-companion-0.4.5.vsix
code --install-extension packages/php-companion-symfony/php-companion-symfony-0.4.5.vsix
code --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.4.5.vsix
```
