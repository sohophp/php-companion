# SoPHP Core / Symfony 与 TwigPlus 的 Twig→PHP 定义跳转计划

状态：待复核执行。本文从 2026-09-26 的未提交快照恢复；其中部分 Controller 上下文能力已由后续提交实现，具体进度以当前源码和验收报告为准。本文是跨仓库执行交接，不代表完整的 Twig→PHP 定义跳转、VSIX 或真实编辑器验收已经完成。实施前先检查两个仓库的当前差异和已安装扩展版本，保留其他会话的工作。

## 目标与所有权

在 Twig 表达式 `{{ page.title }}` 中，Ctrl+点击 `page` 定位到传给模板的变量键或来源，点击 `title` 定位到该类型中 Twig 实际可访问的属性或 getter 声明。定义位置必须来自可验证的源码事实；类型未知、模板映射有歧义或成员不可访问时，不返回猜测的位置。完整链路覆盖未保存的 PHP/Twig 修改、关闭或回退缓冲区、文件监视事件和默认 `onDemand` 索引模式。

| 能力 | 负责组件 |
| --- | --- |
| PHP 调用、变量数据流、返回类型和成员源码事实 | SoPHP Core |
| Symfony/Twig 渲染调用及 Controller→模板上下文提供者 | SoPHP Symfony |
| Twig 表达式、模板命名空间、定义请求与目标位置展示 | TwigPlus |

不要为单个业务项目、`PageRendererInterface`、`@site`、`ReadEntity` 名称或固定目录写特例。用独立的临时 Composer 项目覆盖通用行为；业务项目仅用于末端验收。不要修改业务模板或 Controller 来迎合工具。

## 当前链路与缺口

- SoPHP Symfony 的 `analyzeSymfonyControllerContexts()` 已支持 `$this->render()`、`renderView()` 和 `#[Template]`，并提供变量 `valueLocation`。Core 在 `runControllerContextProvider()` 用 `workspace.provenExpressionType()` 精化变量类型，`interopTypes()` 导出公共成员及位置。
- 项目自定义渲染封装（例如 `render(Request $request, string $template, array $variables)`）不在现有调用识别中；上下文变量若经局部数组变量传入，当前解析器也无法还原数组键和值。
- `interopTypes()` 只取 `publicTypeMembers()`。Twig 可通过 getter、`ArrayAccess` 或明确的公开访问机制读取的非公共存储属性，需要按访问机制证明后单独导出；不得普遍暴露受保护或私有属性。
- TwigPlus 已接收 `twigPlus/updatePhpContexts`，`onDefinition` 也能使用成员 `sources`。但 `ProjectContextIndex` 以模板字符串匹配文件路径，尚未复用已有 Twig 命名空间映射；Twig 根变量跳转目前使用 Controller 方法来源，未优先使用已传入的 `variableSources`。

## 实施顺序

1. **记录基线。** 在两个仓库分别检查 `git status`、相关文件的当前版本及 VSIX/Profile 安装版本。用独立临时项目取得原始 SoPHP interop payload 和 TwigPlus `textDocument/definition` 结果，确认断点。先定下预期位置和旧上下文撤销行为。
2. **SoPHP Symfony：识别通用渲染调用。** 根据静态解析出的接收者方法及参数签名，识别确定的模板参数与上下文数组参数，包括前置 `Request` 等额外参数、位置参数和命名参数。只接受字面量 Twig 模板名及能证明的调用契约；接口或自定义封装不能仅凭方法名 `render` 猜测。对无法从签名或已知转发关系证明的封装，可提供项目级显式方法映射，映射按完全限定符号与参数名/序号定义，不内置业务类名。
3. **SoPHP Symfony：还原局部上下文数组。** 在调用点之前追踪可证明的最近局部赋值，例如 `$variables = ['page' => $page]`；保留每个键的源码位置和每个值的 `valueLocation`。遇到分支、重新赋值、可变键、展开、引用或不明修改时标记 `complete: false`，只导出仍可证明的键。复用 Core 的 `provenExpressionType()` 从值表达式推断跨文件方法返回类型，不增加执行 PHP、启动 Kernel 或项目 autoload 的路径。
4. **SoPHP Core：导出 Twig 可访问成员。** 先复用公共属性和无参数 getter 的现有位置。对能静态证明的 `ArrayAccess`/魔术访问模式，建立有边界的存储属性映射；成员别名与实际声明之间保留准确来源及原始类型。联合类型只给所有可行分支共有的成员；同名不同声明可返回多个真实位置。限制按需类型展开、保留快照版本，并随未保存声明和 watcher 变化撤销旧结果。
5. **TwigPlus：匹配模板与定位 token。** 让 Controller 上下文查找复用现有 `twig.yaml`/Twig 路径命名空间解析，覆盖默认路径、命名模板、多个根、覆盖顺序及歧义。Twig 根变量优先跳转 `variableSources`；成员使用 SoPHP 提供的精确 `sources`。只在光标确实位于相应变量或成员 token 时返回位置，避免把未知成员跳回当前 Twig 文件。保留 TwigPlus 作为 Twig Definition 的唯一所有者。
6. **联调与安装。** 先运行 SoPHP Symfony/Core、interop、TwigPlus 语言服务器的定向测试，再用独立 Composer fixture 做两个扩展的 Extension Host 测试。更新并核对同批 SoPHP Core、SoPHP Symfony 和 TwigPlus VSIX；安装到目标 WSL Remote profile 后 Reload Window，真人执行 Ctrl+点击。自动化通过不能写成真人验收通过。

## 必须覆盖的验收矩阵

- 普通 Symfony `render()`、`renderView()`、`#[Template]` 继续工作；自定义接口封装使用不同属性名、不同模板命名空间和带前置参数的签名也能工作，证明能力不是按业务文件名匹配。
- 内联数组、局部数组、`compact()`、跨文件返回类型，以及 public 属性、getter、经可证明访问机制暴露的 protected 属性，分别验证根变量和成员的精确 PHP 声明位置。
- `@namespace/path.html.twig`、无命名模板和多根同名模板遵守配置的解析顺序；无法唯一确定时不跳错文件。
- 未保存地改 Controller 模板名、变量键、返回类型或成员声明，再 Revert、关闭及 watcher 更新，旧定义必须及时撤销；连续 Ctrl+点击不应重复全量扫描。
- 负例包含无关 `render()`、动态模板名、未知数组写入、歧义联合类型、不可访问成员、跨工作区来源及过期快照。负例返回空结果或明确的不完整状态，不制造错误跳转。
- 在项目规模 fixture 记录首次和温态定义等待、索引活动及 Language Server 内存；本机结果与真实 WSL Remote 手测分别记录。

## 参考验收场景与估时

Winstar 的 `templates/site/solutions/index.html.twig` 第 97 行可作最终真实项目样例：`solutionPage` 来自 Controller 传入的数组，`blogTitle` 是其读实体成员。该路径、类名和 `@site` 不能进入产品匹配规则；同一实现须通过上述独立 fixture。估计 12–20 小时（约 2–3 个工作日）；若现有语义索引不能证明跨文件调用返回类型，再预留 3–6 小时。此估时不包含 Marketplace 发布或跨平台长会话验收。

实施记录应写明修改的仓库、提交、定向测试、VSIX 摘要、实际安装的扩展版本、真人 Ctrl+点击结果及仍未覆盖的场景。
