# Twig 与外部工具集成

## 免费组合选型与接管顺序

本表区分已纳入组合与仍待真实操作验收的项目。开源包清单已经按许可证和核心编码闭环收敛；版本、运行时及平台仍须在 R0 报告中记录，不能只看免费安装按钮。

| 领域 | 首选提供者 | 状态与后续策略 |
| --- | --- | --- |
| PHP 核心 | Companion 自研 | R1 接管；R0 提前上线时可验证 Phpactor 过渡，不能双核心同时注册 |
| YAML | `redhat.vscode-yaml` | MIT，提供语法、schema、补全、格式化；长期复用 |
| XML | `redhat.vscode-xml` | EPL-2.0，LemMinX 提供 XSD/DTD、补全、诊断、导航、重命名和格式化；长期复用 |
| JSON/JSONC | VS Code 内建 JSON | 不额外安装扩展；可贡献 schema，不重写语言服务 |
| HTML/CSS/JS/TS | VS Code 内建语言服务 | PHP 混合文件适用范围实测；Twig 内嵌区域继续由 twig-plus 处理 |
| Twig | `sohophp.twig-plus` | 长期唯一模板语言实现 |
| Symfony/Doctrine 增强 | PHP Companion 自研组件 | 首发使用静态、可证明的框架事实；`Symfony.language-tools` 0.20.1/0.20.2 均因普通 PHP Rename 冲突退出受支持组合 |
| PHP 格式化 | `junstyle.php-cs-fixer` | 已有组合继续验证，长期复用 |
| 调试 | `xdebug.php-debug` | 验证现有组合、版本和运行时配置 |
| PHPUnit | `recca0120.vscode-phpunit` | 现有候选，核验版本/许可和真实测试发现执行；Pest 非首发必需 |
| 编辑约定 | `EditorConfig.EditorConfig` | 保留，验证与 formatter 的规则一致性 |

Open Source Pack 已在 VS Code 1.136.1 / WSL 的隔离扩展目录完成实际安装，基础组合版本见 [组合报告](reports/open-source-profile-linux-wsl-2026-09-06.md)，Symfony Language Tools 的原组合验收见 [Symfony 组合报告](reports/symfony-language-tools-linux-wsl-2026-09-08.md)，0.20.1 与真实 Winstar 的复核见 [0.20.1 复核报告](reports/symfony-language-tools-0.20.1-recheck-2026-09-12.md)。Red Hat YAML、PHP Debug、PHPUnit & Pest Test Explorer 和 EditorConfig 的安装清单声明 MIT；PHP CS Fixer 扩展 0.3.21 的 VSIX `LICENSE.txt` 为 MIT，但 manifest 写作 ISC，报告保留这一元数据差异。Companion 与 TwigPlus 使用各自仓库声明的 MIT 许可证。许可证和安装核对不替代完整 VSIX 组合行为测试，也不锁定 Marketplace 自动更新后的版本。

数据库、Markdown、拼写和 CSS Peek 不作为 PHP 首发必需依赖，已从 Open Source Pack 移除。VS Code 内建 Markdown/CSS 能力足够首发基线；当前 Database Client 发行版闭源且部分功能收费，只能作为用户自行选择的可选工具。

Symfony Language Tools 官方定位是补充通用 PHP LS，覆盖 PHP、Twig 和 YAML 中的 Symfony 框架值；它不提供通用 Twig 语法高亮、格式化或内建符号补全。0.20.1 Linux x64 曾在安装完整 Composer 依赖的 Winstar 中把源码索引推进到 `ready`，也曾通过本地 F2/Safe Move 组合，但随后在冻结版本的 Ubuntu CI 中同样为普通 PHP 声明参与 Rename 并返回拒绝；0.20.2 可稳定复现相同问题。该扩展没有关闭 Rename 的配置，VS Code 又会聚合同分值 Provider，所以目前不能进入默认 Pack、受支持 Profile 或手动推荐清单。历史 ready 证据只保留为能力评估，不再作为兼容结论。上游提供可关闭的 Rename Provider 或稳定修复后，必须重新通过三平台完整组合门禁。

Provider 所有权按能力划分：YAML 语法、Schema 和格式化归 Red Hat；通用 Twig 解析、模板变量、导航和格式化归 TwigPlus；PHP 通用语义及当前 Symfony/Doctrine 静态能力归 Companion。Symfony Language Tools 只保留历史评估与未来上游修复后的候选资格。

追加审计确认 Symfony Language Tools 0.19.0 的路由名称补全依赖运行时路由表。默认关闭 runtime indexing 时，PHP Companion 在可证明的 YAML/Attribute 加载范围内补齐源码路由候选；环境、本地化、动态 Loader 和运行时生成路由保持 unknown。启用外部运行时索引后，自研候选按工作区停止，由 Symfony Language Tools 接管。支持域与真实组合证据见 Symfony 组合报告。

Phpactor 只作为提前交付组合的开源候选。官方明确披露性能/准确性局限；PHP 运行时要求、Windows/WSL 与目标 PHP 语法需实测，不承诺适合全部环境。没有合格临时核心时，R0 不宣称完整 PHP 编码可用，优先完成 R1。

扩展包不能固定成员扩展版本；默认成员必须以 Marketplace 当前版本通过组合门禁。只能在指定版本下成立的组件保留为可选项，发布报告记录版本、升级门禁和回退说明，不能把一次组合验收视为永久兼容。

## Twig 唯一所有权

twig-plus 已承担 Twig parser、模板索引、语言服务器和 formatter。PHP Companion 不复制这些组件。其已有 Symfony 路由/翻译/资源等索引，在 P8 开始时重新核对，避免重复建设。

PHP 侧提供 Controller render 上下文、PHP 类型、成员查询与定义位置；Twig 侧决定模板作用域、Twig 属性访问语义、变量继承与合并。PHP 的私有成员等不得直接无条件暴露为 Twig 补全项，Twig 访问规则由 Twig 侧判断。

相关本地项目：`/var/www/node/twig-plus`、`/var/www/node/twig-plus-metadata`。2026-09-06 审计确认 metadata schema 4 已包含 globals、callables、types、contexts 和 Controller sources；PHP Companion 复用该消费模型，并以独立 interop v1 增加实时协商，不复制 Twig 组件。

## interop 契约

已落地的 interop v1 包含：

- 能力与协议版本协商。
- 指定项目/模板的 Controller 上下文查询。
- PHP 符号、成员、定义位置及可序列化类型查询。
- 项目/文档变化和上下文失效通知。
- 跨语言重构准备、参与方编辑收集、版本复核与取消。

PHP LS 的 `phpCompanion/interop/contexts` 返回握手、上下文和有界公共类型目录；PHP VS Code adapter 以 `phpCompanion.provideTwigInterop` 提供给 TwigPlus。TwigPlus 通过 `twigPlus/updatePhpContexts` 将已校验快照交给自身 LS。启动与 PHP 文件变化采用最多 30 次、间隔 2 秒的有界重试；未就绪、断线或协议不兼容时不清除磁盘 metadata。

公共成员携带由 PHP 文档偏移换算得到的 UTF-16 行列。TwigPlus 只对自身解析并确认、且在每个 Union 分支都存在的属性暴露 Definition；单类型返回一个 PHP 声明，多类型返回全部有效声明。Controller 变量本身仍跳到 render 来源，不把控制器位置冒充成员声明。

消息包含协议版本、项目身份、源码快照/版本、来源位置、完整性和请求取消信息。不同版本不兼容时显式停用桥接，保持各自基础语言能力可用。断线/超时不保留伪最新上下文。

优先由 VS Code adapter 路由两端服务的请求；协议本身保持与 VS Code 无关。跨语言重构由一个协调方收集带版本编辑并提交一个 WorkspaceEdit，不允许两端分别自动修改文件。

多 Controller 上下文保留来源，合并时区别必有/可选变量与 Union 类型。动态模板、动态数组或未知返回值返回不确定信息，不猜测。仅交换必要静态类型信息，不发送源码全文或私密配置。

## PHP 格式化

选用 `junstyle.php-cs-fixer`，对应引擎 PHP CS Fixer。现有 Companion 扩展包已采用该扩展，继续复用。

配置示例（用户/项目显式采用，不由语言服务器自动写入）：

```json
{
  "[php]": {
    "editor.defaultFormatter": "junstyle.php-cs-fixer",
    "editor.formatOnSave": true
  },
  "php-cs-fixer.onsave": false,
  "php-cs-fixer.allowRisky": false,
  "php-cs-fixer.formatHtml": false
}
```

采用 VS Code formatOnSave 单一保存入口，关闭插件独立 onsave，避免双重执行。PHP LSP 不注册 formatting Provider；Twig 格式化继续由 twig-plus 负责。混合 PHP/HTML 文件明确验证处理范围，不顺带改写 Twig。

优先使用项目锁定的 fixer 与规则。Winstar 的本地 `.vscode/php-cs-fixer-project` 包装器明确调用 `bin/php-runtime`，工作区将该可执行路径交给插件；可复制的脚本内容记录在 Winstar `bin/README.md`。插件配置值使用可执行路径，不拼接未经支持的 shell 命令字符串。不依赖系统默认 PHP。旧项目目标版本与 fixer 运行时分离，禁止默认启用语言迁移规则。

当前 Marketplace 扩展 0.3.21 自带的 PHP CS Fixer PHAR 只接受到 PHP 8.3，在 Winstar PHP 8.5.9 下实测会拒绝启动。Winstar 项目锁定的 PHP CS Fixer 3.95.22 经包装器运行成功，因此该项目不得回退到扩展内置 PHAR，也不得用 `ignorePHPVersion` 掩盖版本不兼容。

验收包含手动/保存格式化、失败不损坏文档、撤销、中文/CRLF、带空格路径、WSL、规则配置加载和旧 PHP 语法兼容。插件实际使用的引擎版本须记录；不能因引擎上游支持新 PHP 就假定扩展内置 PHAR 同样支持。

## 调试与测试

PHP Debug 负责 Xdebug，现有 PHPUnit/Pest 扩展负责测试执行。Companion 负责入口和可解释的配置诊断，不实现第二套调试器或测试运行器。项目 runtime wrapper、工作目录、Remote 路径映射必须在隔离示例中实测；不自动启动业务服务或修改业务环境配置。

## 外部依据

以下资料于 2026-09-06 规划时核对；实现阶段锁定依赖版本后重新验证：

- [Red Hat YAML 与 MIT 许可](https://github.com/redhat-developer/vscode-yaml)
- [Red Hat XML、LemMinX 与 EPL-2.0 许可](https://github.com/redhat-developer/vscode-xml)
- [DotJoshJohnson XML Tools](https://github.com/DotJoshJohnson/vscode-xml) 与 [xmldom 安全支持边界](https://github.com/xmldom/xmldom/security)
- [VS Code 内建 JSON 支持](https://code.visualstudio.com/docs/languages/json)
- [Symfony Language Tools：许可、能力和运行时索引](https://marketplace.visualstudio.com/items?itemName=Symfony.language-tools)
- [Phpactor：开源 PHP LS 候选及已知限制](https://github.com/phpactor/phpactor)

- [PHP CS Fixer VS Code 扩展配置](https://github.com/junstyle/vscode-php-cs-fixer)
- [PHPUnit & Pest Test Explorer 与 MIT 许可](https://github.com/recca0120/vscode-phpunit)
- [PHP Debug Adapter 与 MIT 许可](https://github.com/xdebug/vscode-php-debug)
- [EditorConfig for VS Code 与 MIT 许可](https://github.com/editorconfig/editorconfig-vscode)
- [Database Client 当前源码边界与付费限制说明](https://github.com/cweijan/vscode-database-client)
- [PHP CS Fixer 引擎与版本支持](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer)：规划时上游列出 PHP 7.4–8.5；不据此宣称 PHP 7.2 项目已验证。
- [Tree-sitter PHP grammar](https://github.com/tree-sitter/tree-sitter-php)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)

## 路由补全 Provider 切换

VS Code adapter 按 workspace folder 读取 `symfonyLsp.runtimeIndexing`。检测到 Symfony Language Tools 且该值为 true 时，将该根目录的路由补全交给外部插件；否则保留 Companion 静态路由候选。配置、工作区目录或扩展清单改变时发送完整配置快照；服务器重启时重新读取当前配置。最深目录配置优先，其他 PHP 补全不受影响。

`phpCompanion.symfony.environment` 是 resource scope 的显式环境身份，默认 `null`。空值只发布无条件路由；例如设为 `dev` 后，静态图才会加入可证明的 dev Kernel import 和 dev Bundle。Companion 不读取 `.env.local`、不推断 `APP_ENV`、不执行配置文件，也不启动 Kernel。外部运行时 provider 开启时，即使配置了环境，Companion 仍不提供该根的静态路由候选。

同一环境身份也筛选 `#[Route(env: ...)]`。支持类级和方法级的字面量字符串或字符串数组：类级不匹配时整个 Controller 不发布，类级匹配后再逐条筛选方法 Attribute；被排除的未命名 Attribute 不消耗 Symfony 自动名称序号。动态表达式、非字符串数组、localized path/locale 与 alias 仍保持 unknown。未显式选择环境时只发布没有 `env` 限制的 Attribute 路由。

YAML 路由文件中的顶层 `when@<env>` 使用相同环境身份。分析器只展开名称与当前环境精确相等的 map，保留块外无条件 route/import，并使用内层键的真实源码范围；未选择环境和其它环境块在结构验证前跳过，与 Symfony `YamlFileLoader` 一致。同一文件中后出现的直接路由会覆盖前面的同名直接路由；跨 import 或不同资源产生的同名名称仍保守视为歧义。

服务器协议使用初始化字段 `symfonyRouteProviders`，以及通知 `phpCompanion/symfonyRouteProviders` 的 `{ providers: [{ uri, external, environment? }] }` 对象。环境只接受 1–64 个 ASCII 字母、数字、点、下划线或连字符；非法快照不改变现有状态，清空列表恢复独立服务器的静态默认行为。该机制表示用户选择的能力所有权，不证明外部插件的运行时索引已成功或全部路由功能可用。

项目自定义 loader 使用独立设置 `phpCompanion.routeProviders`，只接受用户显式配置的 `{ providerId, command, args?, timeoutMs?, maxOutputBytes? }`。`@php-companion/route-provider` 定义 schema 1 完整快照：每条事实必须给出 `name`、`path`、声明 `uri` 及 UTF-16 文本换算前的字节/字符偏移范围；`@php-companion/route-provider-host` 以项目根为 cwd、关闭 shell，并校验请求 ID、provider 身份、generation、完整性、超时和输出上限。核心不会从 Composer 或项目文件自动发现命令。

动态快照不跨路由查询缓存。补全、Definition 或 References 每次都重新启动一次 provider，因此配置或自定义路由文件变化后不会继续返回旧事实；provider 失败只让该次动态贡献缺席，并记录输出诊断。多个静态/动态来源出现同名路由时整体按歧义处理，不提供该名称的 Companion 跳转。外部 Symfony runtime provider 拥有该工作区路由能力时，语义调用门禁会在启动自定义 provider 前退出。

Winstar 项目可在可信工作区内显式设置 `phpCompanion.symfony.winstarRoutes.enabled: true`。核心 VSIX 内置的 `@php-companion/provider-winstar-routes` 会执行项目根的 `bin/php-runtime bin/console debug:router --format=json`，用 Symfony 实际路由表决定启用集合；随后只读取 `src/Modules/*/Routes/*.yaml` 来定位直接 `name` 和 `admin_defaults` 的基础 `name`。生成路由使用 `admin.<base>.<action>` 关系回到基础条目；若一个运行时名称有多个可能来源，适配器保持歧义并拒绝发布。它不会发布标准 Symfony 路由，因为这些路由继续由静态图或外部 runtime provider 负责。

启用该设置等同于授权执行当前项目的 Symfony Console。适配器仍运行在 route-provider-host 的一次性无 shell 子进程、30 秒和 16 MiB 上限内，但 Symfony Kernel 本身会加载项目代码；只应在可信仓库使用。关闭设置即撤销内置 provider 快照，不影响静态路由能力。


## 静态路由 glob 支持范围

路由 `resource` 和 `exclude` 共用路径匹配规则，支持 `*`、`**`、`?`、字符集合和有界 `{a,b}` 候选；YAML 可使用 `routes/*.{yaml,yml}`，Attribute 可使用 `../src/Controller/**/*.php`。相对路径以声明所在 YAML 为基准，排除目录同时排除其子树。仅产生源码声明候选，不代表运行时已注册路由。

模式最多 512 字符、两个左花括号、16 个逗号；花括号范围展开和 extglob 不支持，参数化路径保持未解析。隐藏目录不遍历，realpath 不得越过项目根，循环链接终止；单请求共享 64 次资源/遍历预算、单文件 1 MB 限制和取消检查。预算耗尽可能使候选不完整，不能据此判定某路由不存在。资源 namespace 映射见下一节；自动路由名称、继承及完整环境/本地化规则仍待完成。

## PHP 路由配置与自定义 Kernel 入口

framework-symfony 可静态读取唯一返回且参数类型明确为 `RoutingConfigurator` 的 PHP closure。顶层字面量 `add(name, path)` 和 `import(resource[, type])` 可进入路由图；导入链上的字面量 `prefix()` 与 `namePrefix()` 会按顺序叠加。Configurator 重赋值、动态参数、嵌套调用和未知 Configurator 方法会保守撤销可能受影响的事实，不执行配置文件。

Language Server 还会从直接继承 Symfony Kernel 的 `configureRoutes()` 提取顶层无条件 `import()`，以及由单一 `$this->environment === 'literal'` 顶层分支保护的 import。当前只接受字面量路径，以及 `__DIR__` / `dirname(__DIR__)` 与字面量的确定性拼接。`config/bundles.php` 中值为 true 的环境键和相同形式保护的 `registerBundles()` yield 可在环境匹配时建立 Bundle 根；服务配置仍只使用全环境 Bundle。项目外 PHP 路由还要求唯一类文件、默认 Bundle 路径和 realpath containment 全部成立。复合/嵌套环境条件、动态 Kernel 表达式和返回 `RouteCollection` 的业务 factory 保持 unknown，并可由启用运行时索引的 Symfony Language Tools 接管。

选中的环境 Kernel 根先进入单请求 64 次资源/遍历预算，随后处理无条件 Kernel 根和约定根；同一实际资源及加载上下文仍去重，同名声明仍拒绝作为唯一候选。Bundle 解析会按需读取 Composer 元数据和 PSR-4 映射，但不扫描或执行 vendor 源码。

同一静态图也为 PHP 路由字面量提供 Definition 与 References。调用必须唯一解析到 FrameworkBundle `AbstractController::generateUrl()` / `redirectToRoute()`、Routing `UrlGeneratorInterface::generate()` 或 `RouterInterface::generate()`，且选中的参数必须是该方法首个路由参数。Definition 只跳到唯一名称的 YAML、Attribute 或 PHP Configurator 声明；References 先按精确名称有界扫描项目 PHP，再逐个验证调用语义，可按 LSP `includeDeclaration` 附加声明。项目索引不完整时明确失败，同名业务方法、普通字符串、动态名称、重复声明和外部 provider 所有权均不返回 Companion 结果。

同一语义门禁也用于路由参数名补全。直接参数数组的字符串键可从唯一最终路径中的 `{identifier}` 占位符补全；位置参数和重排后的命名参数均按目标方法的前两个形参核对，已存在的键会排除。路由名、键或数组结构为动态值，数组包含 unpack，路由名称有多个来源，或调用解析到同名业务方法时保持 unknown。动态 Provider 的最终运行时路径也适用，因此 Winstar 生成路由可补全实际 `{id}`，但核心不会据此推断默认值、requirements 或控制器签名。

同一真实资源若同时从约定入口和 Kernel 入口以相同前缀、loader、exclude 与 namespace 上下文到达，只分析一次；前缀或加载上下文不同的重复导入保持独立，避免把合法的多入口路由合并掉。


## PSR-4 路由目录映射

`type: attribute` 支持 `resource: { path: ../src/Controller/, namespace: App\Controller }`。目录相对 YAML 文件解析，类名由 namespace、子目录和 PHP 文件名组合；仅接收身份一致的非抽象类声明，忽略同文件额外类和 namespace 不匹配声明。排除规则、根边界、隐藏目录和遍历预算沿用前节。

该形式的 path 必须是明确目录，暂不接受 glob、额外映射键、动态 namespace 或不合法前缀；普通字符串 resource 仍支持 glob。依据本地 Symfony `Psr4DirectoryLoader` 的 directory/prefix 身份规则实现静态发现，不执行 Composer autoloader，无法据此证明运行时注册结果。


## 未命名 Attribute 路由

分析 API 可显式选择 `framework` 或 `routing` 默认命名策略；未选择时只保留明确名称。语言服务器从根 Composer 的 `require.symfony/framework-bundle` 字符串依赖确定标准 FrameworkBundle 策略，生成类/方法名称及同一方法的未命名序号，命名路由不消耗序号，再叠加类与 YAML 导入前缀。invokable 类 fallback 同样支持未命名路由。自定义加载器覆盖标准策略不在当前证明范围内。

非 ASCII 默认名依赖 PHP mbstring 环境，因此暂不猜测；前序 Attribute 无法解析时，后续未命名序号保持未知，明确名称仍可使用。环境、继承、自动 FQCN 别名和完整本地化仍待完成。


## PHPUnit 项目发现范围

使用项目已有的 `phpunit.xml` / `phpunit.xml.dist` 声明真实 testsuite，不将全仓 PHP 当作测试文件。隔离 Profile 用以下最小配置验证单文件和全套运行：

```xml
<phpunit>
  <testsuites>
    <testsuite name="Profile">
      <directory suffix="Test.php">tests</directory>
    </testsuite>
  </testsuites>
</phpunit>
```

这是验证项目的配置，不是 Pack 强制约定。业务项目应保留自己的测试目录、文件后缀、bootstrap 与多个 testsuite；不要覆盖已有配置。配置应在扩展激活前存在，以便初次发现与监听使用相同范围。PHPUnit 扩展 3.9.40 会从 testsuite 产生目录/后缀匹配；源码重命名不应触发测试文件解析。
