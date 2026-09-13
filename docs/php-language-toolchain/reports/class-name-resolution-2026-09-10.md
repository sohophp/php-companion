# PHP 类名解析规则验收

日期：2026-09-10。范围：namespace 内源码类名、全局类补全、原生类型传播，以及函数和常量回退规则的隔离。

## PHP 运行时基线

使用 Winstar 项目规定的 PHP 8.5 启动器执行真实运行时探针：

```text
class=Error:Class "PrecisionProbe\DateTimeImmutable" not found
function=2
constant=80509
```

探针位于 `namespace PrecisionProbe`：未导入的 `new DateTimeImmutable()` 按 `PrecisionProbe\DateTimeImmutable` 查找并失败；同一 namespace 中的 `strlen()` 和 `PHP_VERSION_ID` 仍使用 PHP 规定的全局函数与常量回退。实现据此将类名与函数/常量解析维持为不同规则。

## 实现范围

- 新增严格的源码类名解析路径：未限定名和相对限定名始终相对于当前位置的 namespace，首段显式 alias 按 `use` 展开，前导 `\` 保持绝对名称；`self`、`static` 和 `parent` 继续按声明作用域处理。
- 内部已规范化的类型名保留独立解析路径，避免 Generator、模板替换、PHPDoc 类型代数和成员返回传播把既有完整符号再次拼接 namespace。
- 严格路径覆盖原生参数/返回/属性、`new`、静态成员、类常量、Attribute、继承、接口、Trait、`instanceof`、诊断、Definition、References、Safe Move/Rename 引用和控制流收窄。
- namespace 内补全全局类时附加准确 `use` 编辑；未导入的全局类不再提供错误的成员、Definition 或已解析类型。显式 import 与 `\FQCN` 保持可导航。
- Parser 的 `is_countable()` 内建收窄使用显式 `\Countable`，避免内建契约受调用文件 namespace 影响。Semantic 快照升至 schema 68，Language Server 持久缓存升至 `semantic-v39`。

## 精准正反例

Semantic 场景同时索引全局 `GlobalOnlyType` 和 `GlobalVendor\QualifiedGlobalType`，验证：

- `new GlobalOnlyType()` 在 namespace 内保持未解析，补全候选携带 `importFqcn`；`new \GlobalOnlyType()` 可 Definition。
- `new GlobalVendor\QualifiedGlobalType()` 解析为当前 namespace 下的相对限定名，不错误跳到全局 `GlobalVendor`；`new \GlobalVendor\QualifiedGlobalType()` 可导航并传播实例成员。
- 相对限定静态接收者不提供全局静态成员；绝对静态接收者提供 `globalStatic`。
- `use GlobalOnlyType; new GlobalOnlyType()` 不产生重复 import，并恢复准确 Definition。
- namespace 内未导入的内建 `DateTimeImmutable` 原生参数不传播 `format()`；显式 `use DateTimeImmutable` 后恢复成员和内建 stub Definition。

真实 stdio LSP 场景在完整 Composer 索引前抑制未解析诊断；索引完成后准确报告 `App\GlobalOnlyType`、`App\GlobalVendor\QualifiedGlobalType` 及其他真实缺失类型。补全编辑、相对/绝对 Definition 与成员传播使用同一身份规则。

## 自动化与产物证据

- semantic 全量：227/227。
- language-server 全量：107/107，包含真实 stdio 请求、完整索引门禁及缓存 schema。
- 仓库级 `pnpm check`：十五个组件 489/489、根扩展 33/33，合计 522/522；TypeScript、ESLint、三个 VSIX 构建和内容检查通过。
- `pnpm verify:packages`：Changesets 的 45 个变更集形成 15 个组件发布计划；十五个真实 tarball 在仓库外隔离安装并运行通过。
- 同一个主 VSIX 依次通过纯净 VS Code 1.137.0 Profile 和 Open Source Profile Extension Host，退出码均为 0；两次运行之间及运行后未重新打包。
- Open Source Profile 中 Symfony Language Tools 0.20.0 关闭阶段仍可能记录其既有 `EPIPE`、`ERR_STREAM_DESTROYED` 或通知发送失败日志；本轮没有把外部扩展关闭期问题记为已修复。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

这些结果证明本轮 Linux / WSL 候选及其开源插件组合。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放；公开 npm 与 VS Code Marketplace 发布未执行。
