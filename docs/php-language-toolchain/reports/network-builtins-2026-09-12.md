# PHP Network 内建目录报告

日期：2026-09-12。范围：为 PHP 7.2–8.5 增加完整 Network 函数目录和稳定 DNS 常量，并验证版本化签名、返回 shape、重载、Signature Help、Definition 与真实打包 Extension Host。

## 已完成

- 覆盖 Network 目录全部 37 项函数，包括 DNS 查询、hostname/service/protocol 查询、socket stream 建立、HTTP header、response code、cookie、IP 转换、网络接口与 syslog API。
- 增加 `DNS_A`、`DNS_NS`、`DNS_CNAME`、`DNS_SOA`、`DNS_PTR`、`DNS_HINFO`、`DNS_CAA`、`DNS_MX`、`DNS_TXT`、`DNS_SRV`、`DNS_NAPTR`、`DNS_AAAA`、`DNS_A6`、`DNS_ANY` 与 `DNS_ALL`。
- `headers_list()` 与 last-response-header API 保留字符串 list；DNS 结果、网络接口与 `request_parse_body()` 保留嵌套 array shape；`fsockopen()`/`pfsockopen()` 保留 `resource|false`。
- `http_response_code()` 使用 getter 与 setter 重载，分别保留 `int|false` 与 `int|true`；cookie 的整数过期时间与 options array 使用独立重载。
- `net_get_interfaces()` 从 PHP 7.3 起生成；`http_clear_last_response_headers()`、`http_get_last_response_headers()` 与 `request_parse_body()` 从 PHP 8.4 起生成。
- `closelog()`、`openlog()`、`syslog()` 从 PHP 8.2 收窄为 `true`，`long2ip()` 从 PHP 8.4 收窄为 `string`，cookie options 从 PHP 8.5 增加 `partitioned`，`socket_set_timeout()` 在 PHP 8.5 标记弃用。

## 来源与运行时对照

- PHP 官方 [Network 函数目录](https://www.php.net/manual/en/ref.network.php)与[网络常量](https://www.php.net/manual/en/network.constants.php)用于核对完整目录和稳定常量；逐函数链接已写入 `packages/language-spec/SOURCES.md`。
- PHP 源码 PHP 8.0、8.2、8.4 与 8.5 的 `ext/standard/basic_functions.stub.php` 及 SAPI header 声明用于核对原生签名、返回迁移、options 与弃用元数据。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 对照了函数存在性、参数名、可选性和原生类型；运行时结果还用于核对网络接口嵌套 shape。
- 九个 PHP 7.2–8.5 生成 stub 均由 Tree-sitter PHP 零错误解析；顶层函数声明数依次为 422、430、431、428、430、432、433、441、445。计数包含 response-code 与 cookie 的关联重载。

## 验证

- `pnpm check` 通过：十五个组件 526 项、根扩展 33 项，共 559 项；TypeScript、ESLint、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中安装并导入十五个真实 tarball。
- language-spec 与 Language Server 新增两层测试，覆盖完整目录、15 项常量、PHP 7.3/8.2/8.4/8.5 门槛、返回 shape、重载选择与虚拟内建 Definition。
- PHP 8.5 项目运行时对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 使用同一主 VSIX，并以退出码 0 完成；真实请求验证全部 37 项函数、15 项 DNS 常量的 Definition，以及 list、request shape、hostname、IP 和 syslog 返回签名。Open Source Profile 扩展目录运行前后的全文件 SHA-256 清单一致。
- 宿主日志中的 server code 70、Rename/Move 拒绝来自既有故障恢复与保守拒绝测试。Open Source Profile 另记录冻结的 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上的既有 `DriverSuspension`、`EPIPE` 与 destroyed-stream 日志；真实 Winstar 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `073b49dfd9964c1080fc463120fc669fe66f426b9b606df1205b67062de041ac` |
| `php-companion-open-source-pack-0.4.5.vsix` | `e0189cc8c2bded90878672bf32955be6db1b96341e2384da5f9af310871b94cf` |
| `php-companion-recommended-pack-0.4.5.vsix` | `441256220d13dc8d2a283eecb8d93cf86c11e62afa37ac1491faf82541773e57` |

## 精度边界

`LOG_*` 常量值依赖操作系统，基础 stub 只按目标 PHP 版本选择，不能准确表达平台矩阵，因此本轮不生成固定 `LOG_*` 值。部分网络函数仍可能受平台、SAPI、编译选项或运行时配置影响；本轮提供其 PHP 版本化静态契约，不宣称环境可用性诊断。目录不会发起 DNS、socket、header、cookie、request-body 或 syslog 操作。

公开 npm 与 VS Code Marketplace 发布未执行。
