# mbstring 内建目录验收

日期：2026-09-13。范围：PHP 7.2–8.5 的 mbstring 函数、常量、参数、返回结构和版本边界。

## 已实现

- 独立 `mbstring.ts` 组件生成完整版本化目录：PHP 7.2 为 72 项、PHP 7.4 为 73 项、PHP 8.0–8.2 为 59 项、PHP 8.3 为 60 项、PHP 8.4–8.5 为 65 项。
- PHP 7 保留运行时 arginfo 参数名和 14 个无下划线 mbregex 兼容别名；PHP 8 使用官方原生参数及联合返回类型。
- `mb_str_split()`/`mb_list_encodings()`/`mb_encoding_aliases()` 使用 list 返回，`mb_ereg_search_pos()` 使用整数 position pair，regex registers 保留字符串或失败元素。
- 常量按版本生成：case-fold/simple 常量从 PHP 7.3 起可用，`MB_ONIGURUMA_VERSION` 从 7.4 起可用，`MB_OVERLOAD_*` 在 PHP 8.0 移除。
- 函数边界覆盖 PHP 7.4 `mb_str_split()`、PHP 8.0 旧别名移除、PHP 8.2 `mb_get_info()` 的 null 返回、PHP 8.3 `mb_str_pad()`，以及 PHP 8.4 `mb_ucfirst()`、`mb_lcfirst()`、`mb_trim()`、`mb_ltrim()`、`mb_rtrim()`。

## 依据

PHP 8.0–8.5 逐版本核对 php-src `ext/mbstring/mbstring.stub.php`；PHP 7.2–7.4 核对对应 `mbstring.c`、mbregex 注册表和运行时反射。本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 的函数集合逐项反向比较，生成目录无漏项、误加项或重复声明；本机没有 PHP 7.3/8.0，其边界由官方源码、手册和相邻版本交叉确认。逐项入口记录在 `packages/language-spec/SOURCES.md`。

## 验证

- `pnpm check` 通过：language-spec 46 项、semantic 238 项、language-server 142 项；十五个组件共 568 项，根扩展 33 项，合计 601 项。TypeScript、ESLint、全部组件/根测试、三份 VSIX 打包和内容检查均通过。
- `pnpm verify:packages` 通过：十五个组件 tarball 均从隔离消费者安装并验证。
- PHP 8.5 fixture lint、Extension Host TypeScript 编译通过。VS Code 1.137.0 的纯净 packaged Profile 与含七项第三方能力的 Open Source Profile 均以退出码 0 完成；`mb_str_split()`、`mb_trim()`、`mb_strlen()` 与 `mb_ereg_search_pos()` 的真实 Definition/Signature Help 请求通过。最终日志分别保存在 `/tmp/php-companion-mbstring-final-pure-logs-20260913-0848` 与 `/tmp/php-companion-mbstring-final-profile-logs-20260913-0856`。
- Open Source Profile 使用冻结的 1,370 个第三方插件文件，运行前后 SHA-256 清单完全一致。
- 主扩展 VSIX SHA-256：`0bb79fad70de973219bc3dc42a6f743e633cef9e43cb3d04d4b31f393f49bbdd`。
- Open Source Pack VSIX SHA-256：`327f7559073a7293cab35a86fefcc4fc993c2b114777642e66ffbe9edeec22c5`。
- Recommended Pack VSIX SHA-256：`7792d649fb8b9bf48d86f8b99be6e38f7ad982b278ffe948c0ff7c8685d86500`。

## 边界

mbstring 本身是可选 PHP 扩展，mbregex 还可在编译时关闭。当前版本化内建文档尚未按项目实际扩展清单裁剪，因此目录表达“安装对应能力后的 API”，不证明目标运行时一定加载 mbstring 或 mbregex。运行时扩展发现与项目级符号裁剪留给后续组件。

公开 npm 与 VS Code Marketplace 发布未执行。
