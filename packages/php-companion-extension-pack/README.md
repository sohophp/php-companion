# PHP Companion Open Source Pack

面向从 PhpStorm 迁移到 VS Code 的 PHP 开发者。本扩展包不安装 PHP Language Server，适合希望自行选择语言服务器或只使用专项工具的用户。

## 包含的扩展

| 分类 | 扩展 | 主要用途 |
|---|---|---|
| 核心补充 | PHP Companion | PHP 版本检测、Shift+F6 重命名、文件名同步、粘贴 import |
| Twig | TwigPlus | Twig 补全、跳转、格式化和编辑体验 |
| 快捷键 | IntelliJ IDEA Keybindings | PhpStorm/IntelliJ 键位 |
| PHPDoc | PHP DocBlocker | 输入 `/**` 后生成 PHPDoc |
| Namespace | PHP Namespace Resolver | 添加、排序和清理 `use` |
| 文件操作 | PHP Smart Files | 创建和移动 PSR-4 类型 |
| 调试 | PHP Debug | Xdebug 调试 |
| 测试 | PHPUnit & Pest Test Explorer | 测试发现、运行和调试 |
| 格式化 | PHP CS Fixer | PSR-12 和项目规则格式化 |
| 静态分析 | PHPStan | 在 Problems 面板显示 PHPStan 结果 |

## Language Server

PHP Companion 不是完整的 PHP Language Server。不安装语言服务器时，PHP Companion 的版本检测、符号索引、重命名和智能粘贴仍可独立工作，但类型感知补全、悬停、签名提示和完整实时诊断会较弱。

如果希望得到更接近 PhpStorm 的默认体验，请安装 **PHP Companion Recommended Pack**。不要在同一工作区同时启用多个 PHP Language Server。

## 推荐设置

```jsonc
{
  "phpCompanion.phpVersion": "auto",
  "phpCompanion.pasteImports.mode": "preview",
  "phpCompanion.rename.includeTextMatches": "confirm",
  "phpNamespaceResolver.autoImportOnSave": false,
  "phpNamespaceResolver.removeOnSave": false,
  "[php]": {
    "editor.defaultFormatter": "junstyle.php-cs-fixer"
  }
}
```

关闭 Namespace Resolver 的保存时自动修改，可以避免它与智能粘贴或格式化同时改写 imports。

## 本地安装

```bash
pnpm package:all
code --install-extension php-companion-0.1.1.vsix
code --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.1.1.vsix
```

本地测试应先安装 PHP Companion VSIX。正式发布后，安装本扩展包会自动安装清单中的扩展。
