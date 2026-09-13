# PHP Strings 完整内建目录报告

日期：2026-09-12。范围：完成 PHP 7.2–8.5 Strings 官方可调用目录，并验证稳定常量、结构化返回、模式相关重载、弃用与移除边界、Signature Help、Definition 及真实打包 Extension Host。

## 已完成

- PHP 官方 Strings 目录的 callable union 共 103 项；`echo` 与 `print` 是语言结构，不伪造为函数。PHP 7.2–8.2 各生成 98 项，PHP 8.3–8.5 各生成 100 项。
- 补齐转换、字符统计、CRC/crypt、格式化输出、HTML translation table、locale、摘要、语音比较、quoted-printable、CSV、token/search/span、substring replacement 和 UTF-8 兼容 API，并增加 `HTML_*`、`ENT_*` 与 `STR_PAD_*` 稳定常量。
- `count_chars()` 按 mode 0–2 返回 `array<int,int>`、mode 3–4 返回 `string`；`str_word_count()` 按 mode 返回 `int`、`list<string>` 或 `array<int,string>`。调用点直接整数、浮点、布尔及安全无转义字符串字面量只在重载排序中保留，不改变一般表达式推断。
- `str_getcsv()` 返回 `list<string|null>`，`localeconv()` 返回完整命名 shape，`substr_replace()` 区分 string 与 array 输入输出，格式化流函数保留 resource 参数。
- PHP 7.4 精确标记 `convert_cyr_string`、`hebrevc`、`money_format` 弃用，PHP 8 起移除；PHP 8.2 起标记 `utf8_encode`/`utf8_decode` 弃用；PHP 8.3 起提供 `str_increment`/`str_decrement` 及 `strrchr` 的 `before_needle` 参数。

## 来源

- PHP 官方 [Strings 函数目录](https://www.php.net/manual/en/ref.strings.php)用于逐项建立完整性断言；[`count_chars`](https://www.php.net/manual/en/function.count-chars.php)、[`str_word_count`](https://www.php.net/manual/en/function.str-word-count.php)、[`str_getcsv`](https://www.php.net/manual/en/function.str-getcsv.php)、[`localeconv`](https://www.php.net/manual/en/function.localeconv.php)及[`substr_replace`](https://www.php.net/manual/en/function.substr-replace.php)用于核对返回形状和重载。逐函数链接已写入 `packages/language-spec/SOURCES.md`。
- PHP 7.2、7.4、8.1、8.2、8.4 与项目 PHP 8.5 runtime 的 Reflection 对照用于核对可用性、参数名、可选性与返回类型；PHP 官方迁移记录用于核对弃用、移除和新增边界。

## 验证

- `pnpm check` 通过：十五个组件 536 项、根扩展 33 项，共 569 项；TypeScript、ESLint、三份 VSIX 打包与内容检查全部通过。
- `pnpm verify:packages` 从仓库外隔离消费者安装并导入十五个真实 tarball。
- language-spec 对每个目标版本逐项断言 callable union；semantic 回归验证直接十进制、十六进制和常量字面量重载；Language Server 回归验证完整目录、结构化返回及 PHP 7.4/8.0/8.2/8.3 边界。
- PHP 8.5 runtime wrapper 对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 打包宿主均以退出码 0 完成；真实编辑器请求覆盖 PHP 8.5 中本轮补齐的 57 项函数、4 项代表常量和 11 个关键签名。Open Source Profile 运行前后第三方扩展目录的全文件 SHA-256 清单一致。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `eab91a83a07820ddfbfabdf8c61c69b91cc39f46aca9d776847e146027042fbc` |
| `php-companion-open-source-pack-0.4.5.vsix` | `c7fe55f9ae14b72dc2c4a64da657a111e06db7bf75d1587b6cf568ed2c7e2bfb` |
| `php-companion-recommended-pack-0.4.5.vsix` | `9d8c0fe114dabc49f4bf4f02ff3f00d2d189e515235171f12299cf913b1b9472` |

## 精度边界

locale 结果取决于进程 locale，`crypt` 算法与 salt 支持取决于运行环境，`nl_langinfo` 受平台能力影响；静态规格只提供 PHP API 导航与类型，不把运行环境能力猜成诊断。PHP 8.2 的 UTF-8 兼容函数弃用按整个声明标记；调用方应迁移到明确编码转换方案。

Open Source Profile 仍记录冻结的 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上退出后的 `EPIPE`/`ERR_STREAM_DESTROYED`；真实 Winstar 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

公开 npm 与 VS Code Marketplace 发布未执行。
