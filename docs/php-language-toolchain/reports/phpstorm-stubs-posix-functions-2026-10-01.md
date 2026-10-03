# phpstorm-stubs POSIX 函数接入

固定上游修订为 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681`。`scripts/sync-phpstorm-posix.mjs` 核对上游 41 个函数名，并从本机 PHP 8.1.34／8.5.9 反射生成 37／41 个函数签名快照；重跑脚本可检查已生成目录是否漂移。不复制上游说明文本，来源与许可证沿现有记录。

PHP 7.2–8.2 使用 37 个历史函数；PHP 8.3 起加入 `posix_eaccess`、`posix_fpathconf`、`posix_pathconf`、`posix_sysconf` 并为 `posix_getrlimit` 增加可选 `resource` 参数。边界同时核对 [PHP 8.3 新函数手册](https://www.php.net/manual/en/migration83.new-functions.php)与 [getrlimit 变更记录](https://www.php.net/manual/en/function.posix-getrlimit.php)。PHP 7 使用 PHPDoc 类型；本机 PHP 7.2／7.4 未加载 POSIX，旧版运行时签名尚无本机反射证据。

扩展接入现有项目运行时过滤与配置枚举。平台相关的 POSIX 常量尚待运行时数值接入，本记录只证明函数范围。

验证：

- 语言规范 125 项通过。
- PHP 7.2／8.5 真实 stdio LSP 两项通过，覆盖版本化定义、getrlimit 签名、新函数在旧版缺席及扩展关闭后的撤回。
- PHP 7.2／8.5 无扩展配置下生成声明语法检查通过；生成目录复核和修改文件 ESLint 通过。
- 固定上游与本机 PHP 8.5 运行时函数审计覆盖 41/41，缺口 0。
- Winstar 独立 Composer 项目只读 100 轮热补全：总 P95 23.43 ms，首次 55.94 ms；两组候选缺失和 incomplete 次数均为 0。此为协议查询耗时，不代表真实可见弹窗等待。

源码未打包、提交、推送或更新 Profile。真实 WSL 编辑器验收待用户实际使用。

后续平台常量已接入，见 [POSIX 运行时常量记录](phpstorm-stubs-posix-constants-2026-10-01.md)；本报告仍保留函数阶段证据。
