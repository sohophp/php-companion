# D59：PHP/HTML 区块中的未闭合补全

## 复现

acd08b2d 构建上的十次查询，覆盖保留／临时 CST、HTML 前缀、含不匹配括号的 HTML、函数体内切换区块、PHP 字符串中的 `?>` 和 HTML 光标。区块切换以及字符串中的普通关闭标签会阻止 callable 恢复；原有 HTML 光标负例保持无建议。查询不改变 revision／snapshot，记录 `/tmp/sophp-acd08-mixed-callable-probe.json`。

## 修改

取消按字符串包含 `?>` 拒绝恢复的判断，按解析器确认的 text、php_tag、php_end_tag 源码范围跳过非 PHP 区段。只缓存这些范围，按当前 SemanticFile 绑定，不持有语法节点；更新文档后使用新事实。注释及字符串仍按原解析事实处理。

首轮 56／60 通过：跨区块成员、变量及比较恢复已成功，但函数体内重新进入 PHP 时，标签仍挡住普通 return 的类型判断。另两项失败来自测试错误地要求有 PHP 语法错误时连表达式关键字上下文也为空；改为只要求 HTML 光标无候选，没有压制合法 PHP 位置的关键字。

局部预期类型前缀现在遮蔽确认的 HTML 和标签，保留源码偏移；**真实 PHP 关闭标签在这段临时前缀中保留语句结束作用**，防止把前一个区块的变量和后一个区块的 `=` 拼成赋值。原 160 字符前缀、131072 源码长度和普通恢复 16 层预算不变。临时关闭符及内部标识符不进入真实文档或权威事实。

## 当前验证

- 207 项定向语义通过，四文件；日志 `/tmp/sophp-mixed-callable-focused-current.log`。随后增加区块／类型刷新、捕获闭包和 Unicode HTML，当前新增 76 项全部进入完整回归。
- 当前完整语义 95 文件／2010 项全通过，60.41 秒；原会话 43066 退出 0，日志 `/tmp/sophp-mixed-callable-full-semantic.log`。无构建／宿主并行，未修改原超时门槛。
- 新增覆盖 HTML 前缀、区块之间、函数体切换、Unicode HTML、字符串／块注释／heredoc 中的标签；每组核对裸变量、字面量、关键字、函数／常量、变量前缀与详情、成员及 switch 值。HTML 光标、关闭 PHP 的行注释、伪装 PHP 的 HTML、未知内层调用、PHP 定界符不匹配、跨标签错误赋值和大小预算保持反例。查询检查 revision／snapshot 不变。
- PHP 7.2／8.5 配置 stdio 两项通过，520 项未选中不计通过，9.33 秒；原会话 79792 退出 0，日志 `/tmp/sophp-mixed-callable-protocol.log`。72 次功能请求加 52 次热查询准备／采样，共 124 次，包含未保存类型刷新、真实替换范围和递归函数名。这是服务器配置版本证明。
- 实际 PHP 7.2／8.5 `-l` 各通过 28 个闭合控制样例，并各拒绝两个跨区块错误赋值，共 56 正例／4 反例；原会话 33635 退出 0，记录 `/tmp/sophp-mixed-callable-cli-oracle.json`。7.2 反例属性声明使用 PHPDoc 而非不支持的原生属性类型。只编译，不执行；这些闭合控制不是未闭合编辑器输入的编译验收。
- 当前构建及定向 ESLint 通过；日志 `/tmp/sophp-mixed-callable-build.log`、`/tmp/sophp-mixed-callable-lint-current.log`。
- [隔离编辑器证明](completion-mixed-callable-visible-2026-10-04.json)：PHP 区块间字面量、函数体内 Unicode HTML 后的变量、字符串中标签后的函数调用及区块切换后的成员调用，各 Enter／Tab 共八次可见首位、精确文本、光标、Undo／Redo 与磁盘不变通过；原会话 85891 退出 0，日志 `/tmp/sophp-mixed-callable-visible-host.log`。private 成员未出现，内部标识符和关闭符未写入文档。文本刻意未闭合，不当编译验收；显式触发等待 134–277 ms，不当自动弹出或热查询 P95。
- 闭合控制及拒绝反例按实际运行时、输入 SHA-256 和编译退出码归档：[编译器控制记录](completion-mixed-callable-cli-oracle-2026-10-04.json)。

## 热查询范围

固定 96285 字节文档，其中 HTML 包含 96000 个括号／花括号字符，PHP 函数体及 return 尚未闭合。SHA-256 `df217df650b672c3bca0248079ed7cda79c8a1e30bedd937c7cb1741ac0bf34a`。每版本先准备文档，随后 25 次真实 stdio，前五次不计，后二十次计算 P95；每次检查兼容 `$flag` 首位。采样时没有其它构建／语义回归／宿主并行，也不修改文档。

PHP 7.2／8.5 P95 为 17.78／19.96 ms；准备请求后的首次采样 24.88／20.77 ms，不能算冷查询。每版本仅一组，证明该混合输入热查询低于 150 ms，不替代 D53 大型未保存编辑 P95 292.56 ms 的未完成预算、超过恢复长度预算的文档、自动弹出或长期使用。原始记录 `/tmp/sophp-mixed-callable-timing/`，当前输入及结果见 [测量归档](completion-mixed-callable-hot-query-2026-10-04.json)。

当前完整 LSP 资格仍绑定 a3678016 的 866 项。真实 WSL、全部平台／规模和连续编辑预算继续单列；本批没有打包、推送或更新 Profile，goal active。
