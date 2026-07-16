# Contributing

感谢参与 PHP Companion。提交变更前请先在 Issue 中说明较大的功能设计；小型修复可以直接提交 Pull Request。

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

Linux 上还应运行 `pnpm test:extension`。涉及版本探测或 PHP 语法的修改，应通过 `PHP_COMPANION_TEST_PHP_BINARIES` 运行真实进程测试。

提交不得包含 Marketplace token、工作区私密配置、生成的 VSIX、`dist` 或依赖目录。新增用户可见文本应同时维护英文和简体中文本地化。
