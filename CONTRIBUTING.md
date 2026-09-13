# Contributing

感谢参与 PHP Companion。提交变更前请先在 Issue 中说明较大的功能设计；小型修复可以直接提交 Pull Request。

自研语言工具链的架构、开发顺序和最终验收见 [开发计划](docs/php-language-toolchain/README.md)。用户确认该计划后，按其中的执行规则开展已授权的本地开发，无需为开始实施另行创建 Issue；对外发布仍单独确认。

## 开发环境

- Node.js 22
- pnpm 11.8.0
- VS Code 1.100.0 或更高版本

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm package:all
pnpm verify:vsix
```

Linux 上还应运行 `pnpm test:extension` 和 `pnpm test:extension:packaged`。验证完整免费组合时，把 `PHP_COMPANION_TEST_EXTENSIONS_DIR` 指向只安装 Open Source Pack 成员的隔离目录，并通过 `PHP_COMPANION_PHP_EXECUTABLE`、`PHP_COMPANION_PHP_CS_FIXER`、`PHP_COMPANION_PHPUNIT_EXECUTABLE` 指定项目锁定的 PHP 运行时、formatter 和 PHPUnit，再运行 `pnpm test:extension:open-source-profile`。已有安全包装器时也可直接设置 `PHP_COMPANION_FORMATTER_EXECUTABLE`。涉及版本探测或 PHP 语法的修改，应通过 `PHP_COMPANION_TEST_PHP_BINARIES` 运行真实进程测试。

提交不得包含 Marketplace token、工作区私密配置、生成的 VSIX、`dist` 或依赖目录。新增用户可见文本应同时维护英文和简体中文本地化。
