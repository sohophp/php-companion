# 控制条件中的原生 never 调用验收

日期：2026-09-08。范围：控制语句入口必经表达式中的原生 `never` 调用。

## 精确边界

Parser 现在为 `if`、`while`、`switch` 的 condition，`for` 的 initialize/condition，
以及 `foreach` 的 iterable 记录必经完整范围。该范围内唯一解析、实参兼容且原生
返回 `never` 的调用会使整个控制语句终止，因此其后语句可发布
`php.control-flow.unreachable`。

表达式内部仍遵守求值规则：`&&`、`||`、`and`、`or`、`??` 右侧不保证执行；三元
结果、match arm、nullsafe 参数和 nullsafe 方法自身也不保证执行。`for` update 与
`do...while` condition 不保证在循环入口执行，保持静默。左操作数、三元/match 的
condition 和 nullsafe receiver 属于必经位置。PHP 8.1+、完整索引、唯一声明、原生
返回类型和实参兼容门禁不变。

## 验证

- Parser 41 项、Semantic 180 项、Language Server 57 项测试通过。
- stdio 正例覆盖 if condition，反例覆盖 condition 的短路右侧；Parser 另覆盖 while、
  switch、for、foreach、do...while 与短路左右侧的精确范围。
- 相关 TypeScript、ESLint、`git diff --check`、主 VSIX 构建与内容校验通过。
- 15 个组件 tarball 从隔离 consumer 安装通过。
- 实际 Open Source Profile 冻结不可达集合增至八条，新增范围严格为
  `unreachableAfterNeverCondition();`；短路条件右侧反例保持可达，宿主退出码 0。

主 VSIX：`php-companion-0.4.5.vsix`；SHA-256：
`024bd1012e5a826c860b73bb6de12453baff5f53b84d4c0c8755968a3cefd2b0`。
本轮没有重建两个 Pack，也没有公开发布。

完整宿主日志位于 `/tmp/php-never-conditions-vscode-logs`。AssertionError、ENOENT、
File Modified Since、write EPIPE 和 unknown error 均为零。PHP 格式化继续由项目锁定
的 PHP CS Fixer 3.95.22 经 PHP 8.5 runtime 执行；单次未复现不关闭外部 Symfony
插件此前存在的间歇问题。
