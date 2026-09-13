# PHP Options/Info 环境与运行时目录报告

日期：2026-09-11。范围：补齐 Options/Info 中环境变量、包含文件、资源/进程信息、垃圾回收、CLI 标题、运行时输出、版本比较和 Deprecated 分组，并与已完成的运行时自省及配置目录组成按 PHP 版本选择的完整 Options/Info 基础目录。

## 已完成

- 新增 32 项函数：`assert`、`assert_options`、`cli_get_process_title`、`cli_set_process_title`、`dl`、六项 `gc_*`、`get_current_user`、`get_included_files`/`get_required_files`、`get_resources`、`getenv`、五项 `getmy*`/`getlastmod`、`getopt`、`getrusage`、`phpcredits`、`phpinfo`、`putenv`、`set_time_limit`、`sys_get_temp_dir`、`version_compare`、`zend_version`，以及 PHP 7 的两个 magic-quotes 查询接口。
- 新增 22 项版本化常量：八项 `INFO_*`、八项 `CREDITS_*` 和六项 `ASSERT_*`。`INFO_ALL`/`CREDITS_ALL` 使用官方规范值 -1，不固化 64 位运行时可能显示的无符号掩码；PHP 8.0 移除 `ASSERT_QUIET_EVAL`，`ASSERT_EXCEPTION` 同时从 6 改为 5。
- `getenv()` 精确返回 `array<string,string>`，指定变量名时返回 `string|false`；`get_resources()` 返回 `array<int,resource>`；included/required files 返回 `list<string>`；`getopt` 与 `getrusage` 保留结构和值失败分支。
- `version_compare` 无操作符时返回 `-1|0|1`；PHP 8 的操作符形式返回 bool，PHP 7 保留无效操作符可能返回 null 的实际边界。共享 semantic 安全精化现在允许数值字面量 Union 精化对应原生 int 分支，同时继续要求条件返回的每个分支都属于原生返回范围。
- `gc_status` 仅从 PHP 7.3 起生成；PHP 7.3–8.2 为四字段 shape，PHP 8.3+ 为十二字段 shape。`phpinfo` 与 `phpcredits` 从 PHP 8.2 起使用原生 `true` 返回。
- `assert_options` 从 PHP 8.3 标记弃用；两个 magic-quotes 查询从 PHP 7.4 标记弃用并在 PHP 8.0 移除。
- `zend_thread_id` 只有 ZTS 且 debug 编译同时启用时存在，不能由目标 PHP 版本独立决定，因此没有伪装成所有项目都可用的通用符号。

## 来源与运行时对照

- PHP 官方 [Options/Info 函数目录](https://www.php.net/manual/en/ref.info.php)、[`gc_status`](https://www.php.net/manual/en/function.gc-status.php)、[`getenv`](https://www.php.net/manual/en/function.getenv.php)、[`getopt`](https://www.php.net/manual/en/function.getopt.php)、[`version_compare`](https://www.php.net/manual/en/function.version-compare.php) 与 [`zend_thread_id`](https://www.php.net/manual/en/function.zend-thread-id.php) 页面用于目录、返回和可用性边界；逐函数链接已追加到 `packages/language-spec/SOURCES.md`。
- `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 对照函数存在性、参数名、原生类型和返回类型；运行时调用对照 `gc_status` shape、环境映射、资源键值类型、信息/Assertion 常量及 PHP 7/8 无效版本操作符行为。
- 九个 PHP 7.2–8.5 生成 stub 分别由 Tree-sitter PHP 解析，全部为零错误。

## 验证

- `pnpm check` 通过：十五个组件 514 项、根扩展 33 项，共 547 项测试；TypeScript、ESLint、三份 VSIX 打包和内容检查全部通过。一个覆盖大量上下文闭包分支的 stdio 用例在全量负载下为 5.036 秒，超过 Vitest 默认 5 秒；保持断言不变并与相邻同规模用例统一为 15 秒预算后，单独连续三次以 5.070、4.354、4.622 秒通过，全量 Language Server 119 项随后通过。
- `pnpm verify:packages` 在仓库外隔离消费者中成功安装并导入十五个真实 tarball。
- language-spec 23 项、semantic 230 项、Language Server 119 项通过；新增用例覆盖环境/资源集合、条件返回、GC 版本 shape、Deprecated 移除门槛及 Definition。
- PHP 8.5 项目运行时对 Extension Host fixture 执行语法检查，无语法错误。
- VS Code 1.137.0 的纯净 Profile 与 Open Source Profile 均使用同一主 VSIX 并以退出码 0 完成。Open Source Profile 验证 30 项 PHP 8.5 可用函数、21 项 PHP 8.5 可用常量以及条件返回 Signature Help；组合包含 TwigPlus 1.3.7、Symfony Language Tools 0.20.0/复核用 0.20.1、YAML 1.24.0、PHP CS Fixer 0.3.21、PHPUnit 3.9.40、PHP Debug 1.40.1 与 EditorConfig 0.18.2。测试运行器已关闭扩展自动更新，两套冻结 Profile 的文件哈希清单前后一致；Symfony 的真实项目与合成 fixture 边界见 [0.20.1 复核报告](symfony-language-tools-0.20.1-recheck-2026-09-12.md)。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `57263fef54ee4cb81a6910c8c89529b6d58dff9ae90469da7a7b7aed11c28465` |
| `php-companion-open-source-pack-0.4.5.vsix` | `fdc8b879416ae09f4f9ff4e2a5cffa990c1515c5111e200be3643361688d36c7` |
| `php-companion-recommended-pack-0.4.5.vsix` | `13f03d53c744a81b192c2cdf38aff63fdb7c0803f4afe33cb1f502c131a12fd1` |

## 精度边界

基础目录当前按 PHP 版本选择。`cli_*`、`dl` 和部分 Unix 进程身份函数还受 SAPI、操作系统或编译配置影响；它们作为 PHP API 可导航，但本轮不据此发布“目标运行环境必定可调用”的诊断。平台/SAPI 能力选择仍属于 P3 完整扩展能力目录和 F11–F12 系统矩阵范围。

公开 npm 与 VS Code Marketplace 发布未执行。
