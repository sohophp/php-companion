# C1：创建、类型检查与 Attribute 位置的候选种类

日期：2026-09-27。只修改 SoPHP 隔离工作树和独立 Composer/VS Code 夹具；没有修改业务项目或重新打包 VSIX。

`new C1Construct...` 原先会同时建议 class、interface、trait 和 enum；`instanceof` 会建议 trait；Attribute 位置也会建议 interface、trait 和 enum。语义测试先复现错误，随后按位置筛选：`new` 仅提供 class；`instanceof` 提供 class、interface、enum；Attribute 位置仅提供 class。限定名仍按已有 namespace 规则处理。`catch` 未做同样筛选，因为合法的 `catch (\Throwable $e)` 使用的是 interface，后续需要按异常继承关系证明候选。

完整语义包 431/431、语义包 TypeScript、测试入口 TypeScript、改动文件 ESLint 和 `git diff --check` 通过。VS Code 1.139.1 Linux x64 的当前 10 项 Open Source Pack 源码宿主从未打开的 Composer PSR-4 类型取得上述位置的候选，排除错误声明种类；最终宿主退出码 0，日志 `/tmp/sophp-c1-construction-pack10-final-20260927.log`。

本报告记录当时仅按 class 种类筛选的状态；随后 [Attribute 类身份筛选](c1-attribute-class-completion-2026-09-27.md) 已进一步排除未标记的普通 class。本修复在 0.4.8 私有候选冻结后，尚未进入该 VSIX。真实 WSL Remote、其它平台及 R4 其余验收继续开放。
