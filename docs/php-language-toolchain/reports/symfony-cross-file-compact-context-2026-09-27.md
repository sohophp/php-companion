# Symfony 跨文件 `compact()` 函数身份与 Twig 上下文

日期：2026-09-27。仅改 SoPHP 隔离工作树；未修改业务项目，也未重新打包 VSIX。

## 错误与来源

前一轮已处理同文件 `use function` 和函数声明，但 `App\Controller\compact()` 在另一 PHP 文件中声明时，Controller 的裸 `compact('user')` 仍被当作 PHP 内建函数，向 TwigPlus 发布虚假的 `user` 变量。Provider 回归先复现两条红线：已打开的跨文件函数，以及 Composer `autoload.files` 磁盘函数。它们分别多出了 `cross-file.html.twig` 和 `composer.html.twig` 上下文。

Provider 现在从有界项目源文件、打开缓冲区和项目自己的 Composer `autoload.files` 收集解析器确认的 `compact` 函数声明，再交给 Controller 分析器判定裸调用。显式 `\compact()` 保留内建语义。项目源文件数量与总字节仍受原有 Provider 预算约束；超出项目根目录的路径不作为函数证据。未列入已知项目源文件、未打开且不属于 Composer `autoload.files` 的独立函数文件，仍不能静态证明其运行时会被加载。

按需索引的单文件 Controller 请求现只附带可能声明 `compact` 的打开 PHP 快照，避免把无关 YAML 快照带入单文件 Provider 调用。函数文件打开、未保存改名、Undo 和关闭会刷新已知 Controller 上下文；磁盘 watcher 变化也会纳入同一刷新链。隔离 VS Code 宿主验证了先打开 Controller 再打开函数文件、随后未保存改名与 Undo，以及先打开函数文件再打开新 Controller 两种顺序。

## 验证

- Provider 新增用例先以 2 项失败复现；修复后 12/12 通过。框架 69/69 通过。
- 语言服务器定向 stdio 覆盖函数文件 `didOpen`/`didClose`、Composer `autoload.files` 磁盘 watcher、watcher 批次，以及旧全量请求与新单文件结果的合并。最终源码的相关子集 6/6 通过；Composer watcher 用例先因只通知函数文件而失败，修正后会通知受影响 Controller。
- VS Code 1.139.1、默认 `onDemand`、Core＋Symfony 最终源码宿主中的 Twig 互操作上下文退出码 0；这是 Context Provider 与桥接结果，不是已安装 VSIX 或真实 WSL Remote 的 TwigPlus 可见交互。
- 完整语言服务器回归曾在中间修订得到 388 项通过、1 项跳过、1 项失败；失败为无关 YAML 快照进入单文件请求。修正后、添加最后一条 Composer watcher 改动之前，完整 21 个文件为 390 项通过、1 项跳过。最后的 watcher 改动通过上述定向子集、TypeScript 和 ESLint；完整 21 文件未再次运行，不把旧完整结果称为最终源码的全量通过。

当前 0.4.7 私有候选 `248ee1f8` 不含此源码增量。下一次交付冻结时再同批构建 Core、Symfony、Open Source Pack；C4 仍需真实 WSL Remote 和长期使用验收。
