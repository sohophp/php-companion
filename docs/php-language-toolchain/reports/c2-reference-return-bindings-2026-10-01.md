# C2：引用返回绑定后的旧类型撤回

日期：2026-10-01。源码增量；未打包、提交或更新 Profile。

## 可复现错误

`$value =& slot()` 把局部绑定关联到可由其它代码修改的存储。随后 `$value = new Repo()` 和按值调用 `observe($value)`，并不足以保证 `$value` 仍为 Repo。最短复现中，observe 修改 slot 所返回的共享存储；本机 PHP 实际输出 `Other`，而修复前的语义查询返回 Repo 并建议 ready。

这一语言行为参照 [PHP 官方引用返回说明](https://www.php.net/manual/en/language.references.return.php)并由实际 PHP 执行核对。普通 `$value = slot()` 接收值复制；它作为正例，继续保留独立局部的类型。

## 修复

补全的严格语句证明会排除已绑定引用的局部变量；类名回退路径也不能再直接取旧的 new 赋值绕过该检查。新增语法节点检查识别引用赋值两端的直接变量，覆盖函数、静态方法、实例方法、限定名称，以及 `=`、`&`、返回调用之间的注释。

取得 `$object->property` 的引用不会把 `$object` 的根绑定变成引用；因此根变量检查不会把该情况误认为变量本身已共享。属性 Hook 的间接修改检查与内置 array_walk_recursive 引用参数的上下文类型继续使用原有证明。

无引用符号的作用域走快速排除，避免普通值调用每次都遍历引用语法。已有引用参数、捕获和其它逃逸限制仍由原有未逃逸检查负责；本轮不完成一般引用别名或任意副作用分析。

## 验证

| 项目 | 当前结果 |
| --- | --- |
| 全量语义 | 16 文件，545/545，47.46 s；新增语义测试遍历五种绑定写法及普通调用、独立构造、构造数组三种间隔，核对候选和错误诊断撤回；值复制与未保存切换为正例 |
| 定向边界 | 引用返回、属性 Hook、array_walk_recursive 三项通过 |
| 标准 stdio LSP | PHP 7.2／8.5，引用返回编辑、按值调用与简写三元共 6 项通过，16.02 s；补全、Definition、参数诊断随值复制→引用绑定→值复制撤回/恢复 |
| 隔离源码宿主 | 退出码 0；三组补全用例、未保存引用绑定修改、一次 Undo/Redo 通过 |
| 引用绑定连续编辑 | 独立 Composer 只读内存副本 100 轮，每轮正确首位或空列表；P50 3.52 ms，P95 5.42 ms，首轮/最大 32.44 ms |
| 普通调用压力复测 | 同一十调用夹具 100 轮，每轮正确；P50 4.08 ms，P95 7.97 ms，首轮/最大 53.20 ms |
| 构建检查 | semantic build、源码 bundle、LSP typecheck、扩展测试 TypeScript、相关 ESLint、diff check 通过 |

原始数据：[引用绑定](c2-reference-return-benchmark-2026-10-01.json)、[普通调用压力](c2-reference-return-value-pressure-2026-10-01.json)。日志：`/tmp/sophp-reference-return-{full-semantic,stdio-final,host,build,bundle,lsp-tsc,host-tsc,eslint}.log`。

全量 353 项 stdio 未重跑；6 项定向结果不替代全量。隔离源码宿主不等于真实 WSL Profile 使用或可见弹窗等待验收。
