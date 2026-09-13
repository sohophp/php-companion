# PHP Companion Open Source Pack

面向希望直接使用自研 PHP Language Server 和开源 PHP 工具的开发者。扩展包保持职责精简，不安装重复的 namespace、重构、格式化或全项目静态分析扩展。

## 包含内容

| 扩展 | 职责 |
|---|---|
| PHP Companion | Composer/PSR-4、类型创建、项目工作流和按需安全重构 |
| TwigPlus | Twig 补全、导航、诊断和格式化 |
| Symfony Language Tools | Symfony 路由、服务、配置与框架字符串增强；默认只做静态索引 |
| YAML | YAML 语法、Schema、补全、诊断和格式化 |
| PHP Debug | Xdebug 断点、单步、变量和调用栈 |
| PHPUnit & Pest Test Explorer | 测试发现、运行和调试 |
| PHP CS Fixer | PHP 格式化和项目代码风格 |
| EditorConfig | 项目级缩进、换行和字符集 |

JSON/JSONC、HTML、CSS、JavaScript、TypeScript 和 Markdown 使用 VS Code 内建语言服务，不重复安装基础语言扩展。拼写检查、CSS Peek 和数据库客户端不是 PHP 编码闭环的必要能力，按需单独安装；其中 Database Client 当前发行版闭源且部分功能收费，不属于本开源包。Symfony Language Tools 只补充框架感知能力；通用 Twig 解析、变量、导航和格式化仍由 TwigPlus 负责。默认关闭 `symfonyLsp.runtimeIndexing` 与 `symfonyLsp.releaseMetadata`，不执行项目内核，也不请求版本元数据。

Symfony Language Tools 的项目功能要求工作区已经安装 Composer 依赖。只有 `composer.json` 而没有 `vendor/` 的目录不属于已支持的 Symfony 验证环境；安装依赖后再检查其状态栏或 `Symfony Language Tools: Show Index Status`。PHP Companion 的通用 PHP 能力不依赖该插件成功发现 Symfony 应用。

此 Pack 不安装第三方 PHP Language Server，并通过扩展包默认设置启用 PHP Companion 自研语言服务器。若另外安装了 Intelephense 且没有显式选择，PHP Companion 会保留该现有提供者并保持自身服务器关闭；用户设置的 `phpCompanion.languageServer.enabled` 明确值始终优先。

## 性能默认值

- PHP Companion 仅按需索引，不在启动时扫描工作区。
- 粘贴 Import 默认显示预览。
- 实验性跨项目重构默认关闭。
- PHP CS Fixer 被设为 PHP 默认格式化器，但不会强制开启保存时格式化。

推荐在项目内安装 PHP CS Fixer，并通过工作区设置指定可执行文件和配置。

## 本地安装

```bash
pnpm package:all
code --install-extension php-companion-0.4.5.vsix
code --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.4.5.vsix
```
