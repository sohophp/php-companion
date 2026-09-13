# PHP Filesystem 完整内建目录报告

日期：2026-09-12。范围：完成 PHP 7.2–8.5 Filesystem 官方可调用目录，并验证流、CSV/INI、锁、seek/stat、同步、process-file、临时流、版本边界、Signature Help、Definition 与真实打包 Extension Host。

## 已完成

- 官方目录的 callable union 共 82 项：PHP 7.2–7.4 各生成 80 项，PHP 8.0 生成 79 项，PHP 8.1–8.5 各生成 81 项。手册的 `delete` 只是指向 `unlink`/`unset` 的索引项，未伪造同名函数。
- 本轮补齐 26 项流与解析 API：`feof`、`fflush`、`fgetc`、`fgetcsv`、`fgets`、`fgetss`、`file`、`flock`、`fnmatch`、`fpassthru`、`fputcsv`、`fscanf`、`fseek`、`fstat`、`fsync`、`fdatasync`、`ftell`、`ftruncate`、两项 INI parser、`pclose`、`popen`、`readfile`、`rewind`、`set_file_buffer` 与 `tmpfile`；其中版本不共存项按目标版本筛除。
- `fgetcsv` 返回 `list<string|null>|false`，`file` 返回 `list<string>|false`；`fscanf` 区分无引用输出的数组返回和带引用输出的计数返回，`fstat` 复用完整 26 键 stat shape，process/file handle 保留 resource 与失败分支。
- 增加跨版本稳定的 `FILE_*`、`LOCK_*`、`SEEK_*` 和 `INI_SCANNER_*` 常量；依赖构建或平台的 `FNM_*` 常量不冒充通用符号。
- PHP 7.2 的 `fgetss` 不标弃用，PHP 7.3–7.4 标记弃用，PHP 8 起移除；`fsync`/`fdatasync` 与 `fputcsv` 的 EOL 参数从 PHP 8.1 起生成。PHP 8.4 起省略 CSV escape 的调用弃用已记录为调用约束，签名继续保留运行时仍接受的默认值。

## 来源与运行时对照

- PHP 官方 [Filesystem 函数目录](https://www.php.net/manual/en/ref.filesystem.php)用于逐项建立完整性断言；[`fgetcsv`](https://www.php.net/manual/en/function.fgetcsv.php)、[`fputcsv`](https://www.php.net/manual/en/function.fputcsv.php)与[`fsync`](https://www.php.net/manual/en/function.fsync.php)用于核对返回、参数和版本边界。逐函数链接已写入 `packages/language-spec/SOURCES.md`。
- PHP 源码 PHP 8.0–8.5 的 `ext/standard/basic_functions.stub.php` 用于核对 resource PHPDoc、引用参数、alias、原生类型与条件编译声明。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84` 与项目 PHP 8.5 wrapper 的 Reflection 对照全部本轮函数的参数名、可选性、返回类型和可用性。

## 验证

- `pnpm check` 通过：十五个组件 534 项、根扩展 33 项，共 567 项；TypeScript、ESLint、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 在最终源码上从仓库外隔离消费者安装并导入十五个真实 tarball。
- language-spec 的官方目录完整性断言覆盖每个目标版本；Language Server 测试覆盖 list/shape/resource/引用返回、PHP 7/8 参数名、PHP 8.1 可用性、Signature Help 和虚拟内建 Definition。
- PHP 8.5 项目 runtime wrapper 对 Extension Host fixture 执行语法检查，无语法错误。
- 最终主 VSIX 在 VS Code 1.137.0 纯净 Profile 与 Open Source Profile 中均以退出码 0 完成；真实请求验证 PHP 8.5 可用的 25 项 API 和 7 项代表常量的 Definition，以及 CSV、file list、fstat shape、popen 与 tmpfile 签名；PHP 7 专属 `fgetss` 由生成与 Language Server 测试覆盖。Open Source Profile 扩展目录运行前后的全文件 SHA-256 清单一致。
- Open Source Profile 仍记录冻结的 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上退出后的 `EPIPE`/`ERR_STREAM_DESTROYED`；真实 Winstar 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `731c63b6dc06faedeec70d6143f4c0a3a93e2c40a6373699e5ff28c7c19a7940` |
| `php-companion-open-source-pack-0.4.5.vsix` | `a1b891c659dd6b0bfa550355e17a99742971fef69f90f83a472c660598c2c6b2` |
| `php-companion-recommended-pack-0.4.5.vsix` | `091da2c139ac79478bc31b2bb1c39f860ff96bb80a8058f06facd114f5220f5d` |

## 精度边界

`fnmatch` 与相关 flags 受平台/构建影响，stream 操作还受 wrapper 能力、阻塞模式、权限、底层文件系统和设备语义影响；静态目录不把运行环境能力猜成诊断。PHP 8.4 的 CSV escape 弃用针对省略实参这一调用形状，当前通用 builtin deprecation 元数据不能把它精确标到单次调用，因此以版本文档边界保留，避免错误废弃整个函数。

公开 npm 与 VS Code Marketplace 发布未执行。
