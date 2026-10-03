# PostgreSQL 条件声明源码接入

日期：2026-10-01。固定上游修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681`。

## 纠正原六项分类

之前覆盖审计把六个本机未导出的名称合并为条件构建项。核对 [PHP 8.3 官方声明](https://github.com/php/php-src/blob/PHP-8.3/ext/pgsql/pgsql.stub.php)与 [PHP 8.5 官方声明](https://github.com/php/php-src/blob/PHP-8.5/ext/pgsql/pgsql.stub.php)后，四个 `pg_enter_pipeline_mode`、`pg_exit_pipeline_mode`、`pg_pipeline_status`、`pg_pipeline_sync` 在这两个版本的官方声明中都不存在；官方函数索引也未列出它们。这四项不能仅因 phpstorm-stubs 列出名称就加入候选，审计改列上游差异。此结论限于核对版本，不推断未来版本。

其余两项有正式签名和构建条件：`pg_set_chunked_rows_size` 从 PHP 8.4，`pg_close_stmt` 从 PHP 8.5；官方源码分别以 `HAVE_PG_SET_CHUNKED_ROWS_SIZE`、`HAVE_PG_CLOSE_STMT` 门控。`pg_close_stmt` 要求 libpq 17，参见 [PHP 手册](https://www.php.net/manual/en/function.pg-close-stmt.php)。

## 实现

- 同步脚本从固定上游生成两项结构化签名，与官方声明逐项核对。参数名、参数类型及联合返回保持原样，没有复制说明文本。
- 只有项目运行时明确导出函数，且目标 PHP 版本达到边界，才补入候选目录。没有事实、撤回导出列表或关闭扩展时缺席。
- 未来本机快照若新增这两项，也不重复生成，仍要求运行时可用性。
- 覆盖审计对 PostgreSQL 使用相同运行时门控生成器；未支持的实际导出函数仍失败。

## 本轮证据与待验证

language-spec 129/129 通过，typecheck 与相关 ESLint 通过；固定上游生成复核通过。正反例覆盖 PHP 7.2/8.1/8.3 的缺席、8.4 的 chunked API、8.5 的两项签名、四个上游差异的缺席、运行时撤回、扩展关闭和内置 URI 往返。

本机 PHP 8.5 未导出这两个函数，不能记作真实函数调用验收。新增 stdio 用例已通过独立源码 bundle，覆盖版本、Definition、Signature Help 与运行时撤回；同批两个字面量回归也通过，共 3/3、9.05 秒。bundle 显式将 language-spec 解析到当前源码并传入扩展实际使用的 WASM 路径，输出在 `/tmp`，没有重写完整 stdio 进程正在使用的包构建。运行时切换使用现有 `phpCompanion/phpExtensionAvailability` 协议，并等待新诊断发布后核对旧定义缺席。

根目录常规 esbuild 仍消费包的 dist，不能用它证明尚未重建的声明改动；此前该入口测试发现 8.4 新函数缺席，已区分为旧依赖构建。最终独立源码日志 `/tmp/sophp-pgsql-conditional-source-lsp.log`。待完整 stdio 进程结束后，仍需构建 language-spec 并验证标准 package 入口及审计负例，不能把源码 bundle 的结果等同于那一步。未打包、提交、推送或更新 Profile。

后续标准入口复核已完成：language-spec 构建通过；条件声明及原 Ctype/BCMath/iconv/PgSQL 目录用例 2/2 通过，9.05 秒，日志 `/tmp/sophp-pgsql-conditional-standard-lsp.log`。固定目录同步和本机 PHP 8.5 审计退出码 0；模拟导出两个正式 API 的审计也退出码 0，模拟导出 upstream-only pipeline 名称仍正确失败、退出码 1。这两个模拟用例只证明生成器与门禁，不等同于新版 libpq 的真实调用。两项正式条件签名的源码、标准协议和审计门禁已验证，真实函数执行及 WSL UI 保持单列。
