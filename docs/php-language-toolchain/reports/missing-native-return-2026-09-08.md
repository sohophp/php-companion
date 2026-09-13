# 原生返回类型缺少返回值验收

日期：2026-09-08。范围：具有原生值返回类型的函数或方法正常到达函数体末尾。

## 精确边界

新增稳定错误码 `php.return.missing`。仅当有界控制流证明至少一条路径会正常结束时，
才在 callable 名称上发布 Error。`int`、nullable 类型和 `mixed` 均受检查；PHP 8.5
runtime 实测三者在无返回值时都会抛 `TypeError`。`void`、`never`、Generator、抽象
声明、未知调用、goto/continue、未支持控制流和预算耗尽不进入本诊断；`never` 使用
独立的 `php.never.fallthrough`。

空体、缺失 else/default、动态条件循环和可退出恒真循环属于已支持的正常结束路径。
完整 return/throw/exit 分支、无退出跳转的恒真循环及已证明的原生 never 调用属于
终止路径。显式 `return;` 的类型错误继续由 `php.return.type-mismatch` 负责。

## 验证

- 语言服务器 57 项测试通过；新增分析与 stdio 正反例覆盖上述边界。
- 相关 TypeScript、ESLint、`git diff --check` 和 VSIX 内容校验通过。
- 实际隔离 Profile 与 Open Source Profile 完整宿主均退出 0；冻结语料只新增
  `missingValueReturn` 对应的一条 `php.return.missing`，未知调用反例保持静默。
- 存量测试桩 `MagicDiagnosticTarget::__call(): mixed {}` 被该诊断正确发现，fixture
  改为显式抛出 `Exception`，继续只验证未知继承层级的抑制行为。

主 VSIX：`php-companion-0.4.5.vsix`；SHA-256：
`dc4d741d9291104f477bb8aeba8b198cd60323feca5adfa4a656736de2677f95`。
本轮没有重建两个 Pack，也没有公开发布。

隔离宿主日志位于 `/tmp/php-missing-return-isolated-pass-logs`，五类关注错误计数均为
零。组合宿主日志位于 `/tmp/php-missing-return-open-source-logs`，断言通过，但外部
Symfony Language Tools 0.19.0 再现 8 条 write EPIPE 和 1 条 unknown error；这与
已有开放组合缺陷一致，不能记录为修复。
