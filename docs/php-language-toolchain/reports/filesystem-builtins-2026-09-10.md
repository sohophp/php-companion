# 文件系统内建目录验收

日期：2026-09-10。范围：PHP 7.2–8.5 高频文件、路径和流函数。

## 已实现契约

- `file_get_contents`、`file_put_contents`、`fopen`、`fread`、`fwrite`/`fputs` 保留 `resource` 元数据及 `false` 失败返回。
- PHP 7 的 `file_get_contents` 第五参数和 `fwrite`/`fputs` 第三参数在传入时必须为 int；PHP 8 起通过 `?int ... = null` 表达官方可空边界。
- 文件/目录存在性和可读写检查、`filesize`、`basename`、`dirname`、`pathinfo`、`realpath` 与 `glob` 提供准确的成功/失败返回。
- `mkdir`、`unlink`、`rename` 与 `copy` 保留可选 stream context，并提供 bool 返回。
- `FILE_USE_INCLUDE_PATH`、`FILE_APPEND`、`LOCK_EX` 和 `PATHINFO_*` 常量进入相同内建文档，可补全和导航。

## 保守边界

目录只描述跨 PHP 7.2–8.5 可确认的静态契约。具体 stream wrapper、平台权限、网络读取和运行时 warning 不被提升为静态成功保证。`pathinfo` 保留 `array|string`，`glob` 保留 `list<string>|false`，读取内容保留 `string|false`。

## 当前验证

- language-spec 13 项测试通过，覆盖 PHP 7.4 与 PHP 8.0 长度、native type 和失败返回差异。
- Language Server 的项目语义用例验证重载、nullable 实参诊断、返回传播、函数和常量 Definition。
- 九套 PHP 7.2–8.5 生成 stub 均为 0 个 parser error。
- Winstar 规定的 PHP 8.5 wrapper 运行 Reflection 探针，逐项确认 21 个函数的参数、可选性和返回类型，以及八个常量值；`resource` 位置与 PHP 8.5 Reflection 的无原生类型结果一致。
- 打包 Extension Host fixture 已验证 `file_get_contents`、`file_put_contents`、`pathinfo` 与 `FILE_APPEND` 的真实编辑器导航。

数据来源：[PHP 文件系统函数](https://www.php.net/manual/en/ref.filesystem.php)、[file_get_contents](https://www.php.net/manual/en/function.file-get-contents.php)、[file_put_contents](https://www.php.net/manual/en/function.file-put-contents.php)、[fopen](https://www.php.net/manual/en/function.fopen.php)、[fread](https://www.php.net/manual/en/function.fread.php) 与 [fwrite](https://www.php.net/manual/en/function.fwrite.php)。

- `pnpm check` 通过：十五个组件 493/493、根扩展 33/33，合计 526/526；TypeScript、ESLint、三个 VSIX 构建与内容检查同时通过。
- `pnpm verify:packages` 通过：47 个 Changesets 形成十五个组件发布计划，十五个真实 tarball 在仓库外隔离安装运行通过。
- VS Code 1.137.0 纯净打包宿主与 Open Source Profile 均通过新增文件系统函数和常量导航断言，退出码均为 0。组合宿主仍记录 Symfony Language Tools 0.20.0 已知的关闭阶段 EPIPE/stream-destroyed 通知；功能断言与进程结果不受影响。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

公开 npm 与 Marketplace 发布未执行。
