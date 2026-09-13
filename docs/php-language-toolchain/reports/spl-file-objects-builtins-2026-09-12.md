# PHP SPL 文件对象内建报告

日期：2026-09-12。范围：为 PHP 7.2–8.5 增加 `SplFileInfo`、`SplFileObject` 与 `SplTempFileObject`，验证构造器与方法 Signature Help、继承成员、Definition、返回传播、版本边界和最终打包 Extension Host。

## 结果

- `SplFileInfo` 覆盖官方公开方法：路径、名称、类型、权限、owner/group/inode、时间、大小、真实路径、文件/目录/link 判定、信息类配置及 `openFile()`。
- `SplFileObject` 覆盖四个稳定 flag 常量及公开读写、CSV、锁、seek、stat、flush、truncate、迭代方法；`SplTempFileObject` 使用独立 `maxMemory` 构造器并继承文件对象成员。
- 文件元数据和读取保留真实 `false` 分支；`fstat()` 使用完整数字键与命名键 shape，`getCsvControl()` 为固定三元素 shape，CSV 行保留 `list<string|null>|false`。
- `current()` 因 flags 可能返回普通行、CSV 行或 `false`，以 `string|list<string|null>|false` 表示；`openFile()` 返回经局部赋值后继续提供 `SplFileObject` 成员补全和导航。
- PHP 7 保留历史参数名及 `fgetss()`，PHP 7.3–7.4 标记其弃用，PHP 8 移除；PHP 8 使用新参数名，PHP 8.1 增加 `fputcsv()` 的 EOL，PHP 8.5 将 `fwrite()` 长度改为 `?int $length = null`。
- 最终宿主检查同时发现并修复两处旧测试光标定位问题，以及 PHP 8 下宽原生 Union 覆盖 `count_chars()`/`str_word_count()` 模式相关返回的问题。

## 来源与版本审计

- PHP 官方 [`SplFileInfo`](https://www.php.net/manual/en/class.splfileinfo.php)、[`SplFileObject`](https://www.php.net/manual/en/class.splfileobject.php)和[`SplTempFileObject`](https://www.php.net/manual/en/class.spltempfileobject.php)类页用于建立公开成员集合。
- [`SplFileInfo::openFile`](https://www.php.net/manual/en/splfileinfo.openfile.php)、[`SplFileObject::fgetcsv`](https://www.php.net/manual/en/splfileobject.fgetcsv.php)、[`fputcsv`](https://www.php.net/manual/en/splfileobject.fputcsv.php)、[`fwrite`](https://www.php.net/manual/en/splfileobject.fwrite.php)、[`getCsvControl`](https://www.php.net/manual/en/splfileobject.getcsvcontrol.php)及[`SplTempFileObject::__construct`](https://www.php.net/manual/en/spltempfileobject.construct.php)用于核对返回、默认值和版本变化；链接已登记在 `packages/language-spec/SOURCES.md`。
- 本机 Reflection 审计覆盖 `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84` 和项目 PHP 8.5 runtime wrapper。PHP 7.4 新增公开 `__debugInfo()`，PHP 8.0 是公开参数名/类型和 `fgetss()` 移除的主要边界，PHP 8.5 的公开差异为 nullable `fwrite()` 长度。

## 验证

- `pnpm check` 通过：十五个组件 540 项、根扩展 33 项，共 573 项；TypeScript、ESLint、三份 VSIX 打包与内容检查全部通过。
- `pnpm verify:packages` 从仓库外隔离消费者安装并导入十五个最终组件 tarball。
- language-spec 对全部目标版本断言三类、继承关系、关键返回与版本门槛；Language Server 测试覆盖构造器、继承方法、CSV shape、`openFile()` 返回传播、Definition 与 PHP 7/8/8.1/8.5 Signature Help。
- PHP 8.5 runtime wrapper 对 Extension Host fixture 执行语法检查，无语法错误。
- 最终 `php-companion-0.4.5.vsix` 在 VS Code 1.137.0 纯净 Profile 与 Open Source Profile 均以退出码 0 完成。开源 Profile 运行前后 1,371 个文件的 SHA-256 清单一致。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d4a50c5d2278c098c0aa42a63fdffc80fbdb6f9e9afc8f09348b461db864f898` |
| `php-companion-open-source-pack-0.4.5.vsix` | `d2720de3090263fdc439abc7bf6aa8858ef6eafa188f55bc34e880fb01deda4b` |
| `php-companion-recommended-pack-0.4.5.vsix` | `ad6338642c4446abf1070f41e3b688dad10b1afac3ece938970589c9ceba5b27` |

## 精度边界

文件存在、权限、锁、编码和 I/O 成败由运行环境决定，静态规格不会执行文件操作。`SplFileInfo` 可配置自定义 info/file class，当前返回类型保守保持官方基类；`SplFileObject::current()` 的具体分支取决于运行时 flags，因此在未证明 flags 时保留完整 Union。PHP 8.4 CSV escape 默认值弃用属于省略参数的调用形状，当前声明不会错误弃用整个方法。

Open Source Profile 的无 `vendor/` 合成 fixture 在结束 Symfony Language Tools 0.20.1 子进程时仍记录第三方 `EPIPE`/`ERR_STREAM_DESTROYED`，但宿主和全部功能断言退出码为 0；依赖完整的 Winstar 0.20.1 source-index `ready` 证据见 [Symfony Language Tools 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

公开 npm 与 VS Code Marketplace 发布未执行。
