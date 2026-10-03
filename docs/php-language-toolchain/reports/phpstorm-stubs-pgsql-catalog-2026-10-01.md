# PostgreSQL phpstorm-stubs 目录与运行时快照

- 固定来源：JetBrains/phpstorm-stubs `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681`，`pgsql/pgsql.php` 与 `pgsql/pgsql_c.php`，Apache-2.0。
- `scripts/sync-phpstorm-pgsql.mjs` 从上游提取 127 个 `pg_*` 函数名、81 个 `PGSQL_*` 常量名和 `PgSql\Connection`、`PgSql\Result`、`PgSql\Lob` 三个类的存在性；本机 PHP 8.1、8.2、8.4、8.5 反射生成签名与常量快照。`--write` 更新目录，省略时验证目录未漂移。
- 本机 PHP 8.1/8.2 各导出 114 个函数、69 个常量；8.4/8.5 各导出 121 个函数、73 个常量。8.4/8.5 比 8.1/8.2 多出的七个函数中，`pg_set_error_context_visibility` 从 PHP 8.3 开始，其余六个在 8.4 才可用。8.3 同时新增三个 `PGSQL_SHOW_CONTEXT_*` 常量。`PGSQL_ERRORS_SQLSTATE` 在本机 8.1/8.2 缺席、8.4/8.5 出现；它依赖 libpq 能力，无运行时事实时不对旧版猜测可用性。
- 上游另有 `pg_pipeline_*`、`pg_set_chunked_rows_size`、`pg_close_stmt` 等本机 PHP 8.5 未导出的声明，不能直接将上游全集作为候选。`PGSQL_LIBPQ_VERSION`、`PGSQL_LIBPQ_VERSION_STR`、`PGSQL_ERRORS_SQLSTATE` 与补丁版本相关的 `PGSQL_TRACE_SUPPRESS_TIMESTAMPS` 在缺少项目运行时事实时不固定猜测；运行时可用时经探测提供真实值。
- PHP 7.2/7.4 CLI 未安装 PostgreSQL 扩展，无法用本机反射核准其完整签名。但 PHP 官方 [7.2.34 源码](https://github.com/php/php-src/blob/PHP-7.2.34/ext/pgsql/pgsql.c)和[7.4.33 源码](https://github.com/php/php-src/blob/PHP-7.4.33/ext/pgsql/pgsql.c)的扩展函数表均为 114 个名称，与当前旧版声明逐项一致。PHP 7 的声明从 8.1 快照降级为资源返回类型和无原生参数类型；`pg_pconnect` 的 PHP 8 新增 `flags` 参数已排除。旧版 `pg_connect` 的废弃多参数形式未作为普通候选加入，保留常用连接字符串签名。源码 arginfo 与实际参数解析在个别函数上不一致，不能把它等同于运行时反射；参数默认值及重载仍需可加载旧版扩展的运行时复核。
- `auditedPgsqlStub` 已接入通用 PHP 内置声明和扩展禁用设置。本机四个已安装版本的函数名、参数名、参数数目和必填数对比运行时反射，均为零缺失和零不匹配。标准 LSP 验证了 `pg_connect`、`PgSql\Connection` 和运行时提供的 `PGSQL_LIBPQ_VERSION` 可跳转，未由运行时导出的 `pg_query` 不可跳转，禁用 PgSQL 后可用符号也撤回并产生扩展不可用诊断。运行时探测与内置 URI 同时传递项目 PHP 实际导出的函数及常量，避免展示条件编译而缺席的函数。PHP 8.5 的完整 121 个函数与 73 项常量快照传递后 URI 长度 5271，往返恢复全部条目。

验证：固定上游目录同步检查、语言规范 115 项测试、运行时探测 23 项测试、定向 stdio LSP 测试、语言规范／运行时探测／语言服务器构建、改动文件 ESLint、四个可用 PHP 版本的运行时签名审计，以及四版本实际 CLI 探测通过。全量内置声明解析在 PHP 7.2／7.4／8.1／8.3／8.5 下均无语法树错误，PostgreSQL 函数分别为 114／114／114／115／121；实际 PHP 8.5 运行时的 73 项常量全部可解析。真实 VS Code/WSL 候选列表未验收；本轮不打包或更新 Profile。
