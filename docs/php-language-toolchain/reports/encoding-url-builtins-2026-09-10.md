# 序列化与 URL 内建目录验收

日期：2026-09-10。范围：PHP 7.2–8.5 的序列化、Base64、十六进制及 URL 高频函数。

## 已实现契约

- `serialize`/`unserialize` 保留 mixed 输入/输出；`unserialize` 的合法序列化 false 与失败 false 无法仅从签名区分，因此不伪造更窄结果。
- `base64_decode` 与 `hex2bin` 保留 `string|false`，编码函数保持 string。
- `parse_url($url)` 返回 `array|false`；提供 component 时返回 `array|string|int|false|null`，保留端口 int、缺失 component null 和严重错误 false。
- `http_build_query` 在 PHP 8 使用 `array|object` 和 nullable separator；RFC 1738/3986 常量可补全与导航。
- `get_headers` 在 PHP 7 使用 `int $format`，PHP 8 起使用 `bool $associative`，并保留 `array|false` 与 stream context。

## 保守边界

`parse_url` 的 component 是动态 int 时不会臆测为 string 或 int；当前返回完整可行 Union。`unserialize` 不根据运行时字符串内容猜测对象身份。URL 解析行为不被当作 URL 安全验证。

## 当前验证

- language-spec 14 项测试通过，覆盖 PHP 7.4/8.0 签名差异、失败返回、重载和常量。
- Language Server 项目测试验证返回类型、`get_headers` 参数名称/类型切换，以及函数和常量 Definition。
- 九套 PHP 7.2–8.5 stub 均为 0 个 parser error。
- PHP 8.5 Reflection 探针核对十一项函数的参数、默认值和返回类型，以及十个 URL/查询常量值。
- 打包 Extension Host fixture 已验证序列化、Base64、URL 解析、查询构建和 `PHP_QUERY_RFC3986` 的真实编辑器导航。

数据来源：[serialize](https://www.php.net/manual/en/function.serialize.php)、[unserialize](https://www.php.net/manual/en/function.unserialize.php)、[base64_decode](https://www.php.net/manual/en/function.base64-decode.php)、[parse_url](https://www.php.net/manual/en/function.parse-url.php)、[URL 常量](https://www.php.net/manual/en/url.constants.php)与[get_headers](https://www.php.net/manual/en/function.get-headers.php)。

## 封板证据

- `pnpm check` 通过：加入后续 PDO 回归后十五个组件 497 项测试与根包 33 项测试，共 530 项；TypeScript、ESLint、三份 VSIX 构建和包内容校验均通过。生命周期修复后再次执行同一 530 项测试并通过。
- `pnpm verify:packages` 通过：49 个 Changeset 形成 15 个组件发布计划，十五个真实 tarball 在仓库外隔离安装运行通过。
- 纯净隔离配置的已打包 VSIX 在 VS Code 1.137.0 Extension Host 中通过，并以退出码 0 完成。
- 初次 Open Source Profile 运行在关闭阶段暴露流销毁竞态；修正 PHP Companion 的 LanguageClient 清理顺序后，同一后续候选在纯净与 Open Source Profile 均以退出码 0 完成，PHP Companion 自身的 `ERR_STREAM_DESTROYED` 不再复现。Symfony Language Tools 0.20.0 的退出 EPIPE 在重复运行中仍会间歇出现，但未阻止断言或正常退出，继续作为第三方限制记录。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `338af4796bbca7f94f98552c32792b905a52f805b7b083e2983c5360ce4495c3` |
| `php-companion-open-source-pack-0.4.5.vsix` | `6e94147c76605a18de7606ee9e916eb1f5c5028808c3419cd6482e87e655b1e1` |
| `php-companion-recommended-pack-0.4.5.vsix` | `4cc01d830efefec46fc0408b171214d5098fb0b14d99837623933dd5ea3bfa6d` |

公开 npm 与 Marketplace 发布未执行。
