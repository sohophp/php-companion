# 字符串内建符号验收

日期：2026-09-08。范围：高频 PHP 字符串函数、PHP 7.2–8.5 版本差异与全局函数重载选择。

## 支持范围

- 已审计目录覆盖长度、截取、大小写敏感/不敏感位置查找、trim、大小写转换、replace、explode、implode/join、sprintf/vsprintf、HTML 转义与反转义、换行、折行、单词首字母、str_split、填充、反转、六类比较和 strtr。
- `str_contains`、`str_starts_with`、`str_ends_with` 只在 PHP 8.0+ 出现。`substr`、`explode`、`sprintf`/`vsprintf` 和 `str_split` 在 PHP 7.x 保留可失败 Union，PHP 8.0 起使用不会返回 false 的成功类型。
- PHP 7.x 的 strpos 家族仍接受 string 或 int needle；PHP 8.0 起只接受 string。HTML 转义函数从 PHP 8.1 起使用 `ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401` 默认 flags。
- `implode`、`join` 与 `strtr` 使用独立关联重载。PHP 7.4 仍包含已弃用的反向 implode/join 参数顺序，PHP 8.0 起移除；不会用两个独立 Union 参数错误接受一组不存在的组合。

## 重载语义

全局函数 Signature Help 现在返回同名的全部声明候选，并复用方法重载的参数数量、命名和已证明实参类型排序。编辑中的不完整调用保留仍可能成立的候选；完整调用只有唯一最佳候选时，才绑定到其来源声明并用于返回传播和参数诊断。

对 PHP 8.0 目标调用旧式 `implode(['a'], '-')` 时，Signature Help 保留规范 `implode(string $separator, array $array)` 供修正，同时参数诊断分别报告 list 不能传给 string、string 不能传给 array。无法唯一绑定的调用保持 unknown。

## 精准边界

本轮只加入逐项核对的高频 string 扩展函数。mbstring、iconv、PCRE 的其余函数、locale 相关变体和未审计 string API 不由相似名称或当前运行时猜测生成。

PHP 8.2 的空字符串 `str_split` 值行为变化不改变静态返回类型，因此目录不伪造额外类型分支。函数抛出的 ValueError 目前属于异常流后续能力，不据此声明 `never`。

## 验证

- language-spec 10 项、phpdoc 12 项、parser 41 项、project 6 项、index 7 项、type-system 17 项、interop 3 项、semantic-provider 5 项、semantic-provider-host 4 项、framework-symfony 20 项、framework-doctrine 2 项、semantic 180 项、refactor 6 项、Language Server 65 项、testkit 5 项全部通过；十五个组件共 383 项，加仓库既有 30 项共 413 项。
- 版本测试覆盖 PHP 7.4、8.0 和 8.1；重载测试覆盖 canonical/reverse implode、array/string strtr、PHP 8 移除旧重载、失败返回变化及错位参数诊断。
- 全部 PHP 7.2–8.5 生成 stub 均为 0 个 parser error；PHP 8.5 目录包含 64 个类型和 226 个 callable。
- TypeScript、ESLint 与 `git diff --check` 通过；十五个组件 tarball 从仓库外隔离 consumer 安装运行通过。
- 最终主 VSIX 在隔离 VS Code 1.136.1 Extension Host 中退出码为 0；真实编辑请求验证字符串函数 Definition 进入只读内建文档，并分别唯一选择 canonical implode 与 array strtr 重载。DatePeriod、Generator 及其余完整 Host 用例同时通过。
- 主 VSIX 内容校验通过，SHA-256 为 `d398c7eb1dbd8c0e7cecc3112d3090f37d41015025d0508bedfe3fce42a6d6ef`。
- 宿主日志未发现 AssertionError、超时、保存冲突、ENOENT、EPIPE 或 stream-destroyed。

宿主日志位于 `/tmp/php-string-builtins-vscode-logs-20260908-1824`。本轮只重建主扩展 VSIX；Open Source Pack 与 Recommended Pack 仅执行既有产物内容校验，没有重建，也没有公开发布。

## 审计来源

- [PHP string 函数索引](https://www.php.net/manual/en/ref.strings.php)
- [substr](https://www.php.net/manual/en/function.substr.php)、[strpos](https://www.php.net/manual/en/function.strpos.php)、[str_contains](https://www.php.net/manual/en/function.str-contains.php)
- [str_replace](https://www.php.net/manual/en/function.str-replace.php)、[explode](https://www.php.net/manual/en/function.explode.php)、[implode](https://www.php.net/manual/en/function.implode.php)
- [sprintf](https://www.php.net/manual/en/function.sprintf.php)、[htmlspecialchars](https://www.php.net/manual/en/function.htmlspecialchars.php)
- [str_split](https://www.php.net/manual/en/function.str-split.php)、[strtr](https://www.php.net/manual/en/function.strtr.php)
