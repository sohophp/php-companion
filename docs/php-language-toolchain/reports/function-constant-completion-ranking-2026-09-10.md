# 函数和命名空间常量补全排序验收

日期：2026-09-10。范围：PHP 函数与命名空间常量补全的语义优先级、自动导入和 VS Code LSP 顺序保持。

## 排序规则

1. 当前 namespace 中的声明优先，符合 PHP 对非限定函数名和常量名的首次解析目标。
2. 显式 `use function` / `use const` 导入及别名其次，保留源码已经声明的可见名称。
3. 全局函数和常量作为 PHP namespace 回退候选，排在需要新增 import 的候选之前。
4. 需要新增 import 的候选按与当前 namespace 的共同前缀段数降序、namespace 距离升序排列。
5. 显示名称与完整限定名提供稳定决胜顺序。

Language Server 分别用 `0xxxxxx` 和 `1xxxxxx` 的单调 `sortText` 固定函数与常量顺序。需要新增导入的候选继续由统一 `importInsertion` 生成精确 `use function` 或 `use const` 编辑；前三类候选不产生重复导入。

## 精准边界

排序只使用索引已证明的 namespace、显式 import 和全局声明。它不根据使用历史或目录名称猜测；同名可见符号冲突继续由原有门禁抑制。函数和常量采用 PHP 的全局回退规则，未将该规则错误套用到其他符号类别。

## 自动化证据

- semantic 全量：227/227；两个专项场景分别覆盖函数与常量的当前 namespace、显式别名、全局回退、相邻 namespace、同顶层 namespace 和无共同前缀候选，并断言完整顺序和 import 标记。
- language-server 全量：107/107；真实 stdio Composer 项目在同一文档中分别请求函数和常量补全，断言显示名称、分类 `sortText` 和 `additionalTextEdits`。
- 仓库级 `pnpm check` 通过：十五个组件 489/489、根扩展 33/33，合计 522/522；TypeScript、ESLint、三个 VSIX 构建及内容检查同时通过。
- `pnpm verify:packages` 先解析 Changesets 发布计划，再验证十五个组件 tarball 可在仓库外隔离消费者中安装运行；当前 45 个变更集形成覆盖全部十五个组件的可执行版本计划。
- 同一主 VSIX 依次通过纯净 VS Code 1.137.0 与 Open Source Profile Extension Host，退出码均为 0，中间未重新打包。Symfony Language Tools 0.20.0 关闭时仍记录外部 `EPIPE` / `ERR_STREAM_DESTROYED`，未把该已知问题记为已修复。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

公开 npm 与 VS Code Marketplace 发布未执行。
