# JSON 内建目录验收

日期：2026-09-10。范围：PHP 7.2–8.5 的高频 JSON 函数、选项常量和错误常量。

## 已实现契约

- `json_encode` 保留 `string|false` 失败返回，PHP 8+ 使用 `mixed` 参数和原生 Union 返回。
- `json_decode` 保留 PHP 7.2 起 nullable associative 参数；PHP 8+ 使用当前原生四参数签名和 `mixed` 返回。
- `json_last_error` 与 `json_last_error_msg` 在所有目标版本可导航并提供精确返回类型。
- `JSON_THROW_ON_ERROR` 仅从 PHP 7.3 出现，`JSON_ERROR_NON_BACKED_ENUM` 仅从 PHP 8.1 出现。
- `json_validate(string $json, int $depth = 512, int $flags = 0): bool` 仅从 PHP 8.3 出现。
- 共同的 JSON 选项和错误常量使用 PHP 源码中的稳定整数值，不用占位值污染 Hover 或常量传播。

## 保守边界

本次只加入已经由 PHP 官方手册和 php-src 核对的 JSON 核心项。flag 组合引发的条件异常或返回相关性没有被猜测成静态保证；例如传入动态 flags 时，`json_encode` 仍保留 `false`。

## 验证

- language-spec 12 项测试覆盖 PHP 7.2、7.3、8.0、8.1、8.2 与 8.3 边界。
- Language Server 108 项测试通过，其中新增端到端语义用例验证返回类型、命名参数、函数/常量 Definition 和版本门控。
- 九套 PHP 7.2–8.5 生成 stub 均由项目 parser 复核为 0 个语法错误。
- 打包 Extension Host fixture 已从真实 PHP 文件导航 `json_encode`、`json_decode`、`json_validate` 与 `JSON_THROW_ON_ERROR` 到只读内建文档。

数据来源：[PHP JSON 函数](https://www.php.net/manual/en/ref.json.php)、[JSON 常量](https://www.php.net/manual/en/json.constants.php)、[json_encode](https://www.php.net/manual/en/function.json-encode.php)、[json_decode](https://www.php.net/manual/en/function.json-decode.php)、[json_validate](https://www.php.net/manual/en/function.json-validate.php) 与 [php-src JSON stub](https://github.com/php/php-src/blob/master/ext/json/json.stub.php)。

- `pnpm check` 通过：十五个组件 491/491、根扩展 33/33，合计 524/524；TypeScript、ESLint、三个 VSIX 构建与内容检查同时通过。
- `pnpm verify:packages` 通过：46 个 Changesets 形成十五个组件发布计划，十五个真实 tarball 在仓库外隔离安装运行通过。
- VS Code 1.137.0 纯净打包宿主与 Open Source Profile 均通过新增 JSON 函数和常量导航断言，退出码均为 0。组合宿主仍记录 Symfony Language Tools 0.20.0 已知的关闭阶段 EPIPE/stream-destroyed 通知；功能断言与进程结果不受影响。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

公开 npm 与 Marketplace 发布未执行。
