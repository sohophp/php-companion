# Password、Hash 与安全随机数内建目录验收

日期：2026-09-10

## 实现范围

`@php-companion/language-spec` 现在按 PHP 7.2–8.5 生成 Password Hashing、Hash/HMAC 与密码学安全随机数的高频契约。目录覆盖 `password_hash`、`password_verify`、`password_needs_rehash`、`password_get_info`、PHP 7.4+ 的 `password_algos`、四个常用 Hash/HMAC 入口、算法列表、`hash_equals`、`random_bytes` 与 `random_int`。

PHP 7 的 `password_hash`、`hash` 与 `hash_hmac` 保留 `false` 失败返回；PHP 8 相应函数按异常边界收窄为 `string`。`hash_file` 与 `hash_hmac_file` 的文件失败返回在所有目标版本保持 `string|false`。`hash`/`hash_file` 的 `options` 参数只在 PHP 8.1+ 生成。

`PASSWORD_DEFAULT` 与 `PASSWORD_BCRYPT` 在 PHP 7.2/7.3 使用整数身份，在 PHP 7.4+ 使用 `2y` 字符串身份。`password_get_info()` 的结构化 `algo` 字段同步采用 PHP 7.2/7.3 的整数与 PHP 7.4+ 的 `string|null`。`PASSWORD_BCRYPT_DEFAULT_COST` 在 PHP 8.4 从 10 切换为 12。

Argon2i/Argon2id 常量取决于 PHP 的编译选项和密码提供者，不能只凭语言版本证明存在。本轮有意不把它们加入版本基础目录，待扩展/能力选择器存在后再按运行时能力提供。

## 对照证据

使用 `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84` 与 `php85` 的 Reflection 对照函数参数、返回类型和常量。运行时进一步确认 bcrypt 的 `password_get_info()` 在 PHP 7.2 返回整数算法 `1`，PHP 7.4+ 返回字符串 `2y`，并确认默认成本在 PHP 8.4 变为 12。静态来源记录在 `packages/language-spec/SOURCES.md`，均指向 PHP 官方手册。

## 自动验证

- language-spec 16 项通过，覆盖版本存在性、返回、参数和常量边界。
- Language Server 112 项通过，覆盖签名选择、返回传播、options 参数数量及虚拟内建 Definition。
- `BuiltinConsumer.php` 增加真实 Password、Hash 与随机数调用，打包 Extension Host 会验证函数/常量导航及 PHP 8.1+ Hash Signature Help。
- 九个目标版本的完整生成 stub 均经共享 Tree-sitter parser 验证为 0 个解析错误；PHP 8.5 runtime 对 Extension Host fixture 执行 `-l` 通过。
- `pnpm check` 通过：十五个组件 499 项、根扩展 33 项，共 532 项测试；TypeScript、ESLint、三份 VSIX 打包和内容校验同时通过。
- `pnpm verify:packages` 从仓库外隔离消费者安装并执行十五个真实组件 tarball，全部通过。
- 同一最终主 VSIX 在 VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 中依次运行；函数/常量 Definition、Hash Signature Help 及既有完整编辑器断言均通过，两次宿主退出码均为 0。

## 当前候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `1309b1a6aa5ae78ee47f0edf0d30256d6d75a194df78af1ccbf7aa8c109f31ce` |
| `php-companion-open-source-pack-0.4.5.vsix` | `890328435200a85a506bd940446a204875d7b16e20a3f4654e5e0d9a10c99aa2` |
| `php-companion-recommended-pack-0.4.5.vsix` | `5a16e598cd564374fef35ff2c334167d831776e44ab682cc777a5e6820b6fc2c` |

Open Source Profile 使用 TwigPlus 1.3.7、Symfony Language Tools 0.20.0、Red Hat YAML 1.24.0、PHP Debug 1.40.1、PHPUnit & Pest Test Explorer 3.9.40、PHP CS Fixer 0.3.21 和 EditorConfig 0.18.2。Symfony Language Tools 在关闭阶段再次记录已知的间歇性 `EPIPE` / `ERR_STREAM_DESTROYED`；断言与宿主仍以退出码 0 完成，PHP Companion 自身的流销毁错误没有复现。

公开 npm 与 VS Code Marketplace 发布未执行。
