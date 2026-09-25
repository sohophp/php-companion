# C2 带 Attribute 的箭头函数实参后补全

日期：2026-09-26。范围是 SoPHP Core 的 PHP 参数提示、命名参数补全及独立 Composer 源码宿主；未修改业务项目，未打包 VSIX。

## 问题与修复

合法 PHP 8.5 写法 `outer(fn(#[\SensitiveParameter] int $value): int => $value, 2)` 经本机 `php85 -l` 检查通过。在同一外层调用的第二个实参位置继续输入尚未完成的 `se` 时，SoPHP 原先返回空参数提示，也没有 `second:` 补全。定向语义测试先复现失败：`signature()` 返回 `undefined`。

问题来自两处局部词法扫描把 Attribute 起始的 `#[` 当成 `#` 行注释，误将后续光标判为注释内容。现在只把未紧跟 `[` 的 `#` 当成行注释；真正的 `#` 注释仍抑制注释内建议，并在换行后恢复外层参数上下文。没有改变 PHP 版本诊断或其它语言 Provider。

## 验证

- 定向语义测试先失败再通过；覆盖带 Attribute 的未完成箭头函数实参、真实 `#` 注释内抑制和换行后的恢复。完整语义包 13 文件、398 项通过。
- 真实 stdio Language Server 在 `onDemand`、PHP 8.5 下先处理普通嵌套命名调用，再接收同一文档的未保存 Attribute 箭头函数版本；Completion 返回 `second:`，Signature Help 指向外层第二个参数。定向用例通过。
- VS Code 1.139.0 Linux x64 的隔离 C2 源码宿主执行同样未保存替换，补全与参数提示均正确，宿主退出码 0；日志 `/tmp/sophp-c2-attributed-arrow-named-20260926.log`。
- 当前 10 项 Open Source Pack 源码组合在同一隔离 C2 宿主继续通过该未保存编辑场景及现有组合链，宿主退出码 0；日志 `/tmp/sophp-c2-attributed-arrow-pack10-20260926.log`。
- 语义与 Language Server 包构建、根扩展 bundle、宿主 TypeScript、相关 ESLint 和 `git diff --check` 通过。

当前证据覆盖 PHP 8.5 的本机源码与 10 项 Pack 组合链；已安装候选、真实 WSL Remote 和跨平台交互仍需后续门禁。PHP 7.2 会把 `#[` 当作行注释，其建议抑制另见下节；本项的 Attribute 支持仅声明 PHP 8.5 的合法输入。

## PHP 7.x 注释回归复核

随后用 PHP 7.2 的 `outer(1, #[se` 在真实 stdio 服务中复现回归：光标处本应处于 `#` 行注释，修复前却返回了通用类名补全。现在 Language Server 在目标 PHP 7.x 的补全和参数提示入口，利用语义文件的字符串与注释区间识别当前行的 `#` 注释；PHP 8.x 仍按 Attribute 处理 `#[`。定向测试先失败、修复后通过；同组 PHP 8.5 Attribute 用例继续通过。语义测试还覆盖字符串和已结束的块注释中的 `#[` 不触发抑制，以及换行或 PHP 关闭标签后退出行注释。语义与 Language Server 构建、相关 ESLint、差异检查通过。此项是版本化建议抑制，不改变 PHP 7.2 的解析树或版本诊断。
