# D58：未闭合 callable 中的普通值补全

## 当前复现

6a1f2b30 构建上的八次独立查询，覆盖保留／临时 CST 与已闭合对照：`function run(string $text,bool $flag):bool{return /* value */ |` 没有局部变量或预期值；`tr|` 没有 true，`pick|` 的 bool／string 函数没有类型排序。已闭合对照可取得 bool 值、兼容的 `$flag` 和不兼容但保留的 `$text`。原查询不改变 revision／snapshot，记录 `/tmp/sophp-d57-unclosed-callable-probe.json`。

## 实现

将普通值消费者接入既有可丢弃 callable 恢复副本：空表达式变量、预期字面量、函数列表、关键字位置，以及其它候选共用的预期类型入口。函数列表可读到源码中已实际写出的当前函数名，支持未闭合函数体中的递归调用；返回的符号名称位置仍为真实源码范围。

在缺少表达式的赋值、箭头函数或实参末尾，仅用内部标识符形成可解析的临时节点。它不生成预期类型，不进入编辑文本或权威文件事实。原工作区 revision／snapshot 不变；恢复副本和查询缓存在结束后销毁。

新的普通值恢复限制为 131072 源码长度、光标后只有空白、最多 16 层定界符且恢复后无语法错误。已有成员／比较路径的预算保持；不会借新入口扩大数组恢复预算。内层调用使用自己的实参类型，未知调用、无声明类型、算术／逻辑操作数、字符串或注释不猜测外层 return 类型。混合 PHP/HTML 的普通 callable 恢复仍沿原拒绝边界，不作为本批已解决范围。

## 验证

- 新增 76 项语义测试：函数、实例／静态方法、参数闭包、捕获闭包、箭头函数、已有参数赋值、返回中的内层实参，分别核对裸变量、字面量／关键字、函数／常量排序。负例覆盖未知调用、无类型 return、运算数、字符串／注释、其它语法错误、词中控制、大小／深度预算及 HTML；检查未保存 return 类型刷新、作用域隔离、递归函数实际名称位置和查询事实不变。
- 185 项定向语义通过，四个文件；日志 `/tmp/sophp-unclosed-callable-values-focused-current.log`。首轮 60／62：用例遗漏实例方法合法的 `$this` 候选，修正用例后完整通过，没有删除该候选或改变产品访问规则。
- 当前完整语义 94 文件／1934 项全通过，60.47 秒，原会话 35431 退出 0；日志 `/tmp/sophp-unclosed-callable-values-full-semantic.log`。无构建／宿主并行，原超时预算不变。
- 当前定向 PHP 7.2／8.5 stdio 两项通过，518 项未选中不计通过，8.39 秒，原会话 53119 退出 0；日志 `/tmp/sophp-unclosed-callable-values-protocol.log`。54 次功能请求及 52 次热查询准备／采样，共 106 次。7.2 不纳入箭头函数场景；这是服务器配置版本证据，不是 PHP CLI 编译器矩阵。
- 当前构建、定向 ESLint 与 diff 检查通过；日志 `/tmp/sophp-unclosed-callable-values-build-final.log`、`/tmp/sophp-unclosed-callable-values-lint-current.log`。
- [可见编辑器证明](completion-unclosed-callable-visible-2026-10-04.json)：函数空值变量、未闭合类中的方法字面量、闭包中的函数调用及箭头函数空值变量，分别以 Enter／Tab 接受，共八次可见首位、精确文本、光标、Undo／Redo 和磁盘不变通过；原会话 54766 退出 0，日志 `/tmp/sophp-unclosed-callable-values-visible-host.log`。内部占位符或补出的定界符均未写入文档。文本刻意未闭合，因此不作 PHP 编译证据。显式触发等待 128–252 ms，不当自动弹出或 P95 门禁。

## 热查询范围

固定 232 字节的普通未闭合 return；每版本先准备文档，再请求 25 次，前五次不计，后二十次计算 P95。每次检查兼容 `$flag` 首位；采样时不修改文档，没有其它构建／语义测试／宿主并行。PHP 7.2／8.5 P95 分别 5.12／3.83 ms。准备请求后的首次采样分别 2.90／2.60 ms，不能作为冷查询。

每版本仅一组，证明这条小文档热查询低于 150 ms，不替代大型未保存编辑 P95 292.56 ms 的未完成预算，也不代表自动弹出、全部平台／规模或长期使用。原始记录 `/tmp/sophp-unclosed-callable-timing/`，绑定当前源码及构建的 [归档测量](completion-unclosed-callable-hot-query-2026-10-04.json)。

当前完整 LSP 资格仍绑定 a3678016 的 866 项；新源码只报告相应增量验证。真实 WSL、混合文档普通恢复、大文档恢复预算及长期使用继续单列。没有打包、推送或更新 Profile，goal active。
