# PHP Companion Open Source Pack

面向希望自行选择 PHP Language Server、或只使用开源 PHP 工具的开发者。扩展包保持职责精简，不安装重复的 namespace、重构、格式化或全项目静态分析扩展。

## 包含内容

| 扩展 | 职责 |
|---|---|
| PHP Companion | Composer/PSR-4、类型创建、项目工作流和按需安全重构 |
| TwigPlus | Twig 补全、导航、诊断和格式化 |
| PHP Debug | Xdebug 断点、单步、变量和调用栈 |
| PHPUnit & Pest Test Explorer | 测试发现、运行和调试 |
| PHP CS Fixer | PHP 格式化和项目代码风格 |
| EditorConfig | 项目级缩进、换行和字符集 |

此 Pack 不安装 PHP Language Server。需要类型感知补全、悬停和完整语言诊断时，建议改用 **PHP Companion Recommended Pack**，或自行选择一个 PHP Language Server；不要同时启用多个 PHP Language Server。

## 性能默认值

- PHP Companion 仅按需索引，不在启动时扫描工作区。
- 粘贴 Import 默认显示预览。
- 实验性跨项目重构默认关闭。
- PHP CS Fixer 被设为 PHP 默认格式化器，但不会强制开启保存时格式化。

推荐在项目内安装 PHP CS Fixer，并通过工作区设置指定可执行文件和配置。

## 本地安装

```bash
pnpm package:all
code --install-extension php-companion-0.4.0.vsix
code --install-extension packages/php-companion-extension-pack/php-companion-open-source-pack-0.4.0.vsix
```
