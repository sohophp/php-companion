# PHP Program Execution 内建目录报告

日期：2026-09-12。范围：为 PHP 7.2–8.5 增加完整 Program Execution 函数目录，并验证命令、引用输出、process descriptor、状态 shape、版本门槛、Signature Help、Definition 与真实打包 Extension Host。

## 已完成

- 覆盖 Program Execution 目录全部 11 项函数：`escapeshellarg`、`escapeshellcmd`、`exec`、`passthru`、`proc_close`、`proc_get_status`、`proc_nice`、`proc_open`、`proc_terminate`、`shell_exec` 与 `system`。
- `exec` 保留 `array<int,string>` output 与 int exit-code 引用，`system`/`passthru` 保留 exit-code 引用；PHP 7 使用 `$return_value`/`$cmd`，PHP 8 使用 `$result_code`/`$command`。
- `proc_open` 的 command、descriptor spec、pipe output、cwd、environment 与 options 均有独立类型；返回保留 `resource|false`，process 参数通过 PHPDoc 保留 resource。
- PHP 7.2–7.3 的 `proc_open` command 为 string，PHP 7.4 起为 `array|string`；PHP 8 使用原生 Union 和 nullable 参数。
- `passthru` 的实际返回保留 `false|null`；PHP 8.0–8.1 原生 `?bool` 由安全 PHPDoc 收窄，PHP 8.2 起使用原生 `false|null`。
- `proc_get_status` 返回固定 shape；PHP 8.3 起增加必填 `cached:bool`，与 exit-code 缓存语义一致。

## 来源与运行时对照

- PHP 官方 [Program Execution 函数目录](https://www.php.net/manual/en/ref.exec.php)、[`exec`](https://www.php.net/manual/en/function.exec.php)、[`proc_open`](https://www.php.net/manual/en/function.proc-open.php)与[`proc_get_status`](https://www.php.net/manual/en/function.proc-get-status.php)用于核对完整目录、引用输出、command 门槛和状态字段；逐函数链接已写入 `packages/language-spec/SOURCES.md`。
- PHP 源码 PHP 8.0–8.5 的 `ext/standard/basic_functions.stub.php` 用于核对原生签名、PHPDoc 返回与条件编译声明。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 对照了全部函数、参数名、可选性与原生类型；实际子进程对照确认 PHP 7.2 拒绝 array command、PHP 7.4 接受，以及 PHP 8.3+ 状态增加 `cached` 并缓存 exit code。
- 九个 PHP 7.2–8.5 生成 stub 均由 Tree-sitter PHP 零错误解析；顶层函数声明数依次为 442、450、451、448、450、452、453、461、465。

## 验证

- `pnpm check` 通过：十五个组件 530 项、根扩展 33 项，共 563 项；TypeScript、ESLint、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中安装并导入十五个真实 tarball。
- language-spec 与 Language Server 新增两层测试，覆盖完整目录、引用参数、descriptor/status shape、7.4 array command、8.2 passthru 返回、8.3 cached 字段、返回传播与虚拟内建 Definition。
- PHP 8.5 项目运行时对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 使用同一主 VSIX，并以退出码 0 完成；真实请求验证全部 11 项函数的 Definition，以及 exec、passthru、proc_open、proc_get_status 与 shell_exec 返回签名。Open Source Profile 扩展目录运行前后的全文件 SHA-256 清单一致。
- Open Source Profile 仍记录冻结的 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上的既有 `DriverSuspension`；真实 Winstar 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `1c811d6d131ccbac36f2774cecf717bdc7c9417535cecc5cc70c1e65df341246` |
| `php-companion-open-source-pack-0.4.5.vsix` | `c313c6422d8776ac4d716847d7049d8f95d0b39b4718a4b1fb26d8a86ab38931` |
| `php-companion-recommended-pack-0.4.5.vsix` | `7ac84f8f489db4c284676ab803de197b7915705ce26e2a11eef11a7099ed102a` |

## 精度边界

`proc_nice()` 受操作系统能力限制，所有进程函数还受 `disable_functions`、执行权限、shell、工作目录和环境影响；本轮提供静态 PHP 契约，不宣称环境可用性诊断。Descriptor spec 支持平台和 PHP 版本提供的扩展选项，因此以精确的外层 map、resource 或带位置字段的内部 shape 表达，不把 descriptor kind 封闭为固定字符串字面量。夹具只参与静态分析，不执行任何外部命令或创建进程。

公开 npm 与 VS Code Marketplace 发布未执行。
