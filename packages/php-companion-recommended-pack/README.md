# PHP Companion Recommended Pack

面向从 PhpStorm 迁移到 VS Code 的 PHP 开发者，提供默认启用自研 PHP Language Server 的完整开源编码组合。此包保留既有扩展 ID，升级用户无需迁移安装项；它不再自动安装 Intelephense 或其他通用 PHP Language Server。

## 包含内容

| 扩展 | 职责 |
|---|---|
| PHP Companion | PHP 补全、类型、诊断、导航、Composer/PSR-4 和安全重构 |
| TwigPlus | Twig 补全、导航、诊断和格式化 |
| Symfony Language Tools | Symfony 路由、服务、配置与框架字符串增强；默认只做静态索引 |
| YAML | YAML 语法、Schema、补全、诊断和格式化 |
| PHP Debug | Xdebug 断点、单步、变量和调用栈 |
| PHPUnit & Pest Test Explorer | 测试发现、运行和调试 |
| PHP CS Fixer | PHP 格式化和项目代码风格 |
| EditorConfig | 项目级缩进、换行和字符集 |

JSON/JSONC、HTML、CSS、JavaScript、TypeScript 和 Markdown 使用 VS Code 内建语言服务。Symfony Language Tools 只补充框架感知能力；通用 Twig 解析、变量、导航和格式化仍由 TwigPlus 负责。默认关闭 `symfonyLsp.runtimeIndexing` 与 `symfonyLsp.releaseMetadata`，不执行项目内核，也不请求版本元数据。

Symfony Language Tools 的项目功能要求工作区已经安装 Composer 依赖。只有 `composer.json` 而没有 `vendor/` 的目录不属于已支持的 Symfony 验证环境；安装依赖后再检查其状态栏或 `Symfony Language Tools: Show Index Status`。PHP Companion 的通用 PHP 能力不依赖该插件成功发现 Symfony 应用。

## 默认行为

- 默认启用 PHP Companion 自研 PHP Language Server。
- PHP 索引按需执行，不在扩展激活时同步扫描项目。
- PHP CS Fixer 是 PHP 默认格式化器，但不强制开启保存时格式化。
- 实验性跨项目重构默认关闭。
- 不安装第三方通用 PHP Language Server。

## 旧 Intelephense 工作流

仍需旧工作流的现有用户可以手动安装 Intelephense。没有显式选择时，PHP Companion 会检测该扩展并保持自身服务器关闭；建议在工作区或用户设置中固定选择：

```json
{
  "phpCompanion.languageServer.enabled": false,
  "phpCompanion.rename.enabled": false
}
```

这条兼容路径继续保留自动化回归，但不属于 Recommended Pack 的默认安装内容。不要同时启用两个 PHP Language Server。

## 本地安装

```bash
pnpm package:all
code --install-extension php-companion-0.4.5.vsix
code --install-extension packages/php-companion-recommended-pack/php-companion-recommended-pack-0.4.5.vsix
```
