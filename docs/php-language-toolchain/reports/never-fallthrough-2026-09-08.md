# 原生 never 正常结束路径验收

日期：2026-09-08。范围：PHP 8.1+ 原生 `never` 函数与方法的函数体结束诊断。

## 精确边界

`php.never.fallthrough` 只在有界语法控制流证明存在正常到达函数体末尾的路径时
发布。支持空函数体、完整或缺失分支、try/catch/finally、含 default 的 switch、
动态循环、恒真循环及 break。所有已证明终止的分支不会报告。

普通未知调用可能抛异常或不返回，因此保持 unknown；只有完整项目索引中唯一解析、
实参兼容且原生返回 `never` 的独立调用才能证明终止。抽象声明、goto/continue、
未支持语句和超过 100,000 节点或 256 层的分析均保持静默。显式 `return` 沿用
`php.return.type-mismatch`，避免同一错误出现两条诊断。

## 验证

- 语言服务器 56 项测试通过，覆盖空体、完整/不完整条件、动态与恒真循环、未知调用、
  已证明 never 调用、抽象方法及 PHP 8.0 关闭规则。
- 语义组件 180 项测试通过，并明确覆盖 `return;` 到 `never` 的类型冲突。
- 相关 TypeScript、ESLint、`git diff --check`、VSIX 内容校验通过。
- 15 个 monorepo 组件均从 tarball 在隔离 consumer 中成功安装，保持独立发布能力。
- 实际 Open Source Profile 完整宿主通过；冻结诊断集新增且只新增
  `invalidNeverFallthrough` 对应的一条 `php.never.fallthrough`，普通未知调用未误报。

主 VSIX：`php-companion-0.4.5.vsix`；SHA-256：
`964d51e157b88ade5af8bd7e26b6938eb09c7b30ac1eddccdbd9142df98763e1`。
本轮没有重建两个 Pack，也没有公开发布。

通过运行的完整 VS Code 日志位于 `/tmp/php-never-declaration-vscode-logs-pass`。
AssertionError、ENOENT、File Modified Since、write EPIPE 和 unknown error 均为零。
第一次宿主运行在新增断言前失败，因为随开源 Profile 安装的 PHP CS Fixer 版本只声明
支持到 PHP 8.3；测试随后使用显式设置 `PHP_CS_FIXER_IGNORE_ENV=1` 的临时包装器，仍由
项目 PHP 8.5 runtime 执行同一 PHAR，并完成格式化断言。该测试开关不等于上游正式
支持 PHP 8.5，也不关闭外部 Symfony 插件此前存在的间歇性 EPIPE。
