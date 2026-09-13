# PHPDoc callable 上下文闭包类型验收

日期：2026-09-10。验证环境：Linux x64 / WSL、VS Code 1.137.0。本报告只证明当前源码和下列 VSIX 在该环境中的行为，不外推到 Windows 原生或 macOS。

## 实现范围

当一个函数或普通方法调用能够唯一解析到一个签名，且对应外层参数具有 PHPDoc `callable(Service): Return` 类型时，semantic 会为该实参位置上未写原生类型的 closure 或 arrow function 参数提供上下文对象类型。位置参数和具名参数都按外层签名映射；成员补全、Definition 和参数类型诊断消费同一类型事实。

如果 callable 参数使用模板，模板可从同一调用的其他已证明数组或集合实参绑定。只有所需模板得到唯一、相容的专门化结果才会提供上下文类型。版本化内建 `array_map` 会先排除当前闭包不可能匹配的 `null` callback 重载，再从 `$items` 的元素类型专门化 callback 参数。可证明的 arrow 主体，以及由有界顺序语句、嵌套 `if/elseif/else`、`try/catch/finally`、支持直接 `break;`/`break 1;` 汇入外层后续语句的 `switch` case 贯穿，以及支持直接 `break;`/`break 1;` 汇入外层后续语句的有界 `while/do/for/foreach` 循环组成、每条可继续路径最终到达可证明 `return` 的 closure 主体，会继续绑定 callable 返回模板；明确的 throw/exit 以及唯一解析且实参兼容的原生 never 调用终止路径不贡献返回类型，条件提前返回与最终返回合并为 Union，因此映射结果的共有成员可进入补全、多目标 Definition 和参数诊断。返回遍历限制为 64 个节点并服从共享控制流深度预算。

以下情况保持 unknown，不产生猜测：

- 用户函数或方法存在重载/重复声明，无法唯一解析；
- callable 参数模板未绑定、绑定冲突、arrow 返回未知、closure 任一返回未知、函数体仍可落空、没有任何可证明返回、循环内存在 `break/continue`、return 位于其它尚未建模的控制结构、存在 yield/goto，或对象类型无法解析；
- 外层实参使用 unpack；
- callback 自身使用引用或 variadic 参数；
- callback 参数数量与具体 callable 契约不一致。

本轮还修复了三个局部语句向上查找循环：顶层 arrow function 位于语法根时，遍历现在会在无父节点处终止。该问题此前可使参数诊断查询占满单核并不返回。

## 自动化证据

- semantic：227/227，覆盖普通 closure、arrow、具名实参、具体和泛型 callable、顺序局部值、单一 return、完整条件、条件提前返回加最终返回，以及 return/throw/exit/原生 never 调用终止、try/catch/finally、switch 贯穿/直接 break 与 while/do/for/foreach 的返回/直接 break 合流、分支 Union、映射结果补全/Definition、错误对象实参诊断，以及用户重载、未绑定/冲突模板、未知返回、函数体落空、全部路径只终止、嵌套或多层循环跳转、无法证明的顺序值、缺失类型和 arity 反例。
- language-server：107/107；真实 stdio 初始化 Composer PSR-4 项目并加载目标 PHP 内建目录后，验证具体 callable 及 `array_map` 泛型 callback 输入和映射结果的已发布诊断、成员补全和跨文件 Definition。
- 十五个组件：489/489；根扩展：33/33；合计 522/522。
- `pnpm verify:packages`：十五个组件均从真实 npm tarball 在仓库外隔离消费者中安装并运行。
- `pnpm test:extension:packaged`：最终主 VSIX 在纯净 VS Code 1.137.0 Extension Host 中通过，退出码 0。
- `pnpm test:extension:open-source-profile`：同一主 VSIX 与开源组合插件共同启用时通过，退出码 0。一次运行中 Red Hat YAML formatter 未在固定 5 秒冷启动窗口内返回，保持原预算重试后通过；实际加载的 Symfony Language Tools 0.20.0 在测试关闭其子进程时仍记录外部 `EPIPE`，但未使最终功能断言或宿主失败。
- 最终 `pnpm check` 产生下列哈希后，直接运行已编译的打包宿主入口，未再次调用 package；同一字节产物连续通过纯净与 Open Source Profile，避免用同源码的另一份 ZIP 代替候选验证。

## 候选产物

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `d452ab3baf4073f4faf8957bcfdb38e3634abcf8446994b92c317bc06ac0d30a` |
| `php-companion-open-source-pack-0.4.5.vsix` | `966d7b8f897f60dfce28d445c71e9ffd5a76f4e4023375dec12652381a68155a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `d9822d11df85cece993455e683f7e886d5b014b41b7fa4ba25e30dd5ad35ef95` |

公开 npm 和 VS Code Marketplace 发布不属于本次验证，未执行。
