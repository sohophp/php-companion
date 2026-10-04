# 声明默认值的类型补全

## 缺口与实现

当前基线 b89c00e 在 `function run(bool $flag = tr)` 和类型属性默认值中没有取得声明原生类型；参数／属性名称过滤并不能补齐默认值表达式。两种树模式首次语义测试均失败，日志 `/tmp/sophp-declaration-default-baseline.log` 保留。

completionValuePosition 现在识别 simple_parameter、property_promotion_parameter 和 property_element 的 default_value 范围，取原生类型并以最内层具名类型和源码位置解析。多个属性共享 property_declaration 类型；未声明类型不会向外借用调用或返回类型。沿用内层调用、运算、括号和 coalesce 的边界，左侧 coalesce 允许 nullable。不是为所有默认值重建推断规则，也未扩展 PHPDoc 默认值精化、任意未闭合声明恢复或默认值合法表达式候选过滤。

协议测试发现属性默认值 rea 被归为 class-member，readonly 排首位（`/tmp/sophp-declaration-default-protocol.log`）；修正默认值的 keyword context 为 expression，参数名称／类型位置仍保留原过滤。首次 context 协议又因测试假定 bool 候选必须带 Compatible value 失败：现有去重保留同名 Keyword，接受内容相同。测试改为严格核对唯一候选、首位、范围与插入文本，不依赖内部 detail；负例仍核对不产生额外 Compatible value。

## 证据与范围

完整语义 `/tmp/sophp-declaration-default-context-semantic.log`：82 文件／1421 项通过，63.90 秒，含 28 个声明默认值正反例（两种树模式）。覆盖 bool、nullable、枚举、union、多属性、构造提升、未声明类型、内层调用、unary 和括号。最后 coalesce-left 补充后单文件为 30 项定向测试，日志 `/tmp/sophp-declaration-default-coalesce.log`；不将该补充写成重新执行后的全量 1423 通过。

PHP 7.2／8.5 的独立 Composer 实项目 stdio 对未保存类型切换、默认值表达式、词中替换、唯一／首位及磁盘不变做两项参数化验收。coalesce 补充前 `/tmp/sophp-declaration-default-final-protocol.log`：2 通过、499 未选中，7.90 秒。首次 red 和 detail 假设失败的日志均保留；最后补充协议结果单独追加。

隔离 Linux VS Code 1.140.0、PHP 8.5 的参数 bool、属性 bool、属性 enum 和 promoted bool 四场景 × Enter／Tab 八次通过。实际可见首位、精确接受文本、光标、一次 Undo／Redo、磁盘不变均断言。宿主日志 `/tmp/sophp-declaration-default-visible-host.log` 退出 0；[结构化可见结果](completion-declaration-default-visible-2026-10-04.json)记录等待样本。Provider 预热后显式 trigger，不等同自动弹出、热查询预算、长期使用或真人 WSL。该 UI 在最后 coalesce-left 补充前执行，其四个场景未变。

此增量不声称完整 LSP、Windows/macOS、九版本、编辑 P95 或 C2 已完成。不打包、推送或更新 Profile；同一分支继续。


最终 coalesce-left 补验：单文件 30 项语义通过（2.04 秒），两版真实协议 2 项参数化测试／15 次未保存查询通过，499 其它测试未选中（8.24 秒，`/tmp/sophp-declaration-default-coalesce-protocol.log`）。当前语义／language-server 包及根 bundle 构建、定向 lint 与 diff 检查通过。没有重新执行整套 LSP 或性能测量；此前 1421 全量语义与八次 UI 的输入时间点仍明确保留。源码和全部记录留在同一分支，不为这一增量例行提交／打包。


## 默认值合法候选与第一类可调用对象

继续核对 PHP 官方 [参数默认值](https://www.php.net/manual/en/functions.arguments.php)、[new 初始化 RFC](https://wiki.php.net/rfc/new_in_initializers)、[静态闭包 RFC](https://wiki.php.net/rfc/closures_in_const_expr)和[第一类可调用对象](https://www.php.net/manual/en/functions.first_class_callable_syntax.php)。补全必须区分普通函数调用与 PHP 8.5 合法的 callable 引用，不能一律删掉函数名。

语义层提供有界 declarationDefaultCompletionContext，以 AST default_value 范围识别参数／属性，并在闭包和普通 callable 边界停止；闭包的内层参数默认值仍各自识别。服务器在这些位置撤回局部变量和裸变量；声明模板不混入，关键词限于常量表达式相关项。new 只在 PHP 8.1+ 参数默认值建议；static／static function 按 PHP 8.5 门槛。PHP 8.5 函数／静态方法候选接受为 name(...)，已有空 () 安全改为 (...)，已有 (...) 只补名称，已有真实实参不生成非法调用建议；保留常量及已支持的枚举值／枚举原生属性版本门槛。闭包体内的普通调用仍走原路径。

属性默认值里的 self:: 先前没有类作用域，导致静态方法候选缺失。memberTarget 仅在属性 default context 补最内层声明的访问来源，自己的私有常量／静态方法可见，外部类私有常量仍缺席。函数／方法候选的默认值兼容性按 Closure 身份，而不是调用返回值；没有 Closure 类型事实时保持 unknown。

过程中的 red 保留：首次包 typecheck 未先重建语义声明产物（`/tmp/sophp-default-legality-typecheck.log`），修正构建顺序后两包 build 与根 bundle 均通过。`/tmp/sophp-default-legality-baseline.log` 开始时用了旧包入口且随后有重建，不作为冻结输入的正式 baseline；既有 UI 中普通调用文本及定向 owner 协议失败另保留。`/tmp/sophp-default-legality-protocol.log` 的 self:: 静态方法缺失、`/tmp/sophp-default-legality-final-protocol.log` 的 static fun 被 typeContext 拦截均已定位修复。`/tmp/sophp-default-legality-closure-rank-semantic.log` 两条 Closure=unknown 的失败来自测试未加载 Closure 声明；现分为已知内建事实和事实缺失正反例，保留未知、不更改产品语义来猜类型。

最终定向 stdio `/tmp/sophp-default-legality-closure-rank-protocol.log`：5 项参数化测试通过、499 其它项未选中，15.88 秒；三版本合法候选 43 次、两版本类型刷新 15 次，合计 58 次查询。单文件语义 `/tmp/sophp-default-legality-rank-fixture.log`：58 项通过，2.29 秒。当前完整语义与最终可见接受结果结束后追加，不把早先 1443 全量或八次 callable UI 冒称最后组合输入的验收。

仍未统一全局／类常量、attribute 或 static local initializer 的候选约束；无法证明的未闭合声明恢复、其它平台、全量 LSP 和性能门槛继续开放。本批普通函数／默认值符号候选的类型兼容仍用于排序，不将类型未知候选猜测为错误并删除。真人 WSL 单列。


### 最终组合源码里程碑

当前完整语义 `/tmp/sophp-default-legality-final-semantic.log`：82 文件／1451 项通过，59.94 秒，其中声明默认值文件 58 项。最后产品构建包含默认值过滤、self:: 来源和 Closure 候选类型，三版本＋两版本共 5 项定向 stdio／58 次查询通过；定向 ESLint 与 diff 检查通过，未重新跑整套 LSP／性能。

当前隔离 Linux VS Code 1.140.0 callable 接受 `/tmp/sophp-default-callable-final-visible-host.log` 退出 0，四场景 × Enter／Tab 八次实际首位、精确 name(...) 文本、光标、一次 Undo／Redo、磁盘不变全部通过。场景分别为参数默认值、属性默认值、自己 private static 方法、已有空括号；[当前可见和 PHP 编译证据](completion-default-callable-visible-2026-10-04.json)保存实际接受文本。八份接受文本再由真实 PHP 8.5.9 `/usr/bin/php85 -l` 编译全部退出 0，只编译、不执行业务代码；自己的临时文件已清理。

默认值类型、合法候选、callable 引用与撤回的 readonly 两种试验记录合为本地源码里程碑 `feat(core): complete declaration defaults with valid expressions`。前文“未提交／未过滤”的批次状态按各段保留，不视为当前缺口均关闭。PHP 7.2／8.1／8.5 是定向协议，当前 UI 是 Linux 8.5；完整版本／平台、原 60 项、默认值未闭合恢复、其它 constant expression 位置、热／编辑预算、真人 WSL 与完整 LSP 未由本次证明。不打包、推送或更新 Profile；goal active。
