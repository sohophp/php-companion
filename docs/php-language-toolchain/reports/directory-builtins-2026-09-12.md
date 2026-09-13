# PHP Directory 内建目录报告

日期：2026-09-12。范围：为 PHP 7.2–8.5 增加完整 Directory 函数、常量和类型目录，并验证版本化参数、资源与失败返回、成员、Signature Help、Definition 与真实打包 Extension Host。

## 已完成

- 覆盖 Directory 目录全部 9 项函数：`chdir`、`chroot`、`closedir`、`dir`、`getcwd`、`opendir`、`readdir`、`rewinddir` 与 `scandir`。
- 增加 `SCANDIR_SORT_ASCENDING=0`、`SCANDIR_SORT_DESCENDING=1` 与 `SCANDIR_SORT_NONE=2`。
- `opendir()` 保留 `resource|false`，`dir()` 保留 `Directory|false`，`getcwd()`/`readdir()` 保留 `string|false`，`scandir()` 精确为 `list<string>|false`。
- `Directory::$path` 表示为 `string`，`Directory::$handle` 通过 PHPDoc 保留 `resource`；`close()`、`rewind()` 与 `read()` 进入成员导航和签名传播。
- PHP 7 使用实际 Reflection 参数名 `opendir($path)` 与 `scandir($dir)`，且三个对象方法保留历史可选 handle 参数；PHP 8 使用 `$directory` 并移除对象方法参数。
- PHP 8.1 起生成 readonly `path`/`handle` 属性，PHP 8.5 起将 `Directory` 标记为 final。

## 来源与运行时对照

- PHP 官方 [Directory 函数目录](https://www.php.net/manual/en/ref.dir.php)、[Directory 常量](https://www.php.net/manual/en/dir.constants.php)与 [`Directory` 类型](https://www.php.net/manual/en/class.directory.php)用于核对完整目录、返回和成员；逐函数与方法链接已写入 `packages/language-spec/SOURCES.md`。
- PHP 源码 PHP 8.0、8.1、8.4 与 8.5 的 `ext/standard/basic_functions.stub.php` 和 `ext/standard/dir.stub.php` 用于核对原生签名、属性、tentative return 与 PHP 8.5 final 边界。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 对照了函数参数、可选性、返回、类属性与方法；实际 `dir()` 对象对照确认 `path` 为 string、`handle` 为 stream resource。
- 九个 PHP 7.2–8.5 生成 stub 均由 Tree-sitter PHP 零错误解析；顶层函数声明数依次为 431、439、440、437、439、441、442、450、454。

## 验证

- `pnpm check` 通过：十五个组件 528 项、根扩展 33 项，共 561 项；TypeScript、ESLint、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中安装并导入十五个真实 tarball。
- language-spec 与 Language Server 新增两层测试，覆盖完整目录、版本参数名、PHP 8.1/8.5 类型边界、list/resource/failure 返回、对象成员与虚拟内建 Definition。
- PHP 8.5 项目运行时对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 使用同一主 VSIX，并以退出码 0 完成；真实请求验证 9 项函数、3 项常量及 `Directory` 五个属性/方法成员的 Definition，以及 `dir`、`scandir` 与 `read` 返回签名。Open Source Profile 扩展目录运行前后的全文件 SHA-256 清单一致。
- Open Source Profile 仍记录冻结的 Symfony Language Tools 0.20.0 在无 `vendor/` 合成 fixture 上的既有 `DriverSuspension`；真实 Winstar 0.20.1 复核见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d8618ee9bbd7aac05ac1b30b33ef61091bd7758e06ec6aed55f4d245f22c3fc0` |
| `php-companion-open-source-pack-0.4.5.vsix` | `8acb9d9b94927847a5caa8e628076a3ac2118d06b354717cfc13bc85d5e15ad6` |
| `php-companion-recommended-pack-0.4.5.vsix` | `94dd1b3ff3d687bef63102cc0caa204134afa0c53342980a1e8039b0cd0117f8` |

## 精度边界

`chroot()` 受操作系统、线程安全构建、SAPI 与运行时权限约束；本轮提供其静态 PHP 契约，不宣称环境可用性诊断。`DIRECTORY_SEPARATOR`、`PATH_SEPARATOR` 及 `GLOB_*` 值存在操作系统、C 库或编译能力差异，其中 GLOB 值在所审计 Linux PHP 8.5 运行时也发生变化，因此不作为仅按 PHP 目标版本选择的固定常量生成。目录不会执行切换目录、chroot、打开或遍历目录等运行时操作。

公开 npm 与 VS Code Marketplace 发布未执行。
