# 参数重排保留实参求值顺序

2026-10-11，正常 LS `a1730fb9bad08fe453b8e390a1bd1ece4150bb638ca0e269d240c6a2bbb9ff2a`。本次完成增量验证，上一正常 `8b42a368` 的完整回归资格仍仅属于其原快照。

## 行为

显式 PHP 8.0–8.5 目标下，方法家族参数重排遇到不能安全移动的位置实参，会先验证目标参数名稳定，再在原位置补参数名。函数调用、自增、嵌套调用、注释、尾随逗号和省略可选实参均保留原表达式顺序。例如：

```php
// 原声明 send($head, $mode = 20, $count = 30)，把 count 移到第二位。
$contract->send(nextValue('head'), nextValue('mode'));
// 新声明 send($head, $count = 30, $mode = 20)，调用表达式位置保持。
$contract->send(head: nextValue('head'), mode: nextValue('mode'));
```

[PHP 官方参数文档](https://www.php.net/manual/en/functions.arguments.php)说明 PHP 8.0 起支持按名称传参、跳过可选参数，以及位置实参后接命名实参。这里的求值顺序与结果保持由真实 PHP 执行对照验证。

纯标量与已证明的纯变量位置实参继续使用原重排路径。新命名回退要求明确的 PHP 8 目标；PHP 7/未知目标拒绝。非固定接收者要求整个已证明家族的参数名一致；private、final 方法或 final 类使用已证明目标自己的名称。动态/间接/first-class callable、展开、by-reference、variadic、promoted 参数、未完成层级、缺失必需实参和读取原实参列表等既有边界保持。复杂接收者 `(new Example())->send(...)` 仍没有计划；通用 Change Signature 继续开放。

## 验证

| 层次 | 结果与范围 |
| --- | --- |
| 原实现反例 | 修正测试输入后的语义 19 项中 10 项失败；原正常 bundle 协议 6 项中 4 项 PHP 8 正例失败，PHP 7 两项拒绝通过 |
| 当前语义 | 48/48，包括新增 23 项以及原参数重排/新增/删除家族 25 项；目标版本实时切换、名称不稳定拒绝、nullable nullsafe/static 等 |
| 当前正常协议 | 14/14，新增六项 PHP 7.2/8.0/8.5 × onDemand/progressive，以及原八项参数输入；三文件计划、未保存缓冲区、源码摘要和 didChange 后范围更新 |
| 实际 PHP CLI | 六个 8.0–8.5 minor，每个十场景，60 组对照/120 次 `-n` 执行；结果及副作用顺序逐组相同，包括异常、魔术属性、嵌套目标、可选缺口、自增、static、nullsafe 空/非空 |
| 实际 Linux 编辑器 | VS Code 1.140.0，正常 Core，onDemand/progressive 各一轮；实际三文件 diff 预览、取消、未保存调用者、预览时并发输入拒绝、应用及一次 Undo/Redo 精确恢复，磁盘源码未自动保存 |
| 静态检查 | semantic 严格类型/build、全部编辑器源码 strict noEmit、五个相关源码/测试 Lint、正常 production bundle 均退出 0 |
| 终态审计 | 30,083 冻结输入及符号链接无变化；两轮实际唯一正常 LS/两 WASM、生命周期与自有显示/驱动/夹具进程终态核对通过；真实 PHP 二进制与前后源码摘要再次核对 |

编辑器场景在 `test/extension/suite/reorderEffects.ts`，已接入 C3 的原参数操作流程。本次直接执行该新增场景，未执行新的完整 C3，未借用旧编译入口。

失败记录保持：首轮 Lint 缺返回类型注解已修正；扩大语义用例时 static 测试使用旧偏移，实际偏移核对后修正测试；CLI 准备曾假设不存在的 8.0 路径，后按原已合格清单选取；复杂 receiver 仍受既有覆盖限制。编辑器准备的 D1856 使用 Node 执行原生 esbuild 导致编译失败，D1857 继承 Electron Node 模式导致启动失败，均未取得编辑器资格；D1858 正确使用原生工具并清除该启动环境后两模式通过。没有通过放宽产品断言或超时取得资格。

## 证据与后续

原始证据在 `.vscode-test/d1847*`–`d1858*`；独立终态审计在 `.vscode-test/d1859-named-reorder-terminal-audit.json`；原始日志、源码和正常资产的文件副本与摘要清单在 `.vscode-test/d1859-named-reorder-archive/manifest.json`。本报告的 JSON 伴随件提供准确源码与正常资产身份。

新增 F08-RP-04 后为 172 个编号/14 家族，未完成大项仍为 26。当前新构建完整 LSP、完整编辑器/12 扩展组合、性能复验及其它平台/真实 WSL Remote/真人长期使用仍待完成；上一完整构建的 1,514 项、Windows C3 两模式及真实项目五项性能通过不转移到本快照。原选区 1,172/1,000 ms 失败、Windows C2/Undo 和 createFile Redo 限制保持。Profile、发布、提交与推送未操作。
