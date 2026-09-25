# C3 跨命名空间方法生成签名

日期：2026-09-25。工作范围仅为 SoPHP 仓库的现有 `Implement Interface`、`Implement Abstract Method` 和 `Override` Code Action；未修改业务项目，也未打包 VSIX。

## 问题与修复

三种 Action 原先直接复制来源方法的原生参数和返回类型。例如父类位于 `A`，方法声明使用 `A\Thing`，子类位于 `B` 时，生成代码中的裸 `Thing` 会解析成 `B\Thing`。PHP 7.2 的独立复现以 `Declaration of B\Child::useThing(B\Thing $value): B\Thing must be compatible with A\Base::useThing(A\Thing $value): A\Thing` 终止。

现在共用签名转换：按来源文件的 namespace、`use` 别名及声明容器解析原生类型；仅当相同写法在目标类中指向不同类型时，写出带前导反斜杠的完整类型名。参数默认值中的类常量、导入常量、本命名空间常量及 PHP 8.1 的 `new Alias()` 也按来源解析；字符串和注释中的同形文本不修改。PHP 7.2 的独立例子表明，直接复制 `Flags::LIMIT` 会在读取默认值时因寻找目标命名空间的类而终止；转换后的类常量与导入常量例子在 PHP 7.2 返回 `18`。PHP 8.1 的 `new` 默认值转换例子返回预期的 `Shared\Thing`。

内建类型与 `static` 保持原写法；无法可靠解析的签名不提供对应 Action。接口、抽象方法和覆盖父类方法都沿用原声明的参数、引用、可变参数及返回类型结构。对于 Trait 中依赖 `self` 或 `parent` 的签名，暂不推断消费类，避免给出错误转换。

随后发现 PHP 8.2 的 DNF 返回类型 `(A&B)|C` 会让原签名校验误把类型内部的 `)` 当成方法参数列表结束位置，导致 Override Action 缺失。现在只在返回类型**开始位置之前**寻找参数列表的 `)`，因此保留 DNF 括号并正确限定其中的跨 namespace 类名。

## 验证

- 语义测试 `packages/semantic/test/semantic.test.ts`：329/329，通过跨 namespace `use Alias`、联合类型、DNF 及 `self` 的 Override，以及接口和抽象方法实现；另核对类常量、导入常量、本命名空间常量、字符串、`new` 默认值及三种默认值并存的签名。
- 真实 LSP stdio 定向测试：三类 Code Action 都返回在目标 namespace 中可解析的完整类型名与类常量默认值；Override 的 `new` 默认值和 DNF 返回类型也核对了最终文本。原有同 namespace Action 断言继续通过。
- VS Code 1.139.0 隔离源码宿主 C3 套件退出码 0；新场景逐一获取三种 Action、应用含类常量默认值的编辑，并以一次 Undo/Redo 验证。新增 Override 场景在同一签名中使用本命名空间常量、`use const` 导入常量和 `new Alias()`，也已完成 Action 获取、应用及一次 Undo/Redo；DNF Override 同样通过。运行包含 Core 与独立 SoPHP Symfony，不是完整 10 项 Pack 或已安装 VSIX。
- PHP 8.5 独立执行例子使用生成后的 `\Shared\Thing|\OverrideBase\Base` 参数与 `\Shared\Thing` 返回，正常返回 `Shared\Thing`；PHP 8.2 独立例子执行 DNF Override 返回 `A\Alternative`。TypeScript 构建、改动文件 ESLint、`git diff --check` 通过。

## 仍需完成

首次扩充宿主场景时，语义包和 LSP 已构建，但扩展宿主仍加载旧 `dist/language-server.js`；该次输出只转换了导入常量，不能评价新代码。重建实际加载的 bundle 后，同一 C3 宿主退出码 0，并包含上述三种默认值的断言。候选安装、WSL Remote 和完整 Pack 的实际运行环境尚未复核。新建 PHP 文件的一次 Redo 仍未恢复，按独立 C3 阻断项继续跟踪。
