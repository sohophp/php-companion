# SoPHP 常用补全验收语料（冻结版）

日期：2026-09-28；声明补全场景于 2026-09-29 追加。`|` 表示光标；“只含”指该语法位置的 SoPHP 候选，其他已安装扩展须在隔离宿主中单独排除。原有 60 个场景是补全专项的固定验收集合，不能通过删掉失败场景降低完成门槛。用独立 Composer fixture 实现；Winstar 只作只读规模样本。原有 60 项均有通过的自动化证据；这不代替真实 WSL 编辑器验收。

| ID | 输入位置与操作 | 预期结果 |
| --- | --- | --- |
| K01 | 顶层 `$app = n|` | `new` 首位；无 HTML 缩写 |
| K02 | 顶层 `func|` | `function` 首位；无 `func_get_arg` |
| K03 | 顶层 `function|` | 无 `function_exists` 等调用建议 |
| K04 | 函数体 `retu|` | `return` 首位 |
| K05 | 函数体 `fore|` | `foreach` 首位 |
| K06 | 函数体 `thro|` | `throw` 首位 |
| K07 | 类体 `public func|` / `public function|`，另有 `Functionality` | 部分输入时 `function` 首位且仍可选属性类型；完整关键字时不再混入类名 |
| K08 | 表达式 `new n|` | 可创建的类型；不再建议关键字 `new` |
| K09 | `// retu|` | 无 PHP 代码候选 |
| K10 | PHP 字符串 `'func|'` | 无声明关键字 |
| S01 | `$service->ren|` | 仅可访问实例成员，正确方法优先 |
| S02 | `Service::cre|` | 仅可访问静态成员 |
| S03 | 外部对象的私有 `secret|` | 不建议私有成员 |
| S04 | 子类方法内 `$this->pro|` | 可见的继承 protected 成员出现 |
| S05 | `$service?->ren|` | PHP 8.0+ 的 nullsafe 接收者可见成员出现；PHP 7.2/7.4 不给出该语法候选，普通 `->` 保留 |
| S06 | `$service->factory()->ren|` | 用已证明返回类型补全成员 |
| S07 | Union 接收者 `$value->com|` | 只把全部可能类型共有的安全成员作为确定建议 |
| S08 | PHPDoc `@method` 或 `@property` 成员 | 已证明的魔术成员可补全，签名正确 |
| S09 | 顶层 `get_user_co|` | 当前命名空间函数优先于外部同名候选 |
| S10 | 函数与常量同前缀 | 两种有效候选均可选，各自导入编辑正确 |
| V01 | 同一函数先赋值 `$total` 后输入 `$to|` | 建议 `$total` |
| V02 | 另一函数的 `$total`，当前函数输入 `$to|` | 不泄漏另一作用域变量 |
| V03 | 普通实例方法输入 `$th|` | 建议 `$this` |
| V04 | 静态方法输入 `$th|` | 不建议 `$this` |
| V05 | 闭包显式 `use ($outer)` 后输入 `$ou|` | 建议 `$outer` |
| V06 | 箭头函数引用外层 `$outer` | 外层变量可见 |
| V07 | `foreach` 的键、值变量后输入前缀 | 两者按作用域出现 |
| V08 | 解构赋值后的局部变量 | 已绑定变量出现，未绑定名字不出现 |
| V09 | PHP 插值字符串中的 `$na|` | 补全局部变量；普通字符串文字不触发 |
| V10 | `send(string $message)` 中输入 `$|` | 已证明为 string 的局部候选排在无关 int 前 |
| T01 | `new Ser|` | 建议可实例化且构造器可访问的类 |
| T02 | `class Child extends Bas|` | 只建议合法父类 |
| T03 | `class Child implements Con|` | 只建议接口 |
| T04 | `catch (Run|` | 已知普通非异常类不出现 |
| T05 | `#[Aud|]` | 只建议目标位置可用的 Attribute |
| T06 | 原生参数或返回类型 `Ser|` | 项目类型和合法内建类型按版本显示 |
| T07 | PHPDoc `@param Ser| $value` | 建议项目类型；说明文字不建议 |
| T08 | `new \\Vendor\\Ser|` | 建议限定类型，不额外插入 `use` |
| T09 | 分组 `use Vendor\\{Ser|}` | 插入后保留分组括号且无重复导入 |
| T10 | 同一 fixture 的 PHP 7.2/8.5 | `enum`、`readonly` 等关键字，以及 enum 类型和成员只在合法版本建议；普通类与方法保留 |
| A01 | 调用 `f(fi|: ...)` | PHP 8.0+ 只建议尚未使用的命名参数；PHP 7.2/7.4 不建议 `name:`，仍可补全普通表达式 |
| A02 | 嵌套调用中的命名参数 | 使用内层签名，不混入外层参数 |
| A03 | Attribute 构造器的命名参数 | 使用目标 Attribute 构造器签名 |
| A04 | string 参数值处输入 `$` 或留空 | 兼容的本作用域变量优先，未知类型不被误删；空白位置和命名实参可直接插入变量，不枚举无前缀项目函数 |
| A05 | `array{owner: User}` 形状实参输入键 | 建议 `owner`，插入引号及 `=>` |
| A06 | 可选形状键 | 可选键可建议；已填写键不重复 |
| A07 | 嵌套形状值位置 | 建议内层键，不混入外层键 |
| A08 | enum 参数或常量取值位置 | 只优先推荐可证明兼容的取值 |
| A09 | 已知 Symfony 路由名或路径参数 | 沿现有 Provider 返回项目值 |
| A10 | 动态、歧义或未完成签名 | 不伪造参数值或数组键 |
| E01 | `funct|ion` 接受 `function` | 完整词只出现一次，后接一个空格 |
| E02 | `getUs|erCount` 接受成员建议 | 不留下重复后缀 |
| E03 | `guc|` 匹配 `getUserCount` | 缩写候选可见且排在不相关项前 |
| E04 | `guc|` 匹配 `get_user_count` | snake_case 缩写候选可见 |
| E05 | `user|` 匹配 `getUserCount` | 三字以上词中匹配可见，短单字不引入大量噪声 |
| E06 | 未保存类型 A→B→A 快速改动 | 最终列表只属于当前版本 |
| E07 | 关闭后以相同版本号重开不同内容 | 旧请求不覆盖新文档 |
| E08 | 同一 `.php` 文件 PHP/HTML 交替区域 | PHP 候选只在 PHP 区域，HTML 缩写不混入 PHP |
| E09 | 接受函数调用与常用语句模板 | Enter/Tab 后括号、占位符、光标和 Undo 正确 |
| E10 | Composer vendor 冷、热及连续输入 | 热 LSP P95 ≤ 150 ms；另记录 Workbench 可见列表等待 |

## 声明补全追加验收场景

以下 D01–D26 是追加场景，不能沿用上文原有 60 项的通过状态。每项须同时核对正确候选及无关候选缺席。

| ID | 输入位置 | 预期结果 |
| --- | --- | --- |
| D01 | 顶层 `clas|` | `class` 首位，无 `class_exists` |
| D02 | 顶层 `inter|` | `interface` 首位，无 `interface_exists` |
| D03 | 顶层 `trai|` | `trait` 首位，无 `trait_exists` |
| D04 | PHP 8.5 顶层 `enu|` | `enum` 首位，无 `enum_exists` |
| D05 | 顶层 `final cla|`、`readonly cla|` | `class` 首位，修饰符后的声明有效 |
| D06 | 类体 `public func|`、枚举体 `ca|` | 分别建议 `function`、`case`，无通用函数 |
| D07 | `class C|` / `interface I|` / `trait T|` / `enum e|` | 无无关函数、常量或模板 |
| D08 | `function f|` / `public function f|` | 无通用函数、常量或模板 |
| D09 | `const F|` / `public const F|` / 枚举 `case R|` | 无表达式候选 |
| D10 | `private string $v|` / `function f(string $v|)` | 无跨作用域变量或调用建议 |
| D11 | `OrderService.php` 的 `class Ord|` | 仅建议文件名 `OrderService`，接受后文本正确 |
| D12 | 文件名无效、重名或文件已有另一具名类型 | 不提供文件名候选 |
| D13 | `new Ser|` / `extends Bas|` / `implements Con|` | 类型引用候选保留，类别正确 |
| D14 | `use Vendor\\Ser|` / `use function Vendor\\run|` / `use const Vendor\\LIMIT|` | 导入候选保留，不误判为声明名称 |
| D15 | `Foo::class C|` / `new class C|` | 不建议文件名作具名类声明 |
| D16 | `switch ($value) { case R|` | 保留表达式候选，不按枚举 case 名处理 |
| D17 | 参数默认值、函数体、构造调用中的 `$v|` | 正常变量或表达式补全保留 |
| D18 | PHP 7.2 的 `enu|`、PHP 8.5 的 `enu|` | 前者不建议 `enum` 关键字；后者建议 |
| D19 | `funct|ion`、`en|um`、`class C|lassName` | 词中接受不重复后缀或空格 |
| D20 | `enu`→`enum e` 和 `clas`→`class C` 连续输入 | 旧候选不残留到名称位置 |
| D21 | 声明行后仍有 `if`、`use` 等源码 | 未完成语法仍保持正确位置判断 |
| D22 | 注释、普通字符串及 PHP/HTML 交界 | 不输出 PHP 声明候选 |
| D23 | F2 与 Shift+F6 在 PHP 中 | 调用相同安全重命名流程；F6 不被改作重命名 |
| D24 | 同名 PSR-4 类型重命名 | 预览、类型及文件改名、引用、取消、Undo/Redo 正确 |
| D25 | Ctrl+L 与各语言格式化快捷键 | Ctrl+L 未由 SoPHP 占用；仍选择当前行 |
| D26 | `namespace App|` / `namespace App\\Sub|` | 无通用函数和常量候选；`use` 导入仍走引用补全 |
| D27 | PHP 8.5 顶层 `e|`→`enu|`→`enum|`，前有类、后有代码 | 每一步可见 `enum`，完整词不显示 `enum_exists`；PHP 7.2 不建议 `enum` |
| D28 | 类体 `p|`→`pu|`→`pub|` | `public` 首位；到 `pu` 后不混入 `putenv`、`PHP_URL_*` |
| D29 | 类体 `public function __con|` | 建议 `__construct`；Enter 后为 `__construct()`，全局函数声明不提供魔术方法 |
| D30 | 函数体 `retu|` 后接受 `return` | 若后面直接换行，插入 `return `，表达式可接着输入 |

### 魔术方法和声明边界追加场景

| 编号 | 场景 | 预期 | 执行映射 |
| --- | --- | --- | --- |
| D31 | 当前类、Trait、interface、匿名类已有魔术方法及词中修改 | 排除其它已声明方法，保留当前编辑的方法；大小写比较一致 | S `magic-declaration-completion.test.ts`；L `magic-declaration-stdio.test.ts`；H `magicDeclarationAcceptance.ts` |
| D32 | 子类方法名称：父类／祖父／Trait 的 final 魔术方法与 private 例外 | 不建议不能重写的名字；未知、重复声明和 mixin 不伪造继承限制 | S `inherited-final-magic.test.ts`；L `inherited-final-magic-stdio.test.ts`；H `inheritedFinalMagicAcceptance.ts` |
| D33 | PHP 8.3 Trait `as final` 有别名／无别名、注释及 Unicode | 正确解析 final 和原文范围；旧版本报告版本要求，非法修饰符组合仍报语法错 | Parser `trait-final-adaptation.test.ts`；S/L 同 D32 |
| D34 | 冷 PSR-4 父类，未保存 final／非 final 和第三文件 Trait 别名切换 | 每次建议撤回／恢复；磁盘不变；取消或过期版本不复用旧结果 | L `hydrates cold PSR-4 parents and refreshes their unsaved final methods`；独立 `check-cold-parent-completion-races.mjs` |
| D35 | enum 方法 `__|`／`__ca|`／`__inv|`、已有方法、随后普通类 | PHP 8.1+ 只提供允许的三个魔术方法；构造和析构不出现，PHP 7 不提供枚举候选 | S enum list cases；L `enum-magic-declaration-stdio.test.ts`；H `enumMagicAcceptance.ts` |
| D36 | public／private／protected／static／换序／大小写修饰符后的方法名称 | 只推荐适用名字；不擅自改已有可见性；保留版本、去重及继承 final 过滤 | S `magic-modifier-completion.test.ts`；L `magic-modifier-stdio.test.ts` |
| D37 | 接受 __callStatic／__set_state：有／无 static、类／枚举、已有参数和注释 | 必须 static 的候选同次补上；已有 static 不重复；准确文本、光标及一次 Undo/Redo，磁盘不变 | L D36；H `magicModifierAcceptance.ts` |
| D38 | 声明关键字与名称间的块／行注释、换行与 Unicode；导入、成员和字符串反例 | 正确识别声明并保留偏移；引用位置不当作声明；1500 注释文件热 stdio P95 ≤150 ms | S D36 的 31 项上下文／边界；L 两版各 25 次注释密集文档查询 |

执行映射：语义层与匹配规则在 `packages/semantic/test`；协议候选、版本与编辑范围在 `packages/language-server/test/stdio.test.ts`；实际建议列表及接受文本在 `test/extension/suite/c1.ts` / `c1Ui.ts`。每阶段报告本表的通过、失败、未执行数量和最短复现，不能把源码测试算作真实 WSL 编辑器验收。

## 内置类型与候选说明追加回归（2026-10-01）

保留上述冻结场景，追加以下固定编辑链，避免后续修改只检查新功能而遗漏旧结果撤回。`S`、`L` 沿下文的语义／stdio 映射；本节 `H2` 对应 `test/extension/suite/c2.ts`。真实 WSL Profile 与可见列表人工使用仍单列。

| ID | 输入与操作 | 必须核对的正例和反例 | 可运行证据 |
| --- | --- | --- | --- |
| R01 | `parse_url($url)`／PORT／HOST；未保存切换 | 可选数组字段；PORT 为 int，HOST 为 string，false／null 保留；项目常量遮蔽生效 | S `selects common builtin overloads`；L `refreshes parse_url component`；H2 `verifyParseUrlContractFeedback` |
| R02 | explode／str_split → 整数数组 → 恢复，排除 false 后 foreach | 元素 string → int → string；PHP 7 返回保留 false；项目同名函数不继承内置类型 | S `propagates string split list elements`；L `refreshes string split element`；H2 `verifyStringSplitFeedback` |
| R03 | preg_split 默认／组合 OFFSET_CAPTURE 标志及命名参数 | 普通元素 string，偏移元素二元数组；未知 flags 保留联合，常量遮蔽和同名函数生效 | S `selects preg_split element contracts`；L 与 H2 同 R02 的扩展编辑链 |
| R04 | 选中变量候选并 resolve，随后编辑／关闭／同版本重开 | 新候选 detail 与当前 Hover 一致；旧 detail 撤下，插入文本不变 | L `refreshes string split element`；H2 请求真实 Provider 解析候选 |
| R05 | 参数重新赋值，或经过 unknown／eval／unset，再查询变量说明 | 明确重赋值使用当前值；未知修改不沿用入口类型；不泄漏其它作用域变量 | S `provides proven variable completion details` |
| R06 | PHPDoc 标量默认值、大小写字符串及弱类型转换条件 | 默认条件与大小写准确；不能以源字符串字面量误选运行时转换后的返回分支 | S `preserves scalar literal and default conditions` |
| R07 | 实例／静态属性赋值；string → int → Undo／Redo；bool、PHPDoc 字面量和 setter | 正确类型候选优先、未知候选保留；联合来源、不可访问与 readonly 不猜测；未保存改动撤回旧排序 | S `uses declared property write types` / `keeps property assignment value proof scoped`；L `ranks property assignment values`（PHP 7.2／8.5）；H2 `verifyPropertyAssignmentCompletion`；[报告](reports/c2-property-expected-completion-2026-10-01.md) |
| R08 | `$value ?: $fallback`，空值／false／零／空数组、普通及特殊对象；未保存回退修改与 Undo/Redo | 只保留可达且已证明的结果；未知分支不猜测；旧成员撤回；补全、定义与参数诊断分别按既有证明范围核验 | S `shorthand ternary` 两项；L `refreshes shorthand ternary completion and navigation`（PHP 7.2／8.5）；H2 `verifyElvisCompletion`；[报告](reports/c2-shorthand-ternary-values-2026-10-01.md) |
| R09 | 局部赋值后穿插另一变量的具名字面量构造；引用、动态作用域与非字面量参数反例 | 可证明的未逃逸局部保留类型；可能修改变量的路径保持 unknown；未保存修改撤回旧成员 | S `independent literal constructor`、`constructor-crossing proofs`；L 和 H2 扩充 R08 用例；[报告](reports/c2-independent-constructor-values-2026-10-01.md) |
| R10 | 按值函数调用后的局部类型；位置/命名/variadic 参数、引用编辑和重复声明反例 | 未逃逸局部保留类型；引用声明撤回补全、Definition 和诊断；未知和动态调用不猜测 | S `value-parameter calls`、`call-crossing proofs`；L `retracts value-call completion`（PHP 7.2／8.5）；H2 `verifyValueCallCompletion`；[报告](reports/c2-value-call-local-types-2026-10-01.md) |
| R11 | `$value =& slot()`，函数/方法引用返回及注释；普通值复制、属性引用与引用回调为边界 | 共享绑定不能绕过严格证明取旧类名；未保存修改撤回成员、Definition 和错误类型诊断，值复制保持可用 | S `binding a function or method reference return`；L `reference-return binding edit`（PHP 7.2／8.5）；H2 `verifyReferenceReturnCompletion`；[报告](reports/c2-reference-return-bindings-2026-10-01.md) |
| R12 | `$value = new Repo()` 后的位置/具名引用参数、引用 variadic、未知/动态调用；按值调用和后续赋值为正例 | 类名回退不得复用已可能失效的赋值；引用编辑同步撤回成员、Definition 和诊断；保留参数合同与已验证断言 | S `direct class assignments after possible reference calls`；L 扩充 `retracts value-call completion` 为 PHP 7.2／8.5 × 直接/Elvis 四项；H2 `verifyValueCallCompletion` 改用直接赋值；[报告](reports/c2-direct-assignment-reference-calls-2026-10-01.md) |
| R13 | 合法重载的当前参数类型一致；位置/具名/空白实参、函数返回值和 bool 值；冲突与重复声明为反例 | 一致合同参与排序，未知候选保留；冲突不猜测；未保存修改和 Undo/Redo 刷新顺序 | S `agreed overload parameter type`；L `ranks agreed overload arguments`（PHP 7.2／8.5）；H2 `verifyOverloadExpectedCompletion`；[报告](reports/c2-overload-expected-arguments-2026-10-01.md) |
| R14 | 泛型函数/方法由其它参数确定当前值类型；位置/具名/空白值、残缺变量、约束及冲突反例 | 已证明泛型合同参与排序；当前值不反推自身类型；未知候选保留，未保存编辑和 Undo/Redo 刷新 | S `specializes generic argument completion`；L `refreshes generic argument ranking`（PHP 7.2／8.5）；H2 `verifyGenericExpectedCompletion`；[报告](reports/c2-generic-expected-arguments-2026-10-01.md) |
| R15 | 泛型调用右括号未闭合，已有位置/具名参数与当前残缺变量/空白值；此前参数语法损坏或未知为反例 | 类型排序在关闭→未闭合→类型修改→关闭中刷新；不把错误参数片段作为证明 | S `specializes generic argument completion`；L `refreshes generic argument ranking`（PHP 7.2／8.5）；H2 `verifyGenericExpectedCompletion`；[报告](reports/c2-unclosed-generic-arguments-2026-10-01.md) |
| R16 | 泛型调用后续必需参数尚未输入；关闭/未闭合、具名换序、类型修改；完整调用缺参反例 | 当前值使用已证明类型排序，未知候选保留；完整调用仍报缺参且不伪造结果类型，补齐后恢复 | S `ranks partial generic arguments`；L `refreshes generic argument ranking`（PHP 7.2／8.5）；H2 `verifyGenericExpectedCompletion`；[报告](reports/c2-partial-generic-arguments-2026-10-01.md) |
| R17 | 局部变量经过明确目标的按值方法；final 类、final/private 方法、具名/nullsafe/static variadic；引用、逃逸及动态派发反例 | 补全、Definition 与可证明类型诊断保留同一事实；引用编辑与 Undo/Redo 撤回/恢复；不声称方法无副作用 | S `across methods with proven value parameters`；L `retracts value-method completion`（PHP 7.2／8.5、直接/Elvis）；H2 `verifyMethodValueCallCompletion`；[报告](reports/c2-method-value-call-types-2026-10-01.md) |
| R18 | 直接构造普通类对象的按值方法、继承方法、nullsafe 与连续调用；参数对象、工厂、条件创建、late static 和引用逃逸反例 | 实际目标可证明时保留局部类型；引用编辑同步撤回补全、定义与诊断，Undo/Redo 恢复；不把声明类型当作确定目标 | S `proves value method dispatch`；L `retracts exact constructed-method completion`（PHP 7.2／8.5、直接/Elvis）；H2 `verifyExactMethodValueCallCompletion`；[报告](reports/c2-exact-method-dispatch-2026-10-01.md) |
| R19 | 按值调用的空／嵌套／长语法数组、普通变量元素与命名实参；引用、展开、求值副作用和深度／节点预算反例 | 调用后补全、定义与诊断保留局部类型；引用参数编辑及 Undo/Redo 撤回／恢复；不放行集合里的引用或一般副作用 | S `preserves local types across value calls with arrays`；L `retracts array-value-call completion`（PHP 7.2／8.5、直接/Elvis）；H2 `verifyArrayMethodValueCallCompletion`；[报告](reports/c2-array-value-call-types-2026-10-01.md) |
| R20 | 按值实参中的限定常量／别名、类常量／枚举、括号、算术／位运算和条件表达式；嵌套调用、写入、增减、动态类及引用反例 | 局部类型跨调用保留；项目覆盖使用自身返回合同，引用覆盖撤回、删除覆盖恢复内置合同；参数引用编辑与 Undo/Redo 一致 | S `retains local types through value calls with constants`；L `retracts expression-value-call completion`（PHP 7.2／8.5、直接/Elvis）；H2 `verifyExpressionMethodValueCallCompletion`；[报告](reports/c2-expression-value-call-types-2026-10-01.md) |
| R21 | static 方法／闭包、修饰符组合、static 返回类型和无关引用参数；static/global 局部、引用参数／别名／捕获反例 | 声明头不误触共享局部风险；补全、定义和诊断在引用编辑与 Undo/Redo 后正确撤回／恢复 | S `distinguishes static declaration modifiers from shared local bindings`；L `retracts static-scope value-call completion`（PHP 7.2／8.5、直接/Elvis）；H2 `verifyStaticScopeMethodValueCallCompletion`；[报告](reports/c2-static-scope-value-types-2026-10-01.md) |
| R22 | 注释／普通字符串／Nowdoc 中 static/global/eval 等文字；真实引用、动态变量、加载语句及可执行插值反例 | 非代码前缀不撤回局部成员；引用签名编辑、恢复与 Undo/Redo 正确刷新 | S `distinguishes literal prefix text`；L `retracts literal-prefix value-call completion`（PHP 7.2／8.5、直接/Elvis）；H2 `verifyLiteralPrefixMethodValueCallCompletion`；[报告](reports/c2-local-prefix-syntax-2026-10-01.md) |
| R23 | 局部赋值后独立字符串赋值含字面文字 $value；单引号、转义双引号与真实插值反例 | 普通文字不撤回局部成员；引用签名编辑、定义与诊断、Undo/Redo 同步刷新 | S `distinguishes literal prefix text` 追加矩阵；L `retracts post-assignment-literal value-call completion`（PHP 7.2／8.5、直接/Elvis）；H2 `verifyPostAssignmentLiteralMethodValueCallCompletion`；[报告](reports/c2-post-assignment-literal-types-2026-10-02.md) |
| R24 | 热查询、同长度注释/global 编辑、删除重开、完整／声明快照替换及逆序位置查询 | 前缀语法检查可复用但不串文件、作用域、位置或源码代次；危险事实撤回，Undo/Redo 恢复 | S `refreshes warmed prefix proofs`；L `refreshes cached local prefix proofs`（PHP 7.2／8.5）及热缓存恢复；H2 `verifyPostAssignmentLiteralMethodValueCallCompletion` 追加等长编辑链；[报告](reports/c2-local-prefix-cache-2026-10-02.md) |
| R25 | 调用文件不变，另一文件函数／方法签名快照按值→引用→按值；非法快照与跨文件未保存编辑 | 旧按值调用证明撤回并恢复，拒绝的快照不改事实，调用文档保持不变，Undo/Redo 一致 | S `withdraws warmed value-call proofs`（函数／方法、完整／声明恢复）；L 六项缓存恢复回归；H2 `verifyCrossFileValueSignatureCompletion`；[报告](reports/c2-restored-value-signatures-2026-10-02.md) |
| R26 | array_column 读取公开标量／集合属性，属性类型修改与恢复、嵌套 foreach；私有／静态／魔术属性和动态键反例 | 已声明属性类型用于变量说明、排序与严格参数诊断，未保存修改和 Undo/Redo 撤回／恢复；不推断动态属性 | S `propagates declared` 三项与 `preserves declared collection property columns`；L `refreshes declared object column`（PHP 7.2／8.5）；H2 `verifyObjectColumnFeedback`；[报告](reports/c2-object-column-property-types-2026-10-02.md) |
| R27 | array_column 读取 Row<Item> 的 T 属性、继承与跨 namespace 别名、null／索引整行；未知、约束与参数数量反例 | 验证泛型后复用成员类型，普通／泛型 PHPDoc 修改撤回并恢复 Hover、补全说明、排序与诊断 | S `specializes generic object row columns` / `preserves aliased generic rows`；L R26 追加普通／泛型 × PHP 7.2／8.5；H2 `verifyObjectColumnFeedback` 泛型分支；[报告](reports/c2-generic-object-column-types-2026-10-02.md) |
| R28 | 普通／简写／嵌套三元、括号、条件中的内层调用；返回、变量／属性赋值位置；string→int→Undo/Redo | 条件不使用外层结果合同，值分支按返回／参数／赋值合同排序，嵌套调用使用自身签名，候选不被误删 | S `ranks variables in the correct conditional position` 14 项；L `conditional completion contracts`（PHP 7.2／8.5）；H2 `verifyConditionalCompletion`；[报告](reports/c2-conditional-completion-context-2026-10-02.md) |
| R29 | 外层 string／int 参数内的取反、比较、转换、算术操作数，以及内层调用、??、直接 return；未保存合同修改与 Undo/Redo | 撤回结果合同对操作数的错误排序，保留所有变量；内层调用与取值合同继续排序 | S `keeps operand completion separate` 九项；L `withdraws result contracts from operand completion`（PHP 7.2／8.5）；H2 `verifyOperandCompletion`；[报告](reports/c2-operand-completion-context-2026-10-02.md) |
| R30 | 显式闭包／箭头 return、外层调用中的回调、内层调用、条件操作数、按值／引用捕获、unset 与词法别名；string→int→Undo/Redo | 自身返回合同排序，不继承外层实参类型；未知事实不猜测，unset 候选撤回 | S `callback-return-completion.test.ts` 17 项；L `ranks callback values by their own return contract`（PHP 7.2／8.5）；H2 `verifyCallbackReturnCompletion`；[报告](reports/c2-callback-return-completion-2026-10-02.md) |
| R31 | 末尾无分号、未闭合闭包／调用、跨文件返回别名、外层变量、非法结尾；未保存类型修改与 Undo/Redo | 隔离恢复合法回调补全，不泄漏外层变量，不发布修复事实；错误或超预算时不猜测修复 | S `recovers trailing callback completion` 等九项；L `recovers trailing callback values`（PHP 7.2／8.5）；H2 `verifyTrailingCallbackCompletion`；[报告](reports/c2-trailing-callback-completion-2026-10-02.md) |
| R32 | 闭包／箭头捕获变量说明、末尾不完整输入、引用／eval／unset／未知调用和重新赋值；关闭及同版本重开 | 候选与说明复用类型证明；未知说明撤回，不退回外层事实，拒绝旧版本说明 | S `callback-completion-details.test.ts` 12 项；L `resolves callback variable details`（PHP 7.2／8.5）；H2 `verifyCallbackCompletionDetails`；[报告](reports/c2-callback-completion-details-2026-10-02.md) |
| R33 | 闭包、箭头、普通函数与方法的末尾部分／空成员前缀；类型遮蔽、私有成员、静态 this、类内变量说明；Item→Other→Undo/Redo | 隔离恢复使用自身参数类型与既有可见性，旧类型成员撤回，不发布补齐事实 | S `trailing-callback-members.test.ts` 13 项；L `recovers trailing callable members`（PHP 7.2／8.5）；H2 `verifyTrailingCallableMembers`；[报告](reports/c2-trailing-callable-members-2026-10-02.md) |
| R34 | ?? 两侧、可空左值，match 取值／default／嵌套分支与 subject／标签，内层调用及变量／属性赋值；string→int→Undo/Redo | 取值继承结果合同，条件不借用结果类型，可空值及其它候选保留；不修改项目事实 | S `branch-value-completion.test.ts` 17 项；L `ranks coalescing and match value branches`（PHP 7.2／8.5）；H2 `verifyBranchValueCompletion`（完整 Core C2 通过）；H1 `verifyVisibleBranchValues`（PHP 8.1／8.5 各 20 次、7.2 八次可见列表通过）；[报告](reports/c2-branch-value-completion-2026-10-02.md) |
| R35 | 三元／??／match 取值中的数组键和值，深层字段路径、返回／赋值及长数组语法；条件／未知调用／回调反例；引号筛选、Tab 与未保存键合同 | 共享结果合同，只建议证明的字段；不把协议返回当作可见；替换不重复引号，旧键随 Undo/Redo 撤回 | S `branch-shape-completion.test.ts` 34 项；L `shape keys through value branches`（PHP 7.2／8.5）；H2 `verifyBranchShapeCompletion`；H1 `verifyVisibleBranchShapes`（8.5 20 次、7.2 16 次及 Tab／Undo/Redo 通过）；[报告](reports/c2-branch-shape-completion-2026-10-02.md) |
| R36 | 联合数组形状的共有键、字面量值、嵌套字段、可空原生参数、未保存合同与 Undo/Redo；分支独有字段、宽数组及原生冲突负例 | 每个分支共同证明的字段可提示；合并字段值，遵守现有类型预算，替换保持引号 | S `union-shape-completion.test.ts` 27 项及全量 794/794；L `refreshes union shape` PHP 7.2／8.5；H2 完整 Core C2、`verifyUnionShapeCompletion` 通过；H1 `verifyVisibleUnionShapes` PHP 7.2／8.5 共 12 次及 Tab／Undo/Redo 通过；完整 421 协议通过、零跳过，十六项终态输入一致；[报告](reports/c2-union-shape-completion-2026-10-02.md) |
| R37 | 实参／return／赋值／方法中未闭合的数组键和值，紧邻 `=>` 的引号、联合合同、字符串位置候选隔离、未知合同及 selector 负例 | 原始偏移和文件事实不变，候选不混入函数常量，接受不写入临时括号，未保存合同可撤回 | S `unfinished-shape-completion.test.ts` 58 项及产品全量 852/852；L `recovers unfinished shape` PHP 7.2／8.5；H2 完整 Core C2、`verifyUnfinishedShapeCompletion`；H1 `verifyVisibleUnfinishedShapes` PHP 7.2／8.5 共 32 次、Tab／Undo/Redo 通过；完整 423/423 协议通过，十九项终态输入一致；[报告](reports/c2-unfinished-shape-completion-2026-10-02.md) |
| R38 | 字符串键／值中的标点、中文、转义引号、嵌套路径、词中光标和双引号美元符号 | 候选与替换范围准确，已有键过滤，接受文本含义不变，注释／HTML／插值不猜测 | S `quoted-prefix-completion.test.ts` 58 项、产品全量 910/910、PHPDoc 21/21；L `matches punctuation unicode` PHP 7.2／8.5；H1 `verifyVisibleQuotedPrefixes` 两版本 32 次、Tab／Undo/Redo 通过；H2 完整 Core C2 通过，二十七项宿主终态一致；完整 425/425 协议通过，二十七项终态一致；[报告](reports/c2-quoted-prefix-completion-2026-10-02.md) |
| R39 | 已知数组读取下标，局部／参数／函数返回／属性／foreach、嵌套／联合／可选键、空下标、中文／转义和未闭合输入 | 只插入键字符串，未知调用／动态绑定不猜，旧合同撤回，副本恢复不污染 revision | S 新文件 79 项、全量 989/989；L PHP 7.2／8.5 各 28 状态；H1 两版本 48 次可见列表、Tab／Undo/Redo；H2 完整 Core C2；30 项终态一致；当前完整 427 stdio 未重跑；[报告](reports/c2-array-access-completion-2026-10-02.md) |
| R40 | 打开多份 PHP 文档后的 Symfony 未保存事件引用与 Undo，容量外撤回与恢复 | 512 份以内的完整快照不误撤回，513 份不截断或保留旧事实，字符预算不变 | 契约 14 项、Provider／宿主 41 项、真实 stdio 2／131／512→513→512 文档；实际 Core／Symfony 完整 C3 在 133 份输入通过；37 项终态一致；[报告](reports/c3-document-snapshot-capacity-2026-10-02.md) |
| R41 | 光标后仍有源码的未闭合数组读取，已有括号／下一语句／块闭合／实参／嵌套与单、双引号 | 接受只替换键前缀，后续源码与事实不变；无法完整恢复时不猜；规模性能待修 | S 新文件 25 项、全量 1014/1014；L 两版本各 42 状态；H1 两版本 76 次可见列表／Tab／Undo/Redo，H2 完整 Core C2；38 项终态一致；10k 探针超预算；[报告](reports/c2-middle-array-access-completion-2026-10-02.md) |
| R42 | 10,000 文件下的未闭合补全恢复与跨文件形状更新 | 保留完整事实与公开查询行为，省去无关背景索引重建，P95 ≤ 150 ms | S 全量 1015/1015；400 次热查询 P95 11.77–15.62 ms；六项 L、完整 Core C2、两版本 76 次可见 Tab／Undo/Redo，38 项终态一致；[报告](reports/c2-recovery-index-performance-2026-10-02.md) |
| R43 | 已进入处理器的补全请求收到显式取消，随后在同文档重新请求 | 被取消结果严格为空，未取消的新请求正常；未知 ID 取消不影响其它请求 | 独立真实 LSP 六场景（两 PHP 版本 × 三索引模式）、脚本 ESLint 与 38 项产品输入一致；不计入运行中的 429 项；[报告](reports/c2-completion-cancellation-2026-10-02.md) |
| R44 | 独立路由 Provider 等待期间关闭并以同 URI／同版本重开消费文档 | 名称和路径参数旧候选撤回，新前缀不被旧请求覆盖；Definition 既有行为保持 | 基线 12 项失败、六项反例正确；正式 18 项、十项已有协议和可见 Route Status 宿主通过，40 项终态一致；[报告](reports/c2-route-reopen-completion-2026-10-02.md) |
| R45 | 未保存 A→B 接收者修改后语言服务器崩溃重启，再继续编辑 B→A | 新 PID 的补全／定义保留未保存 B，磁盘仍是 A，后续编辑可用 | Linux Core-only 独立宿主、PID 证据、严格缓冲区／磁盘文本、定义落点、Lint、类型检查和原 40 项输入一致；[报告](reports/c4-unsaved-completion-restart-2026-10-02.md) |
| R46 | 完整解析／快照／声明快照／仅声明的跨文件属性、函数与嵌套函数返回，消费方中间未闭合数组读取 | 正确键、原输入和消费快照保持，后台完整事实与 eager 相等，允许正常按需体加载 | 新语义 12/12 与 Lint；主产品不变；R44 完整 429/429 零跳过、40 项产品及 R45 工具终态一致；中间创建数组键／值另有八项失败基线；[报告](reports/c2-cached-array-recovery-2026-10-02.md) |
| R47 | 文件中间未闭合的数组创建键／值，实参／返回／赋值／方法上下文及单双引号 | 已有括号和后续源码保留；精确候选，未知／混合类型及其它语法错误不猜测 | 新语义 24 项、完整 1051/1051、两版定向 LSP、完整 C2、两版 C1 共 64 次可见列表／精确 Tab／Undo/Redo；10k 文件 800 查询 P95 18.51–45.54 ms；[报告](reports/c2-middle-array-literal-completion-2026-10-02.md) |
| R48 | 跨文件函数／方法契约分别经完整解析、完整快照、声明快照及仅声明加载后，中间数组键／值恢复 | 精确候选和替换范围；消费源码／快照及契约源码保持，允许正常延迟加载 | 正式脚本 16/16、ESLint 及 R47 终态完整协议 429/429 零跳过通过；42 项产品和正式工具终态一致；[报告](reports/c2-cached-array-literal-completion-2026-10-02.md) |
| R49 | 已有 `=>` 的数组键编辑，关闭引号完整／缺失、四上下文及单双引号 | 保留原箭头及尾部，不重复插入 `=>`；非法恢复不回落到错误范围，未知／注释／HTML 保守 | 共享 24 项、完整语义 1075/1075、四项两版定向 LSP、完整 C2、两版 C1 共 32 次目标可见列表／精确 Tab／Undo/Redo；10k 文件 800 查询 P95 11.56–23.04 ms，45 项终态一致；[报告](reports/c2-existing-array-arrow-completion-2026-10-02.md) |
| R50 | 数组键／字面量值的词中光标，四上下文及单双引号，关闭引号完整／缺失 | 整词只保留一次，原箭头和尾部保持；未知形状等反例保守 | 新共享 40 项、定向语义 88 项、本轮完整语义 1115 项、四项两版定向 LSP、完整 C2 及两版 C1 共 96 次相关可见列表／精确 Tab／Undo/Redo；10k 文件 1600 查询 P95 11.14–44.44 ms，48 项终态一致；[报告](reports/c2-word-middle-array-literals-2026-10-02.md) |

逐项定向结果与限制见 [URL 合同](reports/c2-builtin-url-component-contracts-2026-10-01.md)、[字符串列表](reports/c2-string-split-list-types-2026-10-01.md)、[正则标志](reports/c2-preg-split-flag-types-2026-10-01.md)及[候选说明](reports/c2-variable-completion-details-2026-10-01.md)。本节不以单个 narrow test 支持整个补全专项已完成的结论。

当前源码的[集成回归](reports/c2-current-source-integration-gate-2026-10-01.md)已覆盖完整 stdio 357 项（0 跳过、含跨进程缓存）、完整 C1/C2/C3 源码宿主及 C1 可见列表。该结果补齐近期增量的组合证据；不改变各行支持边界，也不代替真实 WSL 人工使用或整个长期路线图的完成判定。

最新 R14–R16 的[阶段集成](reports/c2-generic-integration-gate-2026-10-01.md)已通过完整 C2、C1 可见列表、全仓 Lint 及完整 stdio 359 项（0 跳过、含跨进程缓存）；同批语义基线为 549 项。结果范围仍限于所列源码自动化，真实 WSL 与 renderer 异常单列。

2026-10-02 R23–R25 的[当前阶段集成](reports/c2-proof-cache-integration-gate-2026-10-02.md)已完成完整 stdio 389/389（零跳过、1191.05 秒）、完整 Core C2 与标准组合 C3 宿主、全仓 Lint，以及当前版本化测试输入下 PHP 7.2／8.1／8.5 的可见列表与接受文本；终态冻结输入一致。当前 1,000 轮连续编辑和损坏缓存重启通过，真实 WSL 与 renderer 异常单列。历史结果保留其原有输入范围，原 60 项、D01–D30 与 R01–R25 均保留，未删除或降低门槛。

## 自动化逐项状态

截至 2026-09-29 的源码及隔离宿主结果。下表的“通过”只指所列自动化层；真实 WSL 窗口的显示和日常使用尚未验收。`S` 对应 `packages/semantic/test/semantic.test.ts`，运行 `pnpm --filter @php-companion/semantic test`；`L` 对应 `packages/language-server/test/stdio.test.ts`，运行 `pnpm --filter @php-companion/language-server test`；`H` 对应 `test/extension/suite/c1.ts`，以 `PHP_COMPANION_TEST_C1_UI=1 PHP_COMPANION_TEST_C1_COMPLETION_ONLY=1 pnpm test:extension:c1` 运行隔离宿主。下表保留每项被断言的行为，不使用会随源码增行而失效的行号。多项共用一个参数化测试时，正例和反例都在该测试内断言。

| ID | 自动化状态 | 可运行证据 |
| --- | --- | --- |
| K01 | 通过 | L；H 顶层 `n` 可见列表；[独立记录](reports/c1-new-keyword-php-emmet-2026-09-28.md) |
| K02 | 通过 | L；H 关键字检查 |
| K03 | 通过 | L；H 关键字检查 |
| K04 | 通过 | L；H 关键字检查 |
| K05 | 通过 | L |
| K06 | 通过 | L |
| K07 | 通过 | L；H 完整关键字与部分输入的列表 |
| K08 | 通过 | L，可构造类出现、接口和 `new` 缺席 |
| K09 | 通过 | L，注释位置返回空列表 |
| K10 | 通过 | L，普通字符串位置返回空列表 |
| S01 | 通过 | S，实例成员与可见性 |
| S02 | 通过 | S，静态方法过滤 |
| S03 | 通过 | S，外部对象私有成员缺席 |
| S04 | 通过 | S，继承 protected 成员出现 |
| S05 | 通过 | S，nullsafe 成员；L PHP 7.2/7.4/8.0/8.5 版本边界；H PHP 7.2/8.5 隔离宿主 |
| S06 | 通过 | S，返回类型链成员 |
| S07 | 通过 | S，Union 共有成员 |
| S08 | 通过 | S，PHPDoc 魔术成员及签名 |
| S09 | 通过 | S；L，命名空间排序 |
| S10 | 通过 | L（跨类别排序和函数/常量导入测试），两类候选各自出现，近命名空间候选分别插入 `use function` 与 `use const` |
| V01 | 通过 | S，本作用域已绑定变量 |
| V02 | 通过 | S；H 跨函数变量缺席 |
| V03 | 通过 | S，实例方法 `$this` |
| V04 | 通过 | S，静态方法无 `$this` |
| V05 | 通过 | S，显式闭包捕获 |
| V06 | 通过 | S，箭头函数隐式捕获 |
| V07 | 通过 | S，foreach 键和值 |
| V08 | 通过 | S，解构绑定且另一函数同前缀变量缺席 |
| V09 | 通过 | S；H 插值变量与普通字符串边界 |
| V10 | 通过 | S，兼容 string 变量先于 int |
| T01 | 通过 | S，可构造类与构造器可访问性 |
| T02 | 通过 | S，extends 类别过滤 |
| T03 | 通过 | S，implements 接口过滤 |
| T04 | 通过 | S，已知非异常类缺席 |
| T05 | 通过 | S，Attribute 类别过滤 |
| T06 | 通过 | S；H PHP 7.2/8.5 完整 C1 宿主 |
| T07 | 通过 | S，PHPDoc 类型和说明文字负例 |
| T08 | 通过 | S，限定名无额外导入 |
| T09 | 通过 | S；L，分组导入编辑 |
| T10 | 通过 | L 关键字版本过滤及 enum 类型/成员 PHP 7.2/8.0/8.1/8.5 边界；H PHP 7.2/8.5 宿主 |
| A01 | 通过 | S，已使用命名参数缺席；L 命名参数 PHP 7.2/7.4/8.0/8.5 版本边界；H PHP 7.2/8.5 隔离宿主候选 |
| A02 | 通过 | S，嵌套调用签名 |
| A03 | 通过 | S，Attribute 构造器签名 |
| A04 | 通过 | S（空白表达式局部变量测试）；L 空白排序、无前缀函数缺席及输入前缀后恢复；H 可见列表及 Enter/Undo |
| A05 | 通过 | S，实参、返回与赋值位置的数组形状键；L，实参及返回/赋值位置的完整 `"owner" => ` 编辑 |
| A06 | 通过 | S；L，可选键与已填键过滤 |
| A07 | 通过 | S（返回与赋值数组及形状字符串字面量测试）；L 形状字段值完整编辑；H 可见列表 Enter/Undo，含函数体、数组和字符串同时未闭合的赋值场景及嵌套键和值 |
| A08 | 通过 | S；L；H 同前缀跨类别顺序，enum/常量值与类型排序 |
| A09 | 通过 | L，独立 Symfony Route Provider 的项目路由名、静态路由路径参数 `id`/`slug` 及无关业务方法负例；Winstar 只读样本的运行时路径参数 |
| A10 | 通过 | S，未知形状、普通数组和不确定调用不伪造值 |
| E01 | 通过 | L，完整词编辑范围；H，Workbench Enter 后文本和 Undo |
| E02 | 通过 | L；H，词中成员接受后文本和 Undo |
| E03 | 通过 | L；H，未保存 `guc` 的可见列表 |
| E04 | 通过 | L；H，snake_case 缩写可见列表 |
| E05 | 通过 | L；H，三字以上词中匹配可见列表；匹配规则短前缀负例 |
| E06 | 通过 | H 真实 Composer vendor A→B→A 可见候选；新增隔离 Workbench `Sh → Ot → Sh` 实际键盘输入的可见列表切换；100 轮编辑基准 |
| E07 | 通过 | L，三个索引模式的同版本重开旧结果撤回 |
| E08 | 通过 | L；H，PHP/HTML 交替和可见列表 |
| E09 | 通过 | L；H，Workbench Enter/Tab、占位符和 Undo；两字母类型候选来回切换并继续输入第三个字母时，`isIncomplete` 触发后的可见列表正确收窄 |
| E10 | 通过 | H 真实 Composer vendor 及可见等待；L PHPDoc 冷候选遇文件事件时的单次重试及连续失效后的 `isIncomplete`；`scripts/benchmark-editing.mjs` 100 轮热 P95，含 500 个可由前缀补出的函数与空白实参；通用只读 `scripts/benchmark-project-completion.mjs` 在 Winstar 与 PHP 7.2 CoreRepo 的内存副本各跑 100 轮两字母交替编辑，最新总 P95 分别为 23.09、31.28 ms，无过期候选，见当日进度报告 |

原 60 项自动化计数：通过 60，失败 0，未执行 0。该基线当时的完整语义回归通过 468 项，完整 LSP 回归通过 434 项并跳过 1 项；PHP 7.2 与 8.5 的完整 C1 隔离宿主也曾通过。测试粒度和日志见[当日进度报告](reports/completion-special-progress-2026-09-28.md)；该计数不代表真实 WSL 人工验收。声明专项的新增结果单独记录如下。

## 声明专项自动化结果（2026-09-29）

新增 D01–D26 的源码实现和定向覆盖已落在上述 S/L/H 测试层。`packages/language-server/test/stdio.test.ts` 的声明族协议用例覆盖关键字顺序、`readonly`/`final`、名称位置空列表、文件名补全编辑、匿名类和 switch 反例、heredoc 后声明，以及 `new`/`extends` 引用。`packages/semantic/test/semantic.test.ts` 覆盖类型、函数、常量、枚举 case、属性、参数、命名空间及导入/表达式边界；`test/extension/suite/c1.ts` 覆盖真实键盘连续输入后的可见列表。源文件前含已结束的 heredoc/nowdoc，或长度超过 128 KiB 时，声明名称也不再退回通用候选。

当前自动化证据：完整语义回归 469 项通过；声明族 LSP 与 PSR-4 Rename 定向回归通过；最新源码的 C1 隔离宿主可见列表、连续输入、接受建议和 Undo 通过，6 次弹窗等待中位数 248 ms、最大 258 ms。C3 隔离宿主退出码 0，包含文件改名、引用、预览和 Undo/Redo。Winstar `src/Config/app.php` 只读内存文档 100 次 `enu` / `enum e` 交替，热查询总 P95 15.08 ms，未见旧候选。F2 与 Shift+F6 均指向同一受保护的 `phpCompanion.safeRename` 命令，Ctrl+L 未绑定。完整 LSP 回归尚未重新运行；以上自动化结论不等于真实 WSL Profile 验收。

2026-09-29 真人反馈后追加 D27–D30。定向 stdio LSP 回归覆盖首字母刷新、类后完整 `enum`、类体短前缀、魔术方法及顶层/枚举反例；隔离 VS Code 1.139.1 的可见弹窗与 Enter 接受测试退出码 0。Core 已重新安装到 WSL Alpha Profile，但运行中的扩展宿主须重载后才会读取新文件；D27–D30 的真实 WSL 复测仍待进行。


## 2026-10-03 声明追加证据

D31–D38 为原有冻结集合的追加项，没有删除或放宽 K/S/V/T/A/U 的 60 项及 D01–D30。当前完整语义 1299、声明定向协议 10、Linux 魔术方法修饰符八次可见接受及 Undo/Redo 通过；新增编号对应实际已有的源码与断言，详见[修饰符报告](reports/completion-magic-modifier-2026-10-03.md)、[继承 final](reports/completion-inherited-final-magic-2026-10-03.md)和[枚举](reports/completion-enum-magic-2026-10-03.md)。D34 随后补齐[冷父类读取中的专用竞态探针](reports/completion-cold-parent-races-2026-10-03.md)：两版 onDemand × 取消／子类修改／未保存父类打开，六场景通过，旧请求撤回、新请求正确、磁盘不变。它是独立脚本，不计入正在运行的完整 stdio。

当前 Core 的既有 C1 completion-only 操作链已完成 PHP 7.2／8.5 源码隔离宿主复核，两原会话 38751／97336 退出 0，终态 2962 项输入一致。收紧 func／function 的可见列表等待条件，排除读取旧前缀列表后，两版通过；8.5 的 renderer 异常单列。详见[当前 C1 报告](reports/completion-current-c1-2026-10-03.md)。这不是逐项覆盖全部冻结编号或当前完整协议的证明。真实 WSL Profile 和用户日常输入仍单列；没有打包或更新 Profile。

2026-10-03 PHP 8.1 的当前 C1 completion-only 原会话 61692 已退出 0，三版补全操作链锚点均有当前证据。完整 Core C2 原会话 59600 已退出 0、65 条验证；完整 stdio 原会话 25202 仍运行，详见[集中集成](reports/completion-modifier-integration-2026-10-03.md)，不先把整表或当前完整协议记为通过。

当前实际 Composer 项目修饰符往返通过 200 次：普通 __con 位置 __construct 首位，static 位置空列表，每次无旧构造候选，协议总 P95 5.09 ms。项目文件只在内存修改，日志与限制见上述集中报告；此样例不替代整个项目规模或可见弹窗性能预算。

2026-10-03 当前 Core [修饰符集中集成](reports/completion-modifier-integration-2026-10-03.md)已有三版 C1 补全链、完整 Core C2 65 条和修正夹具后的标准 Core／Symfony C3 68 条通过。独立崩溃重启 7269 退出 0，服务 PID 改变，未保存补全／定义、磁盘原文及后续编辑均正确；协议相关 2961 项输入保持一致。C3 独立测试源码修正和三项临时编译输入单独记录，当前完整 stdio 56745 仍待终态，不将当前整表或真人 WSL 验收先标通过。

2026-10-03 [当前补全集中回归](reports/completion-modifier-integration-2026-10-03.md)已取得完整 stdio 56745 终态：26 文件 496/496、零跳过、退出 0、1417.83 秒。协议相关 2961 项与独立 C3 三项输入终态一致，原 2962 清单的 C3 测试源码变化单列；冻结已释放。三版 C1／C2 65／C3 68／专用冷父类取消与重启保留各自证据，不将以上集合简单相加为逐项全平台真人验收。

## D39：声明缓存及失效合同（2026-10-03）

Trait as final 及原生方法 final 变化应属于声明变化；全量、延迟及来源声明恢复应保存限制，旧格式或缺失 boolean 字段必须回退解析且不破坏当前事实。语义八项、实际 LSP 五次持久启动、Core 未保存父类崩溃重启分别通过；完整协议与真实 WSL 范围单列。见 [记录](reports/completion-trait-final-cache-2026-10-03.md)。

2026-10-03 D39 与 stubs 语义消费的当前集中集成已收口：完整协议 29 文件、501/501、零跳过、退出 0，完整语义 1328、索引单元 133、Core C2 65 条分别通过；2975 项终态输入一致。新增 F03-BUILTIN-07／08 关联数组键域、调用绑定和原生父类合同，详见 [记录](reports/phpstorm-stubs-call-and-inherited-flow-2026-10-03.md)。真实 WSL 和当前 Windows 构建单列，不把这些门禁作为整张语料的全平台真人验收。

2026-10-03 D39 的当前 Windows Core 未保存 Trait final 服务器崩溃恢复已通过，PID 6708 → 20744，移除 final 后候选恢复；三项 stubs 定向宿主与 Windows 完整 C2 均退出 0。20 项 Core 资产及 86 项 C2 来源输入终态一致，临时副本已清理。详见 [当前 Windows 记录](reports/phpstorm-stubs-current-windows-2026-10-03.md)。


## D40：声明变量与引用边界（2026-10-03）

参数／属性名称仍过滤通用变量，属性 Hook 的 `$this`、局部变量与 setter 参数引用保留候选；覆盖词中光标、未完成输入、无保留树和三种缓存恢复。完整语义 1332、后续定向 7、真实协议 5（36 次边界查询）及 Linux 八次可见 Enter／Tab 与 Undo/Redo 通过。此前完整协议及 Windows 证据不倒算为本修正后的全量验收。见 [边界记录](reports/completion-declaration-variable-boundaries-2026-10-03.md)。


## D41：属性 Hook 关键字作用域（2026-10-03）

getter／setter 的 `r` 优先 `return`，接受后保留空格；setter 不提示生成器关键字，getter 与嵌套闭包不被误删。AST、未闭合输入和普通作用域反例覆盖，完整语义 1337、两版 Hook 协议 32 次查询与四次可见 Enter／Tab／UndoRedo 通过。实际 PHP 两版十个预期结果已核对。见 [Hook 记录](reports/completion-property-hook-keywords-2026-10-03.md)。本修正后的全量协议、Windows 和真人 WSL 单列。


2026-10-03 D40／D41 当前 Windows 定向宿主十二次可见接受及三项名称过滤反例通过；当前完整协议仍运行、输入保持冻结，详见 [集中记录](reports/completion-d40-d41-integration-2026-10-03.md)。


2026-10-03 D40／D41 [当前集中回归](reports/completion-d40-d41-integration-2026-10-03.md)已收口：完整 stdio 原进程 36905 退出 0、31 文件、506/506、零跳过；2986 项输入终态一致并解除冻结。完整语义 1337、Core C2 65、两版 C1、Windows 十二次可见接受、1000 轮编辑和六组取消各有定向证据，不相加成逐项真人验收。8.5 Workbench 异常保留，未称修复。


## D42 内置数组回调累加器

真实内置声明下覆盖 map／filter／reduce 共 22 个正反例；两版与两种树模式、三种缓存恢复分别核对。稳定累加器在前置成员读取／调用后保留补全，引用或写入等危险路径不猜测。真实 LSP 28 次未保存查询及 Linux 四次可见 Enter／Tab／UndoRedo 通过；完整语义 1339。见 [D42 记录](reports/completion-array-callback-carry-2026-10-03.md)，本批全量协议、Windows 与真人 WSL 未重复验收。


2026-10-03 D42 收口补充：隐式局部改写函数不按普通按值调用放行；96 次语义查询、42 次缓存恢复、36 次当前 LSP 和完整语义 1342 通过。实际 Composer 项目 200 次累加器切换 P95 18.07 ms，磁盘终态一致。四次 UI 属于该防护补充前的正例；详见 [D42 当前记录](reports/completion-array-callback-carry-2026-10-03.md)。


2026-10-03 D42 Windows 收口：当前 Core 四次可见 Enter／Tab 精确文本、光标、Undo/Redo 和磁盘不变通过；20 项资产终态一致，临时单份 Core 已清理。见 [D42 Windows 证据](reports/completion-array-callback-carry-2026-10-03.md)。未更新 Profile，真人 WSL 仍单列。
