# PHP 未解析函数与常量诊断验收

日期：2026-09-10。范围：完整项目索引后的确定命名空间函数与常量缺失诊断。

## 支持范围

- 显式相对限定函数或常量，例如 `Vendor\missingFunction()` 与 `Vendor\MISSING_CONSTANT`。
- 显式当前命名空间名称，例如 `namespace\missingFunction()` 与 `namespace\MISSING_CONSTANT`。
- 精确 `use function` 或 `use const` alias，其目标属于命名空间。
- 函数按 PHP 规则使用大小写不敏感身份；常量保持大小写敏感身份。

Language Server 仅在所属 Composer root 索引完整、文档没有语法错误时发布 Error：

- `php.function.unresolved`
- `php.constant.unresolved`

## 保守边界

当前逐版本内建与扩展符号目录尚未穷尽，因此非限定函数和常量不会因未收录而报告缺失。动态函数调用、成员调用、类常量、声明/import 范围、字符串内容，以及取消、超限或仍在构建的索引均不进入这两类诊断。

该边界优先控制误报；后续只有在目标 PHP 版本及启用扩展目录能够证明符号不存在时，才扩大到全局名称。

## 验证

- Parser 回归确认 `namespace\localHelper()` 保留完整调用名称和实参事实。
- Semantic 正反例同时覆盖已知名称、三类缺失命名空间名称，以及必须静默的未知非限定全局函数/常量。
- stdio 回归确认索引完成前不发布三类 unresolved 诊断，完成后才同时发布类型、函数和常量诊断，并继续抑制未知全局候选。

## 封板证据

- `pnpm check` 通过：十五个组件 489/489、根扩展 33/33，合计 522/522；TypeScript、ESLint、三个 VSIX 构建与内容检查同时通过。
- `pnpm verify:packages` 通过：45 个 Changesets 形成十五个组件发布计划，十五个真实 tarball 在仓库外隔离安装运行通过。
- VS Code 1.137.0 纯净打包宿主通过，并直接断言两个确定缺失诊断及两个未知全局候选的抑制结果。
- 相同 VSIX 在包含 Symfony Language Tools、TwigPlus、YAML、PHP CS Fixer、PHP Debug、PHPUnit 与 EditorConfig 的 Open Source Profile 中通过，退出码为 0。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

本轮没有公开发布 npm 包或 Marketplace 扩展。
