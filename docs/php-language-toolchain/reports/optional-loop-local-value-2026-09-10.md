# 可选循环后的局部类型合流验收

日期：2026-09-10。范围：一般 `while`、条件 `for` 与可能为空的动态 `foreach` 之后，局部变量的保守类型传播。

## 实现范围

当局部变量在循环前具有可证明类型，循环可能执行零次，且循环体的每条正常路径都把该变量赋为独立可证明的类型时，semantic 合并“零次执行”的循环前类型与“至少一次执行”的循环体类型。结果作为 Union 同时驱动成员补全、多目标 Definition 和参数类型诊断。

空数组字面量 `foreach` 保留循环前类型。循环完全不读取或赋值目标变量时直接保留已有事实，避免为无关迭代链重复求值。自依赖赋值、循环体读取目标、引用、未知右值、嵌套或多层跳转，以及无法证明所有赋值路径的循环继续返回 unknown。

控制流赋值的归属在文件解析时按赋值偏移缓存。扫描只访问包含解析器已知赋值的 CST 分支；查询阶段不会为每个补全或诊断重新解析文件。

## 自动化证据

- semantic 全量：227/227。
- language-server 全量：107/107；新增真实 stdio 用例验证 `while` Union 的补全、两个 Definition 目标和参数诊断，以及条件 `for`、动态 `foreach` 和自依赖反例。
- 原有 5 秒单项预算未提高；泛型数组/迭代热点专项为 514 ms。

- 仓库级 `pnpm check` 通过：十五个组件 489/489，根扩展 33/33，合计 522/522；TypeScript、ESLint、三个 VSIX 构建与内容检查同时通过。
- `pnpm verify:packages` 证明十五个组件 tarball 可在仓库外隔离消费者中安装运行。
- 同一主 VSIX 依次通过纯净 VS Code 1.137.0 与 Open Source Profile Extension Host，退出码均为 0，中间未重新打包。Symfony Language Tools 0.20.0 关闭时仍打印外部 `EPIPE`，未把该已知问题记为已修复。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

公开 npm 与 VS Code Marketplace 发布未执行。
