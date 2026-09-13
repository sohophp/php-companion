# PHP 限定名称与常量大小写验收

日期：2026-09-10。范围：`namespace\Symbol`、相对限定函数/常量、namespace alias，以及命名空间与类常量的大小写身份。

## PHP 8.5 运行时基线

使用 Winstar 项目规定的 `bin/php-runtime` 执行独立探针，确认：

- `namespace\LocalType`、`namespace\localFunction()` 和 `namespace\LOCAL_CONSTANT` 显式绑定当前 namespace。
- `Vendor\Tools\helper()` 与 `Vendor\Tools\FLAG` 在 `namespace Consumer` 中绑定 `Consumer\Vendor\Tools`，不会使用仅适用于未限定函数/常量名的全局回退。
- `use Vendor\Tools as Tools` 会让 `Tools\helper()` 和 `Tools\FLAG` 绑定 `Vendor\Tools`。
- 同一 namespace 可同时声明 `FLAG` 与 `flag`；`use const ... as AliasFlag` 不能通过 `aliasflag` 访问。

实际探针输出包含：

```text
alias-function=Vendor\Tools\helper
alias-constant=Vendor\Tools
relative-function=Consumer\Vendor\Tools\helper
relative-constant=Consumer\Vendor\Tools
upper:lower
Error:Undefined constant "ConstantCase\Consumer\aliasflag"
```

## 实现范围

- 类型、函数和常量解析器识别 `namespace\` 前缀，并只拼接一次当前 namespace。
- 只有未限定函数名和未限定常量名可以在当前 namespace 无声明时回退全局；包含反斜线的相对限定名称始终保持 namespace 相对。
- 普通 `use Namespace as Alias` 的首段 alias 可展开限定函数调用和常量引用。
- `functionAt()` 优先使用 Parser 的完整调用名称范围，`constantAt()` 优先使用完整结构化名称；Definition 不再只解析光标所在的最后一段。
- 命名空间常量、类常量和 `use const` alias 使用大小写敏感身份。完成查询、Definition、References、动态常量值传播与 Rename 均不会把不同大小写合并。
- import 插入在类、函数和常量三个类别分别检查对应的 PHP 名称冲突规则。

## 精准测试

Semantic 正反例覆盖当前 namespace 的类型成员、函数返回与常量值；全局和 `Consumer\Vendor\Tools` 同名符号同时存在时，相对限定名称只选择后者；namespace alias 只选择导入目标。`FLAG`/`flag` 及 `Holder::FLAG`/`Holder::flag` 可同时导航，References 不交叉，错误大小写的常量 alias 保持未解析。

真实 stdio LSP 在完整 Composer 索引后，从 `namespace\localHelper()` 和 `namespace\LOCAL_FLAG` 返回同一当前 namespace 源文件 Definition。既有未解析类型、全局类 import 和相对/绝对类名正反例继续通过。

## 自动化与宿主证据

- semantic 全量：227/227。
- language-server 全量：107/107。
- 仓库级 `pnpm check`：十五个组件 489/489、根扩展 33/33，合计 522/522；TypeScript、ESLint、三个 VSIX 构建和内容检查通过。
- `pnpm verify:packages`：45 个 Changesets 形成 15 个组件发布计划；十五个真实 tarball 在仓库外隔离安装运行通过。
- 首次纯净 Profile 宿主运行在 Safe Move 夹具反向恢复时检测到异步文件协调尚未结束，退出码 1；测试改为等待反向 namespace、引用和 dirty 状态全部稳定后再恢复原始字节。重新编译测试后，同一主 VSIX 在纯净 VS Code 1.137.0 Profile 和 Open Source Profile 中均以退出码 0 通过。
- Open Source Profile 中 Symfony Language Tools 0.20.0 的既有关闭期通知、`EPIPE` 或 `ERR_STREAM_DESTROYED` 日志仍属于外部限制，本轮未声称修复。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
