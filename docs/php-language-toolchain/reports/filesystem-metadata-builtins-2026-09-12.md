# PHP Filesystem 元数据、权限与链接内建报告

日期：2026-09-12。范围：为 PHP 7.2–8.5 增加 33 项 Filesystem 元数据、权限、上传、缓存、磁盘空间、链接和临时文件函数，并验证结构化返回、参数版本边界、Signature Help、Definition 与真实打包 Extension Host。

## 已完成

- 新增 `chgrp`、`chmod`、`chown`、`clearstatcache`、`disk_free_space`、`disk_total_space`、`diskfreespace`、七项文件元数据读取、`filetype`、`is_executable`、`is_link`、上传文件检查/移动、`lchgrp`、`lchown`、四项链接 API、`stat`、`lstat`、realpath cache 两项 API、`rmdir`、`tempnam`、`touch` 与 `umask`。
- `stat` 与 `lstat` 返回完整的 13 个数值键和 13 个命名键 shape，并保留 `false`；磁盘空间、时间、owner/group/inode/permission/type、link target 与临时文件同样保留真实失败分支。
- `realpath_cache_get` 返回 `array<string, entry-shape>`；实际运行时核对确认 entry 含 `key`、`is_dir`、`realpath`、`expires`，且本机 PHP 7.2/7.4 的 `key` 为 float、PHP 8.5 为 int，因此按版本生成。
- PHP 7 保留 `$mode`、`$path`、`$new_path`、`$dirname`、`$time` 等历史参数名；PHP 8 使用 `$permissions`、`$filename`、`$from`、`$to`、`$directory`、`$mtime` 等当前名称与原生类型。

## 来源与运行时对照

- PHP 官方 [Filesystem 函数目录](https://www.php.net/manual/en/ref.filesystem.php)、[`stat`](https://www.php.net/manual/en/function.stat.php)、[`realpath_cache_get`](https://www.php.net/manual/en/function.realpath-cache-get.php)与[`realpath_cache_size`](https://www.php.net/manual/en/function.realpath-cache-size.php)用于核对目录、返回字段与失败契约；逐函数链接已写入 `packages/language-spec/SOURCES.md`。
- PHP 源码 PHP 8.0–8.5 的 `ext/standard/basic_functions.stub.php` 用于核对原生签名、alias 与条件编译声明。
- `/usr/bin/php72`、`php74` 与项目 PHP 8.5 wrapper 的 Reflection 对照全部 33 项函数、参数名、可选性和原生类型；真实临时文件对照确认 `stat/lstat` 的键集合及 realpath cache entry 的值类型。

## 验证

- `pnpm check` 通过：十五个组件 532 项、根扩展 33 项，共 565 项；TypeScript、ESLint、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 在仓库外隔离消费者中安装并导入十五个真实 tarball。
- language-spec 与 Language Server 测试覆盖完整 33 项目录、`stat/lstat` shape、realpath cache shape、失败返回、PHP 7/8 参数名、返回传播与虚拟内建 Definition。
- PHP 8.5 项目 runtime wrapper 对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 使用同一主 VSIX，并以退出码 0 完成；真实请求验证全部 33 项函数的 Definition，以及 stat、realpath cache、磁盘空间、链接和临时文件返回签名。Open Source Profile 扩展目录运行前后的全文件 SHA-256 清单一致。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `adb9c7a08b07eda34634146df293791eaecfb31fe6ae0590099d5c60cb78f109` |
| `php-companion-open-source-pack-0.4.5.vsix` | `79023e6ab3ab19773cc344a9ed8d2a9d90d340b3543b68c2c250d1f5e2c3dca3` |
| `php-companion-recommended-pack-0.4.5.vsix` | `bd207d02c88f150a42da1ff37327e163e6fbc4df550f7e34a7d5adec0af2687f` |

## 精度边界

`lchown`/`lchgrp`、链接和 `touch` 受平台或编译能力限制；上传 API 的成功还依赖真实 HTTP POST upload 身份，owner/group、权限和文件系统字段受 OS、权限与文件系统影响。版本化基础目录只表达静态 PHP 契约，不把这些环境条件猜成诊断。`stat/lstat` 保留官方稳定键集合，但部分字段在某些平台可返回占位值。

公开 npm 与 VS Code Marketplace 发布未执行。
