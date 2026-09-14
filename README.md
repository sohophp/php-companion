# PHP Companion

PHP Companion 提供自研 PHP Language Server、类型系统以及轻量、按需的 PhpStorm 式项目工作流。Open Source Pack 与 Recommended Pack 默认启用自研核心且不安装其他通用 PHP Language Server；格式化、调试、测试和 Twig Language Server 继续由专门工具负责。

当前版本化内建规格已完整覆盖 PHP SPL 函数、十七种 SPL 适配/高级迭代器、四种 SPL 目录迭代器、Strings 与 Filesystem 官方可调用目录；类关系和 autoload 集合、模式相关字符串/正则/目录迭代结果、树格式化结果、CSV/list、locale/stat shape、resource 和失败返回会进入 Signature Help、返回传播及 Definition。

PHP 8.4 property hooks 已进入自研 parser、语义和 LSP 主链：backed/virtual、get-only/set-only、短 setter、显式 setter 写入类型、hook 局部 `$this`/`$value` 和非对称写可见性会驱动 Definition、赋值类型及高置信度操作诊断。完整已索引层级中的接口/抽象属性、读协变、写逆变、独立 hook 继承和 final 边界均会验证；数组下标修改、直接取引用、唯一签名按引用调用、属性或对象按引用 `foreach` 会按有效 `&get` 精确检查，而向 hooked property 绑定新引用始终拒绝。静态/readonly hook、非法抽象组合、虚拟默认值和 backed `&get`/`set` 组合也会被拒绝。动态引用调用与跨层级生成仍保持 unknown。

自研 PHP 语言服务器与类型系统正在按 [PHP 语言工具链开发计划](docs/php-language-toolchain/README.md) 实施；当前完成范围和未完成边界以 [实施状态](docs/php-language-toolchain/status.md) 为准。以下稳定功能与自研服务器预览能力分别说明。

## 自研语言服务器

当前自研服务器提供语法/版本/重复/PSR-4/未使用 import/缺失接口及抽象父类方法/确定的继承方法签名不兼容诊断、完整索引后未解析 `new` 类型、确定缺失/不可见/错误静态访问及 nullable 普通访问的成员，以及必填参数、未知/重复命名参数、参数顺序、可证明的参数/返回/类型属性赋值和目标版本感知的 readonly 属性写入诊断，类型、函数、namespace 常量和成员补全，以及 Hover、参数提示、Definition、Type Definition、Implementation、Type Hierarchy、声明及精确变量/调用/成员/原生与 PHPDoc 类型/import 使用点 Semantic Tokens、已证明局部对象的 Inlay Hints、基础 References、安全子集的接口/抽象方法、构造函数、属性访问器与父方法 Override 生成、方法 Rename 和文档/工作区符号。PHP 8.2 readonly class 的普通及提升实例属性使用同一成员模型。类型可由参数、`$this`、赋值、调用返回、基础 PHPDoc 或直接类模板证明时继续链式推断。它会静态读取 Composer 根包、嵌套项目与已安装依赖的 PSR-4/PSR-0/classmap/files 配置，不执行项目 PHP 或 autoloader。

当唯一调用目标声明了 PHPDoc `callable(Service): Return` 时，无原生类型的 closure/arrow 参数也会获得上下文对象类型，供成员补全、Definition 和参数诊断使用。具名参数按名称映射；Callable 模板可从同一调用的其他已证明数组/集合实参唯一专门化。可证明的 arrow 主体，以及由有界顺序语句、嵌套 `if/elseif/else`、`try/catch/finally`、支持直接 `break;`/`break 1;` 汇入外层后续语句的 `switch` case 贯穿，以及支持直接 `break;`/`break 1;` 汇入外层后续语句的有界 `while/do/for/foreach` 循环组成、每条可继续路径最终到达可证明 `return` 的 closure 主体，会绑定返回模板，排除明确的 throw/exit 以及唯一解析且实参兼容的原生 never 调用终止路径，并把条件提前返回与最终返回合并为 Union，因此 `array_map` 的这些写法都保留输入和映射结果元素类型。重载歧义、未绑定或冲突模板、任一未知返回、函数体仍可落空、没有任何可证明返回、循环内嵌套/多层 `break` 与 `continue`、其它尚未建模控制结构内的 return、yield/goto、未解析类型、unpack、引用/variadic callback 及参数数量不符时保持 unknown。

```json
{
  "phpCompanion.languageServer.enabled": true,
  "phpCompanion.disabledExtensions": ["mbstring"],
  "phpCompanion.diagnostics.disabledCodes": [],
  "phpCompanion.diagnostics.severity": {
    "php.member.unresolved": "warning"
  },
  "phpCompanion.semanticProviders": [
    {
      "providerId": "vendor.framework",
      "command": "/opt/vendor-provider",
      "args": ["--stdio"],
      "timeoutMs": 5000
    }
  ]
}
```

`diagnostics.disabledCodes` 可按稳定代码关闭诊断；`diagnostics.severity` 可将单项覆盖为 `error`、`warning`、`information`、`hint` 或 `off`。修改后立即重新发布已打开 PHP 文档的诊断，无需重启服务器。已明确禁用或由目标 PHP CLI 成功证明未加载的审计扩展符号会发布 `php.extension.unavailable`，消息会区分 workspace 设置、Composer platform 与实际运行时；未知扩展或可由项目 polyfill 提供的符号不猜测。Linux / WSL 的 R1 首发门槛已经通过；R4 完整功能和跨平台矩阵仍在实施。未知或动态类型会保守返回空结果；启用时不要同时启用另一个通用 PHP Language Server。

`disabledExtensions` 只用于明确声明项目不可用的 PHP 扩展，当前支持 `dom`、`filter`、`mbstring`、`pdo`、`simplexml`、`xml`、`xmlreader` 与 `xmlwriter`。Composer `config.platform` 中值为 `false` 的对应 `ext-*` 会自动合并；没有写进 Composer `require` 不代表缺失，因此不会据此裁剪内建符号。配置按 workspace folder 生效，变更后无需重启服务器。

首次打开 PHP 文件或主动执行版本检测时，扩展在当前 Extension Host 所在环境中运行受限 PHP CLI 探测：直接执行所选可执行文件，不经过 shell，不加载项目 autoloader 或 Symfony Kernel。只有 PHP 次版本与项目目标一致、结构化结果完整返回时，已加载扩展列表才会参与内建符号选择；命令不存在、超时、输出异常或版本不匹配时保持 unknown。该规则使本地、WSL、SSH 与 Dev Container 分别使用各自实际运行环境，并避免把另一套 PHP 的缺失扩展误报到当前项目。

`semanticProviders` 只接受用户显式配置的可信可执行文件，不从 Composer 或工作区元数据自动发现命令。每次索引以独立无 shell 子进程请求一份完整事实快照；超时、崩溃、输出超限或协议、身份、generation 校验失败时保留上一代事实。该机制隔离 Provider 故障，不是操作系统安全沙箱。

## 稳定功能

- 按 Composer `autoload.psr-4` / `autoload-dev.psr-4` 和 PHP 7.2–8.5 约束理解项目。
- 从资源管理器创建 Class、Abstract Class、Interface、Trait、Enum 和 PHPUnit Test。
- 复制当前文件的 FQN、namespace、`::class` 引用和工作区相对路径。
- 检查打开文件的 namespace、PSR-4 路径以及主类型名/文件名，并提供 namespace Quick Fix。
- 自研语言服务器提供统一的 Definition、Implementation 和 References 入口。
- 在 class、interface、trait、enum 声明名称上使用 F2，安全更新项目语义引用、PHPDoc 和匹配的 PSR-4 文件名。
- 从未解析类型的 Quick Fix 或命令导入 Composer PSR-4 类；多候选始终由用户选择。
- 粘贴代码时按需补充确定性 import，并可预览清理、去重和排序当前文件的 imports。

## Import 工作流

`Import Class` 只处理光标下的未解析类型。`Optimize Imports` 对 class/function/const 和 group use 做保守分析；语法错误、动态或无法证明未使用的 import 会被保留。

```json
{
  "phpCompanion.imports.onPaste": "prompt",
  "phpCompanion.imports.optimize.preview": true,
  "phpCompanion.imports.sort": "grouped"
}
```

候选发现和优化只在命令调用时索引当前 Composer 项目。将 `indexing.mode` 设为 `off` 会同时禁用这些项目级能力，普通粘贴不受影响。

## F2 Rename

PHP Companion 默认接管类型声明和唯一解析类型使用点上的标准 Rename Symbol。文件名严格匹配类型名时会随类型同步重命名，并支持 VS Code 标准重构预览；直接短名、全限定名、import 路径、PHPDoc 与 Attribute 引用会同步，显式 alias 的使用名保持不变且不能作为发起点，普通字符串、配置文件、属性、变量和相关测试文件不会被修改。启用自研语言服务器后，可从非魔术方法声明或唯一解析的调用点发起 Rename：private 方法只修改直接解析到同一声明的引用；public/protected 方法要求完整层级，并同步接口、父类、重写实现及已解析直接调用。Trait 源方法 Rename 会同步声明、Trait 内调用、已证明的宿主/子类调用和具名 `Trait::method as alias` 的源方法，同时保留 alias 名；alias 自身也可从 adaptation 或唯一解析调用点独立 Rename，不修改源方法。多个 Trait 的同名方法由完整 `insteadof` 规则收敛到唯一 winner 时，被选中方法会同步 precedence token，被排除方法保留该 token 并同步自己的具名 alias 源。无法唯一收敛的多 Trait 来源、不完整消费关系、层级冲突、动态方法和数组/字符串 callable 会拒绝；无法解析或复合类型中不属于同一方法族的调用点、反射和工作区外引用不会被改写。

唯一具名函数可从声明或直接解析的调用点发起 Rename，并同步定义、导入路径、普通及全限定调用。显式 `use function ... as alias` 的 alias 名和调用保持不变，因此从 alias 调用点发起会拒绝。

唯一命名空间常量可从声明或直接使用点发起 Rename，覆盖声明、`use const` 路径、普通及全限定使用，并保留显式 alias。类与 Trait 常量可从声明或已解析静态访问发起，覆盖 `self::`、宿主和解析到同一声明的继承访问。Enum case 采用大小写敏感身份，可从声明或精确静态访问发起 Rename；大小写不同的 sibling 保持不变。unit/backed Enum 提供原生 `cases()`，backed Enum 另提供 `from()`/`tryFrom()`，实例提供精确只读 `name`/`value`，静态工厂返回类型可继续链式补全，合成的 backing value 签名按调用文件 strict/weak 模式参与参数诊断。PHP 8.1+ 对声明家族外的确定 readonly 属性写入及 Enum 原生 `name/value` 写入提供稳定诊断；声明类/子类内部初始化候选不猜测。`declare(strict_types=1)` 下可证明的标量字面量参数、return 和直接类型属性赋值不兼容会精准诊断，弱类型调用保持 PHP 强制转换语义。动态访问、字符串反射、多 Trait 同名来源、层级不完整或会改变解析目标的冲突会拒绝。

属性也可从声明或唯一解析的访问点发起 Rename。private 属性只修改同一声明的已解析访问；public/protected 属性要求完整类层级，并同步相关重复声明及已解析实例/静态访问。提升属性会把构造参数声明、作用域使用、紧邻 PHPDoc、直接或继承构造的已解析命名实参和属性访问作为同一身份修改。Trait 属性可同步声明、Trait 内访问及已证明的宿主/子类访问；宿主重名、多 Trait 同名来源、动态访问、名称冲突和不完整消费关系会拒绝。反射、序列化字符串及工作区外引用不会被改写。

普通参数可从声明、作用域引用或唯一解析的命名实参发起 Rename。完整索引能够证明接口、父类和全部重写关系时，操作按参数位置同步整个方法族，并更新各实现原参数名对应的标准/PHPStan/Psalm `@param` 与已解析命名实参。提升属性的构造命名实参会进入同一参数/属性身份编辑；层级不完整、动态同名调用、闭包捕获或名称冲突会拒绝操作。

在 VS Code 的 Rename 输入框中按 `Enter` 会直接应用；按 `Shift+Enter` 或点击 Preview 会打开重构列表，再通过 Apply 提交。文件重命名是声明文本编辑的必需依赖，预览中不要单独取消它。

```json
{
  "phpCompanion.rename.enabled": true,
  "phpCompanion.rename.file": "preview",
  "phpCompanion.rename.phpDoc": true
}
```

独立安装和两个组合包均默认启用自研服务器。若已安装 Intelephense 且没有显式设置 `phpCompanion.languageServer.enabled`，PHP Companion 会保留现有提供者并不启动自身服务器；用户显式设置 `true` 或 `false` 时以该选择为准。继续使用 Intelephense Rename 时还应关闭 `phpCompanion.rename.enabled`，避免 Provider 竞争。

## 性能模型

扩展激活只注册命令和 Provider，不扫描工作区、不启动 PHP 进程，也不初始化 Tree-sitter。Composer/PHP 检测仅在打开 PHP 文档或执行相关命令后发生。完整符号索引仅供实验功能按需加载，并受文件数、单文件大小和总读取量限制。

如果项目不应建立任何索引：

```json
{
  "phpCompanion.indexing.mode": "off"
}
```

实验性跨项目重构默认关闭：

```json
{
  "phpCompanion.experimental.refactoring": true,
  "phpCompanion.indexing.mode": "onDemand"
}
```

资源管理器中的 Safe Move 默认开启，在移动 PSR-4 PHP 文件时同步 namespace 与语义引用。Safe Move 采用全有或全无策略：目标 FQCN 冲突、语法错误、未保存的相关文档、索引缺失或非规范 PSR-4 路径都会取消该次资源管理器移动并显示原因。若需关闭，可设置 `phpCompanion.move.enabled: false`。

也可以在资源管理器右键 PHP 文件，使用 `PHP Companion: Safe Move PHP File` 选择目标目录；该命令默认先预览 namespace 与已证明引用的改动，再以一个可撤销、可重做的原子编辑完成文件移动与代码更新。可通过 `phpCompanion.move.preview: false` 跳过命令预览。

使用 `PHP Companion: Show Diagnostics Report` 和 `Show Performance Log` 查看加载与索引情况。日志不会记录源码。

## 推荐职责边界

- PHP Companion 自研服务器：负责 PHP 补全、诊断、类型、符号导航和安全重构；两个组合包默认启用。
- PHP Debug：Xdebug 调试。
- PHP CS Fixer：格式化。
- PHPUnit/Pest Test Explorer：测试。
- TwigPlus：Twig 编辑体验。
- Red Hat YAML / XML：YAML Schema 与 XML/XSD/DTD 编辑能力。
- PHP Companion：Composer/PSR-4、文件生成、项目工作流和安全重构。

Intelephense 只作为手动启用的旧工作流兼容路径，不属于任何默认组合。
Symfony Language Tools 0.20.1 可作为手动安装的框架增强；0.20.2 与普通 PHP F2 Rename 存在 Provider 冲突，修复并通过组合门禁前不随 Pack 自动安装。
