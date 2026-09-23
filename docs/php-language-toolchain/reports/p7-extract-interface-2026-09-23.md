# P7 Extract Interface 首个支持域

日期：2026-09-23。此项实现从具名 PHP 类的直接公开方法提取原生签名，在相同 namespace 的独立 PSR-4 文件创建接口，并给原类添加 `implements`。抽象类中的直接公开抽象方法也可提取，并去掉签名中的 `abstract` 修饰符。已有接口列表会追加新接口。私有方法与魔术方法不进入生成的契约。同一词法 namespace 中的 `use` 语句会原样复制到接口文件，以保留签名依赖的别名和分组 import；签名中已解析的 `self` 类型与类常量接收者会改为原类绝对 FQCN，`parent` 会按同一词法范围的唯一 `extends` 及 import 改为父类绝对 FQCN。VS Code 的一次 WorkspaceEdit 同时包含新文件创建、新文件内容和原类修改。

## 已验证

- 语义包 301 项测试通过；聚焦用例验证生成后的接口与类均可重新解析、`static`/默认参数签名保留、已有接口列表追加，以及上下文类型、import 和同名接口冲突时拒绝。
- `pnpm test:extension:packaged` 首次运行暴露测试误用磁盘读取未保存编辑器缓冲区的问题；改为读取 `TextDocument` 后，以同一打包 VSIX 复测退出码 0。VS Code 1.138.0 Linux x64 隔离宿主实际执行创建、应用、一次 Undo、Redo 和再次 Undo。
- 生成的接口与实现类形态分别通过 CoreRepo PHP 7.2 包装器和 Winstar PHP 8.5 包装器的 `php -l`。
- 初始实现的 `pnpm check` 退出码 0：仓库类型检查、ESLint、包/扩展测试、四份 VSIX 打包及内容验证均通过；language-server 包为 261 项通过、1 项既有跳过。后续 import 扩展以如下聚焦门禁复核。
- import 扩展后的聚焦语义用例与语义包 301 项测试通过；原始打包 Core/Symfony VSIX 在 VS Code 1.138.0 隔离宿主重新完成应用、Undo/Redo，接口文件保留 `use DateTimeImmutable as InputTime` 与参数别名。直接从语义计划写出的接口和类在 PHP 7.2/8.5 下均通过语法检查、加载与实例方法调用。
- `self` 扩展后的聚焦语义用例与语义包 301 项测试、类型检查、ESLint 通过；打包宿主再次以退出码 0 完成，接口签名中 `self` 参数/返回改为原类 FQCN 并通过应用、Undo/Redo。直接从语义计划写出的 `self` 参数、返回与 `self::LIMIT` 默认值双文件，在 PHP 7.2/8.5 下均通过语法检查、加载与调用。
- `parent` 扩展后的语义包 301 项测试、language-server 与扩展测试 TypeScript 类型检查、相关 ESLint 均通过；跨 namespace 同名 import 别名用例确保只采用类所在词法段的父类。直接从语义计划写出的父类、接口与实现类三文件，在 PHP 7.2/8.5 下均通过语法检查、加载与实例方法调用。打包 VS Code 1.138.0 隔离宿主退出码 0，并通过创建接口、应用、Undo/Redo 回归。
- 抽象方法扩展后的语义包 301 项测试、语义包和扩展测试 TypeScript 类型检查、相关 ESLint 通过；抽象类中公开抽象方法和具体方法会一并生成接口签名，protected 方法被排除。从语义计划写出的接口、抽象类和具体子类在 PHP 7.2/8.5 下均通过语法检查、加载与实例方法调用。打包 VS Code 1.138.0 隔离宿主通过，接口包含抽象方法签名并完成应用、Undo/Redo；宿主通过 `PHP_COMPANION_TEST_VSCODE_VERSION=1.138.0` 选用缓存版本。

## 当前拒绝边界

仅在项目源码索引完整、类文件路径与 Composer PSR-4 映射一致、接口目标路径唯一且不存在、目标目录已存在时提供动作。源码有语法错误、没有可提取的直接公开非魔术方法、import 别名与新接口名冲突，或方法签名含无法解析的 `parent`、`static`、参数属性时不提供动作。该子集不复制 PHPDoc 与属性，不处理跨 namespace import、通用接口抽取或成员移动。P7 总项仍开放。
