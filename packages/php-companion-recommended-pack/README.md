# PHP Companion Recommended Pack

面向从 PhpStorm 迁移到 VS Code 的 PHP 开发者，提供默认启用自研 PHP Language Server 的完整开源编码组合。此包保留既有扩展 ID，升级用户无需迁移安装项；它不再自动安装 Intelephense 或其他通用 PHP Language Server。

## 包含内容

| 扩展 | 职责 |
|---|---|
| PHP Companion | PHP 补全、类型、诊断、导航、Composer/PSR-4 和安全重构 |
| TwigPlus | Twig 补全、导航、诊断和格式化 |
| YAML | YAML 语法、Schema、补全、诊断和格式化 |
| XML | XML 语法、XSD/DTD、补全、诊断、导航、重命名和格式化 |
| PHP Debug | Xdebug 断点、单步、变量和调用栈 |
| PHPUnit & Pest Test Explorer | 测试发现、运行和调试 |
| PHP CS Fixer | PHP 格式化和项目代码风格 |
| EditorConfig | 项目级缩进、换行和字符集 |

JSON/JSONC、HTML、CSS、JavaScript、TypeScript 和 Markdown 使用 VS Code 内建语言服务。XML 由仍在维护的 Red Hat XML/LemMinX 负责，不采用长期未发布且依赖已废弃 `xmldom` 的 DotJoshJohnson XML Tools。

Symfony Language Tools 暂不随 Pack 自动安装，也不属于受支持组合。0.20.1 与 0.20.2 都在重复门禁中参与普通 PHP 声明 Rename 并返回拒绝，导致 F2 不可用；扩展当前没有关闭该 Provider 的设置。上游提供可关闭的 Rename Provider 或稳定修复并通过三平台门禁后再重新评估。通用 Twig 能力仍由 TwigPlus 提供，Symfony/Doctrine 精准能力由 PHP Companion 自研组件逐步覆盖。

## 默认行为

- 默认启用 PHP Companion 自研 PHP Language Server。
- PHP 索引按需执行，不在扩展激活时同步扫描项目。
- PHP CS Fixer 是 PHP 默认格式化器，但不强制开启保存时格式化。
- Red Hat XML 是 XML 默认格式化器。
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
