# @php-companion/parser

PHP 8.4 属性 hook 会结构化记录 `get`/`set`、hook 范围、显式 setter 参数、`&get`、属性与单 hook 的 `abstract`/`final`、非对称写可见性及 backed/virtual 状态。短形式 `set => expression` 按 PHP 运行时规则视为写入 backing storage；完整块只有在直接访问同一 `$this->property` 时才证明为 backed。每个 hook 具有独立词法作用域，setter 的隐式 `$value` 与 `$this` 均可被下游准确消费。

普通条件分支和独立原生 `assert()` 会为正向与否定 `instanceof`、严格非空、`!is_null`、正反内建类型谓词、严格 `===`/`!== true|false`、`isset` 及 `array_key_exists` 产生有界控制流事实；布尔字面量可位于比较任一侧，并传播到逻辑已证明的 `&&`/`||` 右操作数及严格比较选择的三元 arm，宽松 `==`/`!=` 不产生字面量事实。`!is_numeric` 只记录 int/float 排除，避免错误排除非数字 string。单参数，以及第二参数为静态字符串或 `null` 的位置参数、`assertion:`/`description:` 命名参数和换序形式受支持，必然成立的 `&&` 原子也会逐项记录。嵌套调用、动态描述、参数展开及不能确定每个成立原子的析取不产生事实。解析结果保留 `assertion` 来源标记，使顺序断言与普通分支事实可以分别消费。

PHP Companion 的 PHP 语法解析组件。它接受 PHP 文本并返回 UTF-16 范围、声明、imports、调用/参数、局部赋值及保守控制流事实、原始名称与语法错误，不依赖 VS Code。类声明结构化记录 PHP 8.2 `readonly class`，其普通和提升实例属性会统一标记为 readonly；类常量和大小写敏感的 unit/backed Enum case 具有独立结构化身份与精确名称范围，Enum 声明同时记录 `int|string` backing type。命名参数同时保留整段参数和参数名范围，调用记录会区分复合语句中的完整独立表达式、保留直接变量实例调用的接收者及 nullsafe 状态，并为直接函数、实例方法或静态方法调用、逻辑蕴含明确的合取真分支/析取假分支，短路求值中由左操作数结果确定执行的右操作数，以及无 goto 且由主分支/elseif/else 的直接 return/throw/exit、完整嵌套 `if/elseif/else`，或 finally 必然终止/try 与全部 catch 均终止的 `try/catch/finally`，或含 default 且每个入口沿贯穿路径均终止的 `switch`，或首轮必然终止的 `do` 及无退出跳转的恒真 `while/for` 结果一致证明条件真值的同块继续路径记录归一化范围。`while` 和有条件的 `for` 还把条件为真事实限定到循环体；`while`、有条件 `for` 及 `do…while` 均记录条件内短路右操作数。循环出口与首轮先执行主体的 `do…while` 不继承尾部条件事实。嵌套括号和否定会正确交换结果，不完整分支及无法推出单次调用结果的复合条件不记录事实。foreach 来源区分变量、直接属性和直接方法。局部赋值记录以变量为根的属性/方法混合链，成员调用步骤可携带字面量参数及单参数箭头函数或普通闭包的显式类型，并可从唯一的 `new Class(...)` 返回表达式推断缺失的返回类型。控制流事实当前覆盖可证明的严格空值、`instanceof`、正向合取、退出守卫、while/for body，以及单类型和多类型 catch，并明确限定有效范围。

PHP 8.3 `Type::{$name}` 的 grammar 包装会被还原为动态类常量事实，区分字符串字面量、局部变量、常量表达式、可折叠拼接与 unknown，并保留静态类型接收者和名称源码范围。

```ts
import { PhpSyntaxParser } from '@php-companion/parser';

const parser = await PhpSyntaxParser.createDefault();
const document = parser.parse('<?php class Example {}');
document.tree.delete();
parser.dispose();
```

调用者负责释放返回的 Tree。当前 API 为 Alpha，后续通过明确的 SemVer 变更扩展完整语法模型。


动态成员名称可折叠任意括号层级及仅由无转义字符串组成的点拼接，并保留可原子替换的源码区间；全局/类常量以及 backed Enum case 的 `name/value` 访问记录为待语义绑定的常量名称事实；变量拼接、调用、插值、转义或含注释表达式只记录为 unknown 覆盖，不产生确定成员事实。
