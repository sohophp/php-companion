# Open Source Profile 安装与运行时核验（Linux / WSL）

日期：2026-09-06
VS Code：1.136.1 Linux x64，运行于 Windows WSL RockyLinux 8
目标项目：Winstar，PHP 8.5.9

## 实际安装清单

以下扩展由 VS Code CLI 安装到全新的隔离扩展目录；随后安装本地构建的 Companion、TwigPlus 与 Open Source Pack VSIX。最终清单不含 Intelephense 或其他通用 PHP Language Server。

| 扩展 | 实际版本 | VS Code 门槛 | 许可证据 |
| --- | --- | --- | --- |
| `sohophp.php-companion` | 0.4.5 本地 VSIX | ^1.100.0 | MIT |
| `sohophp.twig-plus` | 1.3.7 本地 VSIX | ^1.90.0 | MIT |
| `redhat.vscode-yaml` | 1.24.0 | ^1.63.0 | MIT |
| `xdebug.php-debug` | 1.40.1 | ^1.66.1 | MIT |
| `recca0120.vscode-phpunit` | 3.9.40 | ^1.88.0 | MIT |
| `junstyle.php-cs-fixer` | 0.3.21 | ^1.56.0 | VSIX `LICENSE.txt` 为 MIT；manifest 的 `license` 字段为 ISC，元数据不一致 |
| `editorconfig.editorconfig` | 0.18.2 | ^1.100.0 | MIT |
| `sohophp.php-companion-open-source-pack` | 0.4.5 本地 VSIX | ^1.100.0 | MIT |

隔离安装命令使用测试版 VS Code 的 `bin/code --extensions-dir ... --user-data-dir ... --install-extension ... --force`。全部八项安装成功，`--list-extensions --show-versions` 与上表一致。

## PHP 格式化运行时结论

`junstyle.php-cs-fixer` 0.3.21 自带 PHAR 在 PHP 8.5.9 下拒绝启动，输出的支持上限为 PHP 8.3。该内置 PHAR 不能作为 Winstar 的格式化引擎。

Winstar 项目锁定的 PHP CS Fixer 3.95.22 已通过 `bin/php-runtime` 在 PHP 8.5.9 运行。本地 `.vscode/php-cs-fixer-project` 包装器使用 `@PSR12` 对临时 PHP 文件执行真实修复成功；工作区把 `php-cs-fixer.executablePath` 指向该包装器，并关闭插件自己的 `onsave`，由 VS Code `editor.formatOnSave` 作为唯一可选保存入口。包装器模板记录在 Winstar `bin/README.md`，不要求提交整个个人 `.vscode` 目录。

## 已通过与剩余范围

- Companion 源码版和打包 VSIX 的完整 Extension Host 用例均通过；打包版使用隔离用户与扩展目录。
- Open Source Pack 的全部成员可在当前 VS Code/WSL 环境安装，清单没有第二个 PHP LS。
- 整套外部扩展同时启用时，打包 Companion 的完整 Extension Host 用例通过；PHP CS Fixer 经项目 PHP 8.5 包装器返回并应用格式化编辑且可单步撤销，TwigPlus 和 Red Hat YAML 分别提供 Twig/YAML 格式化。
- PHP Debug 已经 Winstar `bin/php-runtime` 启动并结束真实 launch 会话，运行时为 PHP 8.5.9 / Xdebug 3.5.3。PHPUnit 扩展已经同一 PHP 入口和项目 PHPUnit 9.6.36 执行选定测试文件，门禁以测试写出的哨兵文件确认执行结果。
- PHPUnit 扩展 3.9.40 在 Companion 测试快速重命名后删除临时文件时记录了未处理的 `ENOENT`，但未使 Extension Host 或用例失败。真实项目正常重命名会保留目标文件；仍把快速删除列为组合限制，后续需复测或向上游反馈。
- VS Code 内建 JSON formatter 已实际返回编辑；EditorConfig 已从 fixture 的 `.editorconfig` 把 PHP 编辑器缩进应用为三个空格。CRLF、复杂规则优先级和 Windows/macOS 平台仍待后续矩阵，不由本次 Linux/WSL 结果代替。

组合冒烟命令：

```bash
PHP_COMPANION_TEST_EXTENSIONS_DIR=/path/to/isolated/extensions \
PHP_COMPANION_PHP_EXECUTABLE=/path/to/project/bin/php-runtime \
PHP_COMPANION_PHP_CS_FIXER=/path/to/project/vendor/bin/php-cs-fixer \
PHP_COMPANION_PHPUNIT_EXECUTABLE=/path/to/project/vendor/bin/phpunit \
pnpm test:extension:open-source-profile
```

门禁会在隔离 profile 内临时生成 formatter 包装器；也可通过 `PHP_COMPANION_FORMATTER_EXECUTABLE` 显式提供现成包装器。
