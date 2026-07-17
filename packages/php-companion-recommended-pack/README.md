# PHP Companion Recommended Pack

面向从 PhpStorm 迁移到 VS Code 的 PHP 开发者，提供语言核心与少量边界清晰的专项工具。

## 包含内容

| 扩展 | 职责 |
|---|---|
| Intelephense | PHP 补全、诊断、悬停、定义和引用导航 |
| PHP Companion | Composer/PSR-4、类型创建、项目工作流和按需安全重构 |
| TwigPlus | Twig 补全、导航、诊断和格式化 |
| PHP Debug | Xdebug 断点、单步、变量和调用栈 |
| PHPUnit & Pest Test Explorer | 测试发现、运行和调试 |
| PHP CS Fixer | PHP 格式化和项目代码风格 |
| EditorConfig | 项目级缩进、换行和字符集 |

Intelephense 的基础功能可以免费使用，但其语言服务器不是开源软件，部分高级功能需要 Premium。PHP Companion 不强制依赖 Intelephense，禁用它后项目工作流仍可使用。

## 精简原则

本 Pack 不再安装 PHP Namespace Resolver、PHP DocBlocker、PHP Smart Files 或 PHPStan 扩展：前三者与 PHP Companion/Intelephense 的职责重叠；静态分析建议由项目中的 PHPStan/Psalm 和 CI 执行，避免扩展在大型项目中自动运行全量分析。

默认使用按需索引、粘贴预览并关闭实验重构。PHP CS Fixer 被设为 PHP 默认格式化器，但不会强制开启保存时格式化。

## 本地安装

```bash
pnpm package:all
code --install-extension php-companion-0.4.0.vsix
code --install-extension packages/php-companion-recommended-pack/php-companion-recommended-pack-0.4.0.vsix
```
