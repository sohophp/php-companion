# 嵌套原生 never 调用终止流验收

日期：2026-09-08。范围：必经表达式位置中的原生 `never` 调用。

## 精确边界

Parser 为调用记录其所在的完整 expression range，但仅在该调用从表达式入口必然执行
时提供事实。赋值右值、普通外层调用参数、数组或普通表达式嵌套，以及 `&&`、`||`、
`??` 的左操作数属于支持范围。语言服务器把完整表达式视为终止点，因此其后语句可
发布 `php.control-flow.unreachable`。

短路运算右操作数、三元结果分支、match arm、nullsafe 调用的参数和 nullsafe 方法
自身不保证执行，均不提供终止事实。三元/match 的条件以及 nullsafe 链的接收者仍是
必经位置。语义层仍要求完整索引、唯一函数或方法、原生 `never`、实参兼容和 PHP
8.1+；PHPDoc-only、重复、未解析或不兼容目标保持静默。多个 never 调用落在同一
表达式时按完整范围去重。

## 验证

- Parser 40 项、Semantic 180 项、Language Server 57 项测试通过。
- stdio 覆盖赋值、参数、短路左右操作数，以及既有 PHPDoc、重复、不兼容反例。
- 相关 TypeScript、ESLint、Extension Host TypeScript 与 `git diff --check` 通过。
- 15 个组件 tarball 从隔离 consumer 安装通过；主 VSIX 构建与内容校验通过。
- 实际 Open Source Profile 冻结不可达集合增至七条，新增范围严格为
  `unreachableAfterNestedNeverCall();`；条件短路右侧反例保持可达，宿主退出码 0。

主 VSIX：`php-companion-0.4.5.vsix`；SHA-256：
`4b7d688e496a20f76cf8d5f2c35582d2ec87bf5ac5beef24b23b4007886d3aa6`。
本轮没有重建两个 Pack，也没有公开发布。

完整宿主日志位于 `/tmp/php-nested-never-vscode-logs`。AssertionError、ENOENT、
File Modified Since、write EPIPE 和 unknown error 均为零。本次格式化由项目锁定的
PHP CS Fixer 3.95.22 经 PHP 8.5 runtime 执行，没有使用扩展内置旧 PHAR，也没有
设置忽略 PHP 版本检查的环境变量。单次未复现不关闭外部 Symfony 插件的间歇问题。
