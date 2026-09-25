# Symfony Kernel 路由导入的静态完整性

日期：2026-09-25。仅修改 SoPHP 的 Symfony 路由分析组件和静态 Provider；未修改业务项目，未打包 VSIX。

## 问题与修复

`Kernel::configureRoutes()` 原先遇到无法静态解析的条件分支、带额外参数或链式配置的 `$routes->import()` 时，可能跳过调用却继续报告 `complete: true`。静态路由图因此可能被误当成完整路由全集。现在只要无法证明使用 `$routes` 的语句及其导入结果，便将图标为不完整；已证明的无条件导入仍保留为部分事实。

可证明的 Kernel 导入现在支持字面量第二参数 `attribute`、`php`、`yaml`，以及字面量 `prefix()`、`namePrefix()` 链。静态 Provider 会按 `attribute` 读取目标 PHP 文件或目录，并组合路由名与路径前缀。PHP 路由配置文件中的导入链若使用未解析的方法，也不再被当成完整事实。Symfony 的[路由文档](https://symfony.com/doc/current/routing.html)描述了导入 Attribute 路由和为导入集合设置前缀的用法。

## 验证与范围

新增 Framework Symfony 单元场景覆盖精确环境、动态条件、Kernel Attribute 导入及前缀、未知导入链；Provider 临时 Composer 项目验证最终 `api_home → /api/home` 与动态分支的 `complete: false`。`framework-symfony` 59/59、`provider-symfony-routes` 8/8 测试通过；两包 TypeScript 构建、改动文件 ESLint 与 `git diff --check` 通过。

结果证明独立静态分析和 Provider 汇总路径，不代表项目自定义 loader 的运行时路由全集，也不代表安装候选或 WSL Remote 的编辑器验收完成。R4 目标仍开放。

后续补充：`configureRoutes()` 若显式存在，但其所属 Kernel 父类、参数类型、参数个数或方法体无法证明，原分析器也会跳过方法并报告完整。新增用例先复现自定义父类场景 `complete: true` 的错误结果，再改为 `complete: false`；不猜测自定义继承或签名的路由行为。Framework Symfony 59/59 与静态 Provider 8/8 再次通过，后者还验证自定义父类在完整项目快照中保持不完整。构建、相关 ESLint 与差异检查通过。

环境条件补充：`'dev' === $this->environment` 现在与 `$this->environment === 'dev'` 一样提取精确 `dev` 导入，动态条件继续标为不完整。无环境选择时保留既有“仅提取无条件源码事实”的契约；这项 `complete` 不等同运行时路由表完整。Framework Symfony 59/59、静态 Provider 8/8、构建、相关 ESLint 和差异检查通过。
