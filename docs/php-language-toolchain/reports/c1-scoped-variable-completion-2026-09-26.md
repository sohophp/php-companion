# C1：PHP 变量建议按当前作用域生成

日期：2026-09-26。仅修改 SoPHP Core、Open Source Pack 配置与隔离测试；未修改业务项目，也未重新打包 VSIX。

## 复现

原有 `editor.wordBasedSuggestions: currentDocument` 能排除其它已打开文件中的词，却无法区分同一文件的函数。C1 VS Code 1.139.1 Linux x64 源码宿主里，第一个函数定义 `$otherFunctionSecret`，第二个函数输入 `$otherFunctionSec` 时，建议列表仍包含第一个函数的变量。新增断言在修复前报错：`PHP suggested a local variable from a different function in the current file.`

## 修改

SoPHP Language Server 现在返回 PHP 变量补全：参数、当前位置之前的赋值、闭包显式捕获变量、箭头函数自动捕获的外层变量、实例方法的 `$this` 与常见超全局变量。候选使用当前语法作用域及替换范围；循环和 `catch` 的临时变量遵守解析器给出的有效范围。Core 和 Pack 将 PHP 通用单词建议默认设为 `off`，避免绕过语义过滤。类型、成员、函数和常量仍由现有 SoPHP 补全路径负责。

## 验证和范围

- 语义定向测试通过：本函数参数与局部变量可见；另一函数局部变量不可见；箭头函数能看到外层变量和自身参数；普通闭包只看到显式捕获的外层变量；实例方法有 `$this`，静态方法没有。
- Core C1 源码宿主通过：原有 `$cust` 能补出 `$customerName`，跨函数 `$otherFunctionSecret` 不再出现，完整 C1 编辑查询链退出码 0。日志 `/tmp/sophp-c1-scoped-variables-20260926.log`。
- 完整 10 项 Open Source Pack 源码 Profile 对跨函数隔离、当前函数变量及箭头函数外层变量均通过，退出码 0；最终日志 `/tmp/sophp-pack10-scoped-arrow-20260926.log`。
- Pack manifest 定向测试 4/4、语义定向测试、构建、扩展宿主 TypeScript、改动文件 ESLint 与 `git diff --check` 均通过。

解构赋值等未明确记录的变量来源需要独立用例补充；用户显式覆盖 `editor.wordBasedSuggestions` 会改变默认隔离行为。源码宿主结果不等于已安装 VSIX 或真实 WSL Remote 验收，后者仍属于 C4。
