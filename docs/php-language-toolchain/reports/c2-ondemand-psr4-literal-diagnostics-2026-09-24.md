# C2 按需模式的可证明跨文件参数类型诊断

日期：2026-09-24。先在 SoPHP 仓库的独立临时 Composer 项目运行 PHP 8.5 真实 stdio，再用隔离 VS Code 源码宿主复核；不修改业务项目，也不为日常源码增量打包 VSIX。

## 先确定支持域

默认 `onDemand` 原先只发布同文件可证明的参数类型不匹配。即使使用方与声明文件都已打开，`Service::call(int $value)` 接到直接字面量 `'bad'` 时，参数提示可看到签名，诊断却为空。完整索引模式已有跨文件诊断，但按需模式不能把仅加载到工作区的任意声明当成项目完整性证明。

本轮只开放一个能独立核对的常用子集：Composer 元数据读取完整且没有警告；目标是类方法；类的 PSR-4 映射恰好解析到一个候选文件；当前唯一已加载的类声明、所选方法签名和这个候选文件相同；实参是调用处的直接单引号字符串、整数、`true`、`false` 或 `null` 字面量。后续补查发现普通父类可被子类放宽参数类型，因此当前按需跨文件错误还要求接收者为 `final class`、所选方法为 `final`，或接收者被局部证明为直接创建的精确实例；其它可覆写调用保持未知。跨文件 PHPDoc 返回值经变量传播、全局函数、多个 PSR-4 候选路径、动态/歧义调用仍保持未知，不因局部载入而发布确定错误。

诊断分析会复用现有语义类型兼容结果，再对跨文件候选逐项核对上述证据。声明、使用方和监视通知变化时刷新已打开的相关文件；刷新只在结果改变时发送通知。旧的待处理刷新曾把使用方长期记为“本轮编辑文件”而跳过，此次改为每轮重新确定排除 URI。用户看到的参数提示与诊断因此能在同一签名版本上往返。

## 真实 stdio 操作

独立 `App\` PSR-4 项目中，打开 `Service.php` 与 `Consumer.php` 后，`final class Service` 的 `call('bad')` 对 `int` 参数报 `php.argument.type-mismatch`；未保存地把参数改为 `string` 后撤销。使用方未保存地改为 `call(42)` 后重新报错；关闭声明恢复磁盘 `int` 后撤销；磁盘改成 `string` 并发送 watcher 后重现；使用方再改回 `'bad'` 后撤销。参数提示同步显示 `call(string $value): void`。另一个项目把 `App\` 指向两个 PSR-4 目录，即使当前只加载一个声明也不发布跨文件错误。原有 `list<Alpha>`/`list<Beta>` 跨文件 PHPDoc 返回类型用例在 `onDemand` 下仍保持保守。

语言服务器完整套件 18 文件、338 项通过、1 项跳过；随后把准入约束收紧为具体类声明，相关 6 项、类型检查、ESLint 和差异检查通过。完成隔离宿主复核后又修正了同文件重复候选；最终源码重新构建并重跑完整语言服务器套件，18 文件、338 项通过、1 项跳过。更多 PHP 版本、Remote、跨平台和完整 Pack 组合仍待验收。

## 隔离编辑器宿主复核

后续在 VS Code 1.139.0 Linux 隔离源码宿主的默认 `onDemand` Profile 中，创建独立 PSR-4 具体类和使用方，观察 Diagnostics 集合随未保存参数类型 `int → string → int` 呈 **有 → 无 → 有**；每次首次达到目标状态后再持续观察 150 ms，没有旧错误回闪。参数提示同步显示 `accept(string $value): void`，声明缓冲区保持未保存。此轮本机单次测得首次可见撤销与恢复各约 **148 ms**；样本不代表 P95 或其它系统。

首次宿主复测发现跨文件过滤也返回了同文件方法错误，导致既有同文件参数诊断从 5 条变 6 条；服务器现在排除声明 URI 等于使用方 URI 的候选。宿主随后确认原有同文件诊断仍为 **5 → 0**，跨文件编辑链和既有 PHPDoc 补全/定义场景均通过，退出码 0。VS Code 的诊断变化事件回调曾先于 Diagnostics 集合更新，宿主门禁改为直接轮询用户能看到的集合并检查短时稳定性。此为隔离源码宿主证据，完整 Pack、Remote 与持续使用仍开放。

补充反例：声明未保存地从 `final class Service` 变为可继承的 `class Service`，并加入合法的 `ChildService::call(int|string $value)` 后，父类类型变量的调用不再发布确定错误；恢复 `final` 后错误重现。真实 stdio 定向用例、Parser 77 项、Semantic 321 项、Language Server 338 项（1 项按原设置跳过）和 C2 隔离宿主均通过。这项修正收紧按需诊断的证明条件，不改变完整索引的既有诊断路径。

`final` 方法的补充支持：普通可继承类声明 `final public function call(int $value)` 时，子类也不能放宽这个方法的参数。Parser 现在保留方法的 `final` 修饰符，签名查询沿用这一事实；按需诊断接受“`final class` **或** `final` 方法”，其它 Composer/PSR-4 与字面量来源证明保持不变。真实 stdio 让使用方诊断随未保存声明从 `final class` → 普通类加可覆写子类 → 普通类的 `final` 方法，完成 **有 → 无 → 有**；隔离 C2 编辑器宿主也观察到 `final class` → 普通类 → `final` 方法的同样切换。Parser 78 项、定向 Language Server 用例、宿主退出码 0，TypeScript 与 ESLint 检查通过；未重跑完整 Language Server 套件。跨文件 PHPDoc 返回来源继续单独证明。

精确局部接收者补充支持：即使类和方法都可继承，`$service = new Service(); $other = 1; $service->call('bad');` 的调用目标仍是这个 `Service` 实例。新的局部证明要求同一代码块内直接 `new`、单实参独立方法调用，期间只允许无关变量的简单字面量赋值；接收者改由工厂或子类创建、经过其它方法调用、或出现多实参时保持未知。原有 Composer 元数据、唯一 PSR-4 声明和签名检查继续执行。真实 stdio 在存在合法放宽参数类型的子类时验证 **有 → 无 → 有**：插入 `change($service)` 后撤下错误，恢复原调用后重现。隔离 VS Code 1.139.0 C2 宿主也通过相同编辑链，退出码 0；Semantic 322 项、定向 Language Server 用例、TypeScript 与 ESLint 通过。本轮没有打包 VSIX，也未重跑完整 Language Server 套件。当时跨文件返回类型与更复杂的接收者来源仍保持保守。

原生标量返回补充支持：`final class Service` 的 `$service->accept($service->text())` 中，直接作为实参的 `text(): string` 有原生返回声明，且源、目标方法均通过唯一 PSR-4 类声明核对时，严格类型调用可报告参数不匹配。仅接受无参数、非空安全的直接实例方法调用及 `bool`、`int`、`float`、`string` 原生返回；经局部赋值、仅 PHPDoc 标注的返回、动态调用和不完整映射继续保持未知。独立 Composer 项目真实 stdio 与 VS Code 1.139.0 隔离 C2 宿主均观察到未保存返回类型 `string → int → string → 仅 PHPDoc` 时，使用方诊断 **有 → 无 → 有 → 无**；宿主退出码 0。另一个 stdio 反例把目标类保留唯一 PSR-4 路径，只让返回值源类有两个候选路径；虽然参数提示能解析源方法，使用方仍不发布确定错误。Semantic 323 项、相关 Language Server 定向用例、构建、TypeScript 和 ESLint 通过；本轮未打包 VSIX。下一步验证局部赋值后的来源稳定性。
