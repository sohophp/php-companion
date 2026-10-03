# SoPHP 补全专项进度（2026-09-28，更新至 2026-09-29）

本报告记录源码工作和隔离宿主证据。完整的 60 项验收表在 [completion-acceptance-corpus.md](../completion-acceptance-corpus.md)。表中的场景不会因为这里已有相近测试而自动算通过；真实 WSL 编辑器的人工使用仍属于候选验收。

| 计划阶段 | 当前状态 | 仍需满足的退出条件 |
| --- | --- | --- |
| 1. 冻结样例 | 60 项已冻结并逐项映射可运行证据；自动化通过 60/60；映射使用测试层与执行命令，避免失效的源码行号 | 真实 WSL 观察归属候选阶段 |
| 2. 稳定相关 | 语义层统一上下文已接入 LSP；同前缀函数/常量跨类别按已知兼容性排序；`public function` 完整输入不再混入类名；有确定类型的空白表达式不再枚举无前缀函数；命名参数与 enum 候选按 PHP 版本过滤 | 更多类别组合仍需随真实使用反馈审查 |
| 3. 类型有用 | 实参、返回、赋值中的变量、函数、常量和成员主要路径，以及数组形状、enum 已实现；空白实参、`return` 和赋值右侧现在建议可见的局部变量并按类型排序；已知形状的返回/赋值数组也能补键和值；PHPDoc 字符串字面量类型已贯穿解析、签名和实参值补全 | 真实 WSL 编辑器体验仍归候选阶段验收 |
| 4. 输入顺手 | 函数调用及四种高频模板已通过源码与隔离宿主接受测试 | 真实 WSL 编辑器配置组合待候选检查 |
| 5. 候选验收 | 60 项自动化映射、完整 LSP 回归、PHP 7.2/8.5 隔离宿主和热查询基准已记录；Core 0.4.13 候选已安装到 WSL；真实窗口发现逐字输入时旧候选滞留，修复候选已通过隔离可见弹窗并覆盖安装 | 修复候选需要真实窗口重载和用户复测；真实 WSL 人工使用尚未完成验收 |

## 2026-09-29 逐字输入关键字回归

用户在 Winstar `src/Config/app.php` 紧贴 `<?php` 后逐字输入 `func` / `function`，真实弹窗仍显示 `func_get_arg` / `function_exists`；函数体只输入 `r` 时 `return` 未排首位。单次 LSP 请求已有正确的 `function`，但隔离 VS Code 1.139.1 宿主按 `f`、`u`、`n`、`c` 连续输入后精确复现了 `func_get_arg` 排首位。原因是首字母 `f` 的完整候选列表中没有 `function`，Workbench 后续本地过滤旧列表，没有重新请求已识别的声明上下文。

Core 现在在顶层或类成员位置输入 `f` 时提供 `function`，并在 `f` / `fu` / `fun` 阶段返回 `isIncomplete`，让后续输入重新请求候选；函数体语句位置输入 `r` 时提供 `return`。协议用例覆盖带后续 `if` / `use` 代码的未完成声明、完整关键字、单字母 `r`；隔离编辑器直接逐字输入后，`func` 和 `function` 的可见列表均为 `function` 与声明模板，`r` 列表以 `return` 开头。C1 完整可见补全体验测试退出码 0，六次弹窗等待为 237、225、235、257、250、267 ms（中位 244 ms）；ESLint 和定向协议测试通过。Winstar 文件仅作为只读复现样例，未改动。

只重打包 Core 为 `artifacts/sophp-completion-incremental-20260929/php-companion-0.4.13-incremental-keyword.vsix`（SHA-256 `d6a1f530654effedd315f541e61aa71ed30cc1061584fd50dd4aaac9cd647a55`），ZIP 检查及包内两个主 bundle、三个 Worker 与当前构建逐字节比对通过。已覆盖安装到 WSL，安装目录 `language-server.js` SHA-256 为 `815115183f5dfdeb72ee480b8c4b42c41f0beef37a9f8867af523160f9b6714b`，`extension.js` SHA-256 为 `fe53110c352e7a2a4449c18aa232709be38ab2f1e5368ad35356ba1e5a68ad52`；Symfony 与 Open Source Pack 未重装。安装后，真实窗口的旧语言服务器仍为 10:57:33 启动的 PID 633544，因此需要窗口重载才能做这版的真实 WSL 复测。完整 `stdio.test.ts` 回归耗时 535.41 秒，245 项通过、1 项跳过；`git diff --check` 通过。

## 2026-09-29 函数名位置的内置片段

用户反馈 `function a` 时仍显示 `array`、`attr` 等不相关候选。隔离 VS Code 的 `vscode.executeCompletionItemProvider` 返回项中这些候选均标记为 `PHP Language Basics` 的 Snippet；源自 VS Code 内置 `extensions/php/snippets/php.code-snippets`，不是 SoPHP LSP 候选。VS Code 的 `editor.snippetSuggestions` 控制整个语言的片段列表，不能仅在函数名位置过滤内置片段。因此 Core 与 Open Source Pack 的 `[php]` 默认值设为 `editor.snippetSuggestions: none`，让 SoPHP 的上下文补全独占自动建议；四个 SoPHP 模板改为 Keyword 类别但仍按 LSP Snippet 格式插入，保留占位符和 Tab/Undo 行为。内置片段仍可通过命令面板 `Insert Snippet` 显式选择，用户也可以覆盖该设置恢复其自动建议。

隔离 Core 宿主直接输入 `function a` 后可见弹窗为空；`func` 后仍可见 `function` 与 `function block`，`if block` 的可见列表、Tab 接受、占位符及 Undo 仍通过。源代码构建、声明模板定向 LSP、manifest 单测 4/4、ESLint、`git diff --check` 通过。仅 Core 打包为 `artifacts/sophp-completion-declaration-20260929/php-companion-0.4.13-declaration-snippets.vsix`（SHA-256 `0afaec0190ad7717a790bc683c955708666b299e4989e0f4669ca9a3a4c3bafd`），包内两个主 bundle 和三个 Worker 与构建逐字节一致，已覆盖安装到 WSL；安装目录 `language-server.js` 为 `48a2ed9724d844ff1bb948363efc0b062fd7c20aee1b8e6bf422498920243e48`。Symfony 和 Pack 未重装。当前真实语言服务器 PID 655722 于 11:30 启动，早于本次 11:39 安装；需要窗口重载和用户真实弹窗复测。隔离的完整 Open Source Pack 组合因临时扩展目录不加载 symlink 扩展，未取得有效组合验收结果；不据此宣称 Profile 已验收。

## 2026-09-29 真实 WSL 补全候选

用户要求开始人工验收后，仅将当前工作树打包为 `artifacts/sophp-completion-wsl-20260929/php-companion-0.4.13-completion-wsl.vsix`（SHA-256 `2df219f1d026927ee3422bf304ca06b1c19943ea1a3c8389f7b4aacc3695b93a`）。`pnpm package` 与 ZIP 完整性检查通过，VSIX 内 `extension.js`、`language-server.js` 和三个 Worker 与本次 `dist` 构建逐字节一致。该 VSIX 的隔离 VS Code 1.139.1 C1 可见列表及接受测试退出码 0：六次等待 232、223、228、226、214、234 ms，中位 227 ms，最大 234 ms；短项目类型前缀交替、第三字符收窄、词中成员替换、Tab 模板、占位符及 Undo 通过。

`code --install-extension ... --force` 已将这个 Core 候选覆盖安装到 WSL `PHP Companion Alpha` Profile；Profile 清单的 Core 安装时间更新，已安装 `language-server.js` 与 `extension.js` 哈希分别等于本次构建的 `91adf271...`、`fe53110c...`。Symfony 与 Open Source Pack 仍为已安装的 0.4.13，未重复打包或安装。安装后检查到真实语言服务器仍是 01:18 启动的 PID 454487；用户需在原 WSL 窗口执行 `Developer: Reload Window`，再核对新进程和实际弹窗。上述打包、安装与隔离宿主结果不算真实窗口验收。

用户重载后，真实 WSL 语言服务器已换成 10:57:33 启动的 PID 633544；运行文件 SHA-256 `91adf271dc7590238ff95a499393854f68d5a5264e32ae0aaf53a7c7d6b0de51` 与本次 VSIX 内容一致。新宿主日志显示 Winstar 的 2327 个 PHP 文件索引结束，Symfony 服务、事件及 Controller Provider 的 generation 1 已提交。静态路由 Provider 在启动时返回一次不完整快照并被忽略；路由值补全的真实结果仍待单独确认。其余 PHP 补全尚需用户实际输入、查看列表和接受建议后确认，不能据进程或日志宣称通过。

## 2026-09-29 真实窗口与 Provider 核对

当前 Winstar 扩展宿主日志在 01:18 首次索引后显示 Symfony 服务、事件和 Controller Provider 均成功提交 generation 1。01:21 对 `index.php` 的 `App` 符号进行引用预热，并伴随多次 `progressive-source-change` 索引重启；01:21:30 起三种 Provider 均报告请求不符合 semantic-provider protocol 1。这是运行中可观察到的故障，可能影响依赖这些 Provider 的项目值补全。日志位于 `/home/jason/.vscode-server/data/logs/20260925T195929/exthost24/sohophp.php-companion/SoPHP.log`。

已安装的 Symfony Provider 构建与仓库当前构建逐字节一致；首次索引中的三种 Provider 也确实成功，排除了简单的版本不匹配。初次隔离实验在启动时就发送预热通知，晚于引用事实就绪时才执行，没有触发真实日志中的候选扫描，所以当时的请求均有效。

精确复现将 `index.php` 的 `App` 符号预热安排在 `[index:delta] complete` 之后。已安装旧 Core 与 Winstar 原有候选缓存的隔离组合产生无效 generation 2 请求：2345 个项目类型中有 206 个缺少必需的 `abstract` 布尔值。检查旧缓存中对应类的压缩语义快照，发现声明本身缺少 `abstractClass`；旧版 `SemanticWorkspace.restore` 接受了这类过时快照。随后整项目刷新把缺字段的类交给 Symfony 服务、事件和 Controller Provider，协议校验将整个请求拒绝。此时缺失值不能统一猜成 `false`，因为其中可能有真正的抽象类。

当前源码在完整、声明级和源码声明级的三个语义快照恢复入口，均拒绝缺少 `abstractClass` 的旧声明，让候选扫描从真实 PHP 文件重新解析。用**同一份旧缓存副本**重放相同的文件事件与 generation 1→2 刷新，修复后两代请求均有效，临时缓存中的旧条目也被写回带正确布尔值的新快照；改用已安装的真实 Symfony 服务 Provider 后，generation 1 和 2 的权威容器事实均成功提交。语义层新增正反例，完整测试 468/468；候选缓存跨重启 LSP 定向回归 1/1、工作区 `pnpm typecheck`、全仓 `pnpm lint` 与 `git diff --check` 通过。该根因和源码修复已有隔离证据，但源码未打包到用户 Profile，真实窗口仍待重载后的使用反馈。

同一隔离时序的扫描成本对照：旧 Core 扫描 2327 文件，缓存命中 353、解析 1974，耗时约 27.1 秒且 Provider 失败；修复后缓存命中 18、解析 2309，耗时约 28.8 秒且 Provider 成功，随后临时缓存被修复。这个特意让短词 `app` 在增量事件后触发全项目候选扫描的实验本身很重；它说明本次缓存校验增加了首次恢复工作，但不能从该隔离时间推断日常可见补全等待。真实窗口原日志的相应候选扫描是 88 文件、约 1.8 秒，仍需在下一次实际使用时核对。

上一轮还在语义 Provider Host 增加请求协议预检，错误会指出基础字段、文档快照、项目类型或容器服务的首个无效类别，避免把同一无效请求反复交给子进程。Host 定向测试 6/6、监听 PHP 声明变化后服务补全的 LSP 回归 1/1 通过；在 2345 个 Winstar 项目类型的捕获请求上，新增校验 100 次平均约 0.29 ms。该预检为故障诊断提供证据，实际修复来自上述语义缓存恢复校验。

运行中的 Alpha Profile 扩展清单包含 Core、Symfony、Open Source Pack 和 TwigPlus，未列出 Intelephense；Winstar 工作区里遗留的 Intelephense 设置本身不能证明有第二个 PHP 补全 Provider 在运行。复现只读取并复制缓存到 `/tmp`，没有改写用户缓存。

真实语言服务器进程于 01:18 启动，最新 Core 安装目录文件于 01:32 更新。因此当前窗口仍运行安装前加载的代码；`autoload_runtime.php` 定义跳转的新版只读协议通过，不等于该窗口已经加载新版。后续真实反馈须按进程启动与安装时序区分。

02:57 只读复核时，运行中的语言服务器仍是 01:18 启动的同一进程（PID 454487），安装目录构建文件时间仍为 01:32。因此当前真实窗口继续缺少后续补全源码与旧候选缓存修复；隔离宿主的绿色结果不能替代该窗口的候选列表与接受操作。用户会在日常使用中反馈具体问题；本次未重载窗口、打包或改动 Profile。

## 已实现

- 语义补全统一使用前缀、大小写、CamelCase / snake_case 首字母及三字以上词中匹配规则；连续大写缩写如 `getURLCode` 也按词块匹配。成员、变量、命名参数、类型、函数和常量按匹配质量排序。语言服务器给缩写候选提供可被 VS Code 过滤器识别的文本。
- 在可证明的语法位置合并关键字与类型候选；`func` / `function` / `retu` 回归保留，`public func` 同时显示 `function` 和匹配的类型。词中接受会替换完整单词。
- `public function` 已完整输入时，不再混入以 `function` 开头的类名；未完成的 `public func` 仍允许选择属性类型。
- 实参、返回和赋值表达式的已知类型用于局部变量排序；兼容的函数返回值、常量值和 `new` 后的可构造类也优先。未知类型继续保留；多签名歧义时不猜。
- 当函数和常量同前缀且匹配质量相同时，已知兼容性现在跨类别影响编辑器排序；没有预期类型时保留原有命名空间和类别顺序。
- 统一补全上下文把数组形状键、命名参数、成员、变量及导入判作互斥位置，普通代码位置集中取得类型、关键字和预期值；只有互斥位置提前返回。实参、返回和赋值中，已证明兼容返回类型的成员排在未知和不兼容成员前，未知候选不被删除。
- 有 PHPDoc 数组形状且实参位置可证明时补全缺少的键，支持嵌套键、可选键、词中替换和 `=>` 插入；已知字段类型也用于值补全。普通数组不生成形状键或推测值。
- 已知 PHPDoc 形状的返回数组及赋值右侧数组同样可补键和值，含嵌套数组；仅有原生 `array` 类型时不推测形状。嵌套形状只沿直接作为数组元素值的数组传递；当闭包或未知函数位于外层实参中时，内部数组不会误继承外层参数形状。LSP 回归核对了补全后的完整文本。
- 在已知实参类型的位置补全 enum case、`true` / `false` / `null`；类型事实已经是 literal 时也可生成对应值。enum 候选按 PHP 版本过滤。
- PHPDoc `@param 'draft'|'final' $state` 现在保留字符串字面量类型；输入无引号前缀 `dra`、现有引号内的 `'dra'` / `"fin"`，或尚未闭合的 `setState('dra`，都能建议对应值。接受建议会替换完整字面量或补上结束引号。命名实参、返回与赋值位置、单个字面量类型也覆盖；普通 `string` 参数、注释及已闭合字符串末尾不伪造字面量候选。PHPDoc 与原生参数类型冲突时沿用原生类型。
- PHPDoc 数组形状字段为字符串字面量联合类型时，字段值现支持无引号、已输入引号及未闭合引号的前缀；嵌套字段同样可用。字段识别只检查值起点以前的 `key =>`，不被值中的引号或前缀干扰。未闭合字符串导致解析器把整段调用折成错误节点时，用一次临时闭合的语法树定位数组；不改动实际文档和编辑范围。普通数组、未知键及闭包内数组不继承外层字段值。
- 若函数或方法体、数组和字符串同时未闭合，原始解析结果可能丢失函数作用域；现在仅对直接赋值给参数或直接 `return` 的数组，从临时语法树定位所属声明，并从紧邻 PHPDoc 恢复可证明的形状类型。要求 PHPDoc 与原生 `array` / `iterable` / `mixed` 类型相容；未知键、普通数组、未知内层调用、闭包及原生类型冲突均不生成字段字面量候选。恢复只读取当前声明的类型事实，不重建整份文件的语义索引。
- 在已知预期类型且光标位于空白实参、`return` 或赋值右侧时，直接推荐当前作用域的局部变量；兼容类型优先，未知类型保留，不混入其它函数的变量。位置实参和命名实参值均覆盖。
- 上述已知类型的空白表达式不枚举整个项目的无前缀函数、常量；输入函数名前缀后仍正常补全。500 个可证明已加载的同命名空间函数场景中，空白列表不含它们。
- PHP 7.2/7.4 的调用位置不再出现只属于 PHP 8.0+ 的 `name:` 命名参数候选，仍可补全普通函数表达式；旧版本的 `?->` 位置不再给出成员建议，普通 `->` 仍可补全。PHP 8.0/8.5 保留命名参数及 nullsafe 成员候选。
- PHP 7.2/8.0 不再建议只属于 PHP 8.1+ 的 enum 类型、case 和 enum 自身的方法；同前缀普通类及其方法仍可用。PHP 8.1/8.5 保留 enum 候选。
- 函数及方法建议插入括号和必需参数占位符；已有括号时只替换名称。普通关键字仍排在单独的 `function`、`if`、`foreach`、`try` 模板前。
- 未限定类型只输入两个字母时，先给出有界的项目 PSR-4 类型候选；该列表保持 `isIncomplete`，继续输入后再查询全部 Composer 映射。缺失 `rg` 时沿项目目录索引的便携路径工作；文件新增或改动会使短前缀缓存失效。
- 同一项目目录有多个 PSR-4 命名空间映射时，两字母搜索现在最多收集 256 个候选并在加载前稳定排序；仍只加载 32 个项目类。此前的 64 项截断依赖文件遍历顺序，可能把真实项目类排除在首轮列表外。
- 两字母项目类搜索按 Composer 根目录缓存最多 16 种前缀；交替输入不同的短类名前缀时复用对应结果，项目文件变动时一并失效。此前只保留最近一种前缀，使独立 PHP 7.2 项目的交替输入反复扫描目录。
- 未限定类型的完整搜索按 Composer 根目录保留最多 16 个前缀结果，并从已缓存的更短前缀筛选；交替输入不同类名时不再反复扫描 vendor。明确限定命名空间的空全局结果不再污染未限定搜索缓存。

## 已验证

| 验证 | 本轮结果 | 范围 |
| --- | --- | --- |
| 语义层完整测试 | 467 项通过 | 包含空白实参局部变量、返回/赋值数组形状及 PHPDoc 字符串字面量的正反例；含函数/方法体与引号同时未闭合的直接赋值和返回；不含 UI。日志：`/tmp/sophp-completion-unclosed-shape-semantic-20260928.log` |
| 语言服务器完整测试 | 431 项通过、1 项跳过 | 未闭合赋值/返回数组作用域恢复后的完整回归，21 个测试文件通过；日志：`/tmp/sophp-completion-unclosed-shape-full-lsp-20260928.log`。|
| 冷类型搜索修复后完整 LSP 回归 | 431 项通过、1 项跳过 | 21 个测试文件通过；覆盖限定命名空间、自动导入、classmap/files、PSR-0、缺失映射目录以及其它语言服务器功能。执行 `pnpm --filter @php-companion/language-server test`，耗时约 542 秒。|
| 两字母类型补全后完整 LSP 回归 | 431 项通过、1 项跳过 | 最新源码的 21 个测试文件通过，包含跨命名空间两字母项目候选、无 `rg` 便携路径和新增文件后的缓存失效；耗时约 543 秒。日志：`/tmp/sophp-completion-short-prefix-full-lsp-20260928.log`。|
| 多前缀缓存修复后完整 LSP 回归 | 431 项通过、1 项跳过 | 21 个测试文件通过；含新增的限定命名空间后未限定类名回归。耗时约 542 秒；日志：`/tmp/sophp-completion-multiprefix-full-lsp-20260928.log`。同一源码的 `pnpm typecheck`、`pnpm lint` 与 `git diff --check` 通过。|
| 重复映射短前缀修复后完整 LSP 回归 | 433 项通过、1 项跳过 | 21 个测试文件通过，新增普通 `rg` 与便携搜索各一项重复映射回归；耗时约 543 秒。日志：`/tmp/sophp-completion-short-duplicate-full-lsp-20260929.log`。最新源码的 `pnpm typecheck`、`pnpm lint` 和 `git diff --check` 均通过。|
| 两字母多前缀缓存后完整 LSP 回归 | 433 项通过、1 项跳过 | 21 个测试文件通过，含重复映射、缓存失效、自动导入及其它语言服务器回归；耗时约 539 秒。唯一跳过项是未设置 `PHP_COMPANION_TEST_REFERENCE_BUNDLE` 的跨进程引用持久化测试，与补全无关。日志：`/tmp/sophp-completion-short-multiprefix-full-lsp-20260929.log`。本次 `pnpm typecheck`、`pnpm lint` 和 `git diff --check` 通过；新增的宿主交替输入断言另做编译与 lint 检查。|
| S10 导入编辑复核 | 定向 LSP 1 项通过 | 同前缀函数与常量候选均出现；近命名空间候选分别携带正确的 `use function`、`use const` 编辑。新增断言只修改测试，产品源码未改。|
| 项目级源码检查 | `pnpm typecheck`、`pnpm lint` 均通过 | 类型检查覆盖工作区包、Core 扩展和 Symfony 扩展；lint 覆盖 `src`、`test`、`packages`、`scripts`。日志：`/tmp/sophp-completion-source-typecheck-20260928.log`、`/tmp/sophp-completion-source-lint-20260928.log`。未运行打包命令。|
| 两字母类型补全后工作区类型检查 | `pnpm typecheck` 退出码 0 | 最新源码重新构建工作区包，并完成 Core 与 Symfony 扩展的 TypeScript 检查；与最新完整 LSP、隔离源码宿主和此前通过的 lint 一起构成源码验证。未打包或更新用户 Profile。|
| Winstar 只读规模样本 | 磁盘版 `src/Config/app.php` 的内存副本上四项 LSP 查询通过 | 根目录 `/var/www/php/8.5/winstar2024`，PHP 8.5、onDemand 模式，缓存仅写入临时目录；`n`、`func`、完整 `function`、函数体内 `retu` 分别以 `new`、`function`、`function`、`return` 排首位，无截图中的不相关候选。初始化 1386 ms，四次查询 64、22、6、30 ms，均为完整列表；日志：`/tmp/sophp-winstar-completion-readonly-20260928.log`。项目文件未改动；这不是运行中的 WSL 编辑器弹窗验收。|
| Winstar 项目及 vendor 符号 | 磁盘版 `src/Config/app.php` 的内存副本上三项 LSP 查询返回目标符号 | `new App\Runtime\ApplicationBoo` 的 `ApplicationBootstrap` 排首位；`new Symfony\Component\Dotenv\Dot` 的 `Dotenv` 排首位；`$dotenv->loa` 中 `loadEnv` 排第二，前后还有相关的 `load`、`overload`。首次项目类查询 3512 ms、vendor 类 312 ms、成员 9 ms。前两次冷类型结果标记 `isIncomplete: true`，说明候选已出现但列表尚未完全扩充，不能计作完整冷查询；日志：`/tmp/sophp-winstar-completion-symbols-readonly-20260928.log`。项目文件未改动。|
| Winstar 冷类型重复查询 | 同一文档同一前缀三次均返回 `ApplicationBootstrap` 首位，但均为 `isIncomplete: true` | 首次 3331 ms；相隔 500 ms 的后两次为 67、64 ms。证明热查询已降至预算内，但该前缀的列表未收敛为完整结果；不能以“目标候选出现”替代完整冷候选验收。日志：`/tmp/sophp-winstar-type-convergence-20260928.log`。|
| Winstar 限定命名空间冷类型修复 | 磁盘文件的只读内存副本上三次 `new App\\Runtime\\ApplicationBoo` 均返回完整列表，`ApplicationBootstrap` 排首位 | 临时分段追踪发现旧路径的本地 PSR-4 候选耗时约 323 ms、全项目 PSR-4 搜索约 2991 ms 且超时为不完整、非 PSR-4 来源约 16 ms；日志：`/tmp/sophp-winstar-type-trace-20260928.log`。源码现在对明确限定命名空间的类型只探测相应 PSR-4 目录，同时继续搜索 classmap/files/PSR-0；新路径首次 425 ms、重复 7/5 ms，三次 `isIncomplete: false`。相关 LSP 7 项与类型检查通过。未改动 Winstar 文件，未进行真实编辑器弹窗验收。|
| Winstar 未限定类名冷类型修复 | 内存副本上三次 `new ApplicationBoo` 均返回完整列表，`ApplicationBootstrap` 排首位 | 旧路径首次 3436 ms、随后 65/59 ms，三次均不完整。追踪发现 231 个 PSR-4 根目录中有两个不存在的 `src\\` 路径，`rg` 约 73 ms 返回错误码 2，触发约 2944 ms 的全量目录回退；源码现在先排除确认不存在的映射目录，保留其它错误的安全回退。新路径首次 579 ms、重复 14/12 ms，三次 `isIncomplete: false`。含缺失映射目录的相关 LSP 7 项及类型检查通过；只读验证，非真实 UI 验收。|
| Winstar 连续未保存编辑 | 100 次 `new ApplicationBoo` / `new Dotenv` 交替的只读内存文档查询 | 最新源码下 P50 74.61 ms、P95 85.74 ms、最大 429.24 ms（首次冷查询）；每次均含对应类型、无前一版本类型且为完整列表。缓存仅写入临时目录，未改动 Winstar 文件。该结果覆盖大项目跨前缀热查询预算，不代表 WSL 编辑器可见等待。|
| Winstar 两字母项目类型 | `new Ap` 的只读内存副本与 100 次 `Ap` / `Ax` 交替编辑 | 修复前只显示 `AppendIterator`；修复后 `ApplicationBootstrap` 稳定排第三。初版加载过多候选，热查询 P95 241.62 ms；将项目提示候选限制为 32 个后，100 次编辑 P50 22.61 ms、P95 90.84 ms、最大 607.46 ms（首次冷查询），无旧候选。短前缀列表明确标记 `isIncomplete`，超过两个字母时仍走完整 Composer 搜索；PHP 7.2/8.5 真实 WSL 弹窗未验收。|
| Winstar 规模基准可复跑 | 仓库内通用只读命令 `scripts/benchmark-project-completion.mjs` 两组各 100 次交替编辑通过 | 最新复跑：`ApplicationBoo` / `Dotenv` 总 P95 81.50 ms、两类结果均完整；`Ap` / `Ax` 总 P95 83.08 ms、两类结果均标记不完整且未串入旧候选。首次冷查询分别 428.27、554.56 ms。命令只读取 PHP 文件，在 LSP 内存文档发送编辑，缓存写入临时目录并清理；不修改项目。结果会随机器负载变化，不是 WSL Workbench 可见等待。|
| 多前缀缓存与第二个 Composer 项目 | 限定命名空间后再查未限定 `Inv` 的回归通过；PSR-4、classmap/files、PSR-0 的 3 项定向 LSP 测试通过 | PHP 7.2 CoreRepo 的 `CanonicalUr` / `LanguageRul` 交替输入，修复前 100 轮总 P95 259.45 ms，修复后 P95 20.65 ms、每轮完整且目标存在。Winstar 的 `ApplicationBoo` / `Dotenv` 修复后 100 轮 P95 12.48 ms、每轮完整。两者均只读真实文件，查询仅修改 LSP 内存文档。|
| PHP 7.2 两字母交替前缀 | CoreRepo 的 `Ca` / `La` 各 50 次交替输入，且 Winstar 的 `Ap` / `Ax` 100 轮只读基准通过 | CoreRepo 修复前总 P95 283.42 ms；把短前缀搜索改为 16 项有界缓存后，两次独立 100 轮总 P95 为 41.13、31.28 ms，目标类每轮出现。Winstar 最新总 P95 23.09 ms，`ApplicationBootstrap` 每轮出现。冷首查约 465–655 ms；结果均标记 `isIncomplete`，继续输入第三字母会扩展为完整 Composer 搜索。|
| 两字母冷首查截断修复 | PHP 8.5 真实 Winstar 只读样本五次独立冷启动，每次 100 轮 `Ap` / `Ax` 交替编辑均通过；有/无 `rg` 的重复映射协议回归各 1 项通过 | 旧代码在首轮随机返回 29 个 `Ap` 候选但缺 `ApplicationBootstrap`，结果仍标记 `isIncomplete`。项目 `src/` 同时映射两个命名空间，原搜索按文件遍历顺序在 64 项截断。修复后五次查询的总 P95 为 65.57–80.74 ms，目标每轮出现且无旧候选；冷首查 565–674 ms。当前仍是只读 LSP 查询，不代表真实 WSL 可见弹窗。|
| 两字母类型协议与可见列表 | 定向 LSP 2 项和隔离 VS Code 源码宿主通过 | 跨命名空间项目类型 `Re` 可补出 `Receipt`；新增 `Remark.php` 后缓存失效并出现新类；无 `rg` 的便携搜索同样补出跨命名空间类。Workbench 中输入 `Sh` 可见 `ShallowType` 与 `ShortProjectType`，实际再输入 `o` 后列表只保留匹配的目标类，协议结果从 `isIncomplete: true` 收敛为完整列表。函数调用、模板、占位符和 Undo 继续通过；本次六次可见列表等待中位 231 ms、最大 238 ms。|
| 重复映射修复后隔离宿主 | C1 补全可见列表及接受测试退出码 0 | `Sh` 的项目类仍在 Workbench 可见，继续输入 `o` 后列表收敛；函数调用、词中替换、Tab 模板、占位符及 Undo 通过。六次可见列表等待中位 234 ms、最大 255 ms；日志：`/tmp/sophp-completion-short-duplicate-host-20260929.log`。该宿主夹具没有重复映射，重复映射由上面的两项协议回归覆盖。|
| 两字母交替输入的 Workbench 列表 | 最新编译产物的 C1 补全可见列表与接受测试退出码 0 | 实际 Workbench 输入 `Sh → Ot → Sh`，三次可见候选随未保存文本切换，不保留上一前缀的项目类；继续输入第三字母后列表收窄。最新六次可见列表等待中位 232 ms、最大 247 ms；日志：`/tmp/sophp-completion-latest-visible-host-20260929.log`。先前用 `TextEditor.edit` 程序化替换的版本，LSP 新候选已正确但 Workbench 弹窗留在旧列表，日志：`/tmp/sophp-completion-short-multiprefix-host-20260929.log`；真实打字路径已通过，程序化替换后的弹窗刷新不据此宣称通过。|
| 冷类型修复后源码宿主 | 隔离 VS Code 补全可见列表与接受测试退出码 0 | 六次可见列表等待中位 243 ms、最大 249 ms；函数调用、词中成员替换、Tab 模板、占位符、Undo 通过。执行 `PHP_COMPANION_TEST_C1_UI=1 PHP_COMPANION_TEST_C1_COMPLETION_ONLY=1 pnpm test:extension:c1`，未打包 VSIX、未安装 Profile。|
| 语言服务器相关回归 | 35 项通过、193 项跳过 | 最新源码上的补全、关键字、参数、值、模板及类体候选集合；含空白过滤和输入前缀后的函数恢复 |
| 隔离 VS Code 源码宿主 | 退出码 0 | Workbench 可见 `sendInvoice`、`getUserCount`、`get_user_count`；兼容常量和成员排在各自不兼容候选之前；实际 Enter 接受调用和 `funct|ion`，Tab 接受 `if` 模板；词中替换、占位符和 Undo 正确 |
| Core 候选 VSIX 隔离宿主 | 两项定向测试退出码 0 | 从候选 VSIX 加载 Core，原始 `n/func/function/retu` 等九项关键字场景通过；Workbench 可见调用、词中成员、Tab 模板、占位符和 Undo 通过。六次可见列表等待中位 236 ms、最大 249 ms |
| 最新源码隔离宿主 | 关键字与补全定向测试退出码 0 | `public function` 列表不混入类名；空白命名实参 `$name` 可见、排在类型不符的 `$number` 前，无前缀函数缺席，Enter 后为 `value: $name` 且 Undo 恢复 |
| 旧候选缓存修复后的最新源码隔离宿主 | C1 补全可见列表及接受测试退出码 0 | 词中成员替换、函数调用、短类名前缀交替输入、第三字符重新触发、Tab 模板、必需参数占位符及 Undo 均通过；六次可见列表等待 234、229、247、239、229、236 ms，中位 235 ms、最大 247 ms。测试使用独立用户数据目录与源码扩展，未打包或改动用户 Profile；不能代替真实 WSL 窗口验收。 |
| 同一最新源码的 PHP 7.2 隔离宿主 | C1 补全可见列表及接受测试退出码 0 | 在 `PHP_COMPANION_TEST_C1_PHP_VERSION=7.2` 下复用已构建源码与独立用户数据目录；函数调用、短类名前缀交替输入、第三字符重新触发、词中成员替换、Tab 模板、占位符和 Undo 均通过。六次可见列表等待 218、219、222、222、222、224 ms，中位 222 ms、最大 224 ms；不代表真实 WSL Profile。 |
| 旧候选缓存修复后的完整 LSP 回归 | 21 个测试文件通过；434 项通过、1 项跳过 | 最新源码运行 `pnpm --filter @php-companion/language-server test`，耗时约 536 秒，覆盖补全、Provider、索引与其它语言服务器协议路径。跳过项仍为需要额外引用持久化测试包的用例；隔离编辑器结果见上一行。 |
| 命名参数版本边界 | 定向 LSP 4 项通过；PHP 7.2/8.5 隔离宿主退出码 0 | PHP 7.2/7.4 不含 `first:`，且 `fillFromDefault` 普通函数仍可用；PHP 8.0/8.5 含 `first:`；隔离编辑器分别观察到 PHP 7.2 普通函数与 PHP 8.5 命名参数 |
| enum 版本边界 | 定向 LSP 4 项通过；PHP 7.2/8.5 隔离宿主退出码 0 | PHP 7.2/8.0 不含 enum 类型、case 和 enum 方法；PHP 8.1/8.5 含这些候选；普通类及方法在四个版本均保留。隔离宿主日志：`/tmp/sophp-completion-enum-version-host-72-20260928.log`、`/tmp/sophp-completion-enum-version-host-85-20260928.log` |
| nullsafe 版本边界 | 定向 LSP 4 项通过；PHP 7.2/8.5 隔离宿主退出码 0 | PHP 7.2/7.4 的 `?->` 不给出成员；PHP 8.0/8.5 给出；普通 `->` 在四个版本均可补全。隔离宿主日志：`/tmp/sophp-completion-nullsafe-version-host-72-20260928.log`、`/tmp/sophp-completion-nullsafe-version-host-85-20260928.log` |
| 返回/赋值数组形状 | 完整语义 465 项、定向 LSP 2 项通过；PHP 7.2/8.5 隔离宿主退出码 0 | 已知 PHPDoc 形状的键和值及嵌套键出现，普通原生数组不生成形状值；闭包和未知内层调用的误报负例通过；LSP `textEdit` 接受后文本正确。最新 PHP 8.5 宿主日志：`/tmp/sophp-completion-final-shape-boundary-host-85-20260928.log` |
| PHP 8.5 完整 C1 隔离宿主 | 最新源码复跑退出码 0 | 多根、Composer vendor、未保存接收者切换前后的六组编辑查询及现有 C1 编辑器能力通过；本次日志：`/tmp/sophp-completion-latest-c1-85-20260929.log`。历史 12 次热补全命令中位 5 ms、最大 8 ms。|
| PHP 7.2 完整 C1 宿主 | 最新源码复跑退出码 0 | 旧版本设置下六项编辑查询、Composer vendor 和多根链路通过；本次日志：`/tmp/sophp-completion-latest-c1-72-versioned-20260929.log`。首次复跑因测试无条件要求 PHP 8.1+ 的 enum 出现在 PHP 7.2 `instanceof` 补全而失败；语言服务器正确过滤了 enum，测试改为按目标版本断言后通过。历史 12 次热补全命令中位 5 ms、最大 11 ms。|
| Workbench 可见等待 | 223、246、235、246、229、249 ms；中位 241 ms | 六个独立小型 Composer PHP 文件，源码宿主，非 WSL Remote |
| 真实 Composer vendor 可见等待 | 223、225、214、232、232、243 ms；中位 229 ms | 隔离宿主中 Symfony `HeaderBag` 方法 6/6 出现；普通 PHP 方法中位 253 ms；A→B→A 可见候选正确 |
| 热查询 | 成员补全 P95 2.45 ms；类型化实参变量 P95 2.64 ms；类型化成员 P95 3.49 ms | 100 次交替未保存编辑；三者低于 150 ms 预算，无旧候选 |
| 最新热查询 | 空白实参 P95 1.87 ms；类型化实参变量 P95 2.10 ms；类型化成员 P95 3.66 ms | Composer fixture 加 500 个已加载函数，100 次交替未保存编辑；均低于 150 ms 预算，无旧候选；这不是完整真实 vendor 规模测试 |
| 闭包边界修复后热查询 | 空白实参 P95 3.20 ms；类型化实参变量 P95 3.04 ms；类型化成员 P95 3.40 ms；嵌套形状键和值各 P95 约 0.89 ms | 前三项在 500 个已加载函数的 100 次编辑基准中测得，无旧候选；形状键和值在小型热语义 fixture 各测 100 次。两者均非真实 WSL 可见等待 |
| 外层实参误报修复后热查询 | 空白实参 P95 2.99 ms；类型化实参变量 P95 3.11 ms；类型化成员 P95 4.29 ms | 500 个已加载函数、100 次交替编辑，无旧候选；日志：`/tmp/sophp-completion-final-shape-boundary-benchmark-20260928.log` |
| PHPDoc 字符串字面量修复 | PHPDoc parser 15 项、完整语义 466 项、完整 LSP 430 项通过且 1 项跳过、完整 C1 隔离 VS Code 源码宿主退出码 0 | Workbench 可见 `'draft'` 而无 `'final'`；Enter 后为 `completionSetState('draft')`，Undo 恢复；不等于真实 WSL UI 验收 |
| 已输入引号的字面量值 | 完整语义 466 项、定向 LSP 1 项、完整 C1 隔离宿主退出码 0 | `'dra'` / `"fin"` 的 LSP 编辑替换整个原字符串；Workbench 可见 `'draft'`，Enter 后没有重复引号，Undo 恢复；普通 `string` 参数无字面量候选。宿主日志：`/tmp/sophp-completion-quoted-literal-host-20260928.log` |
| 未闭合引号的字面量值 | 完整语义 466 项、定向 LSP 1 项、完整 C1 隔离宿主退出码 0 | `setState('dra` 的候选可见；Enter 补上结束引号、Undo 恢复。注释与已闭合字符串末尾不误触发；热补全 P95 2.56–4.35 ms，500 个已加载函数、100 次交替编辑无旧候选。日志：`/tmp/sophp-completion-unclosed-literal-host-20260928.log`、`/tmp/sophp-completion-unclosed-literal-benchmark-20260928.log` |
| PHPDoc 冷查询的索引代次竞态 | 定向 LSP 1 项及真实 Composer vendor 加 1000 个无关类的完整 C1 隔离宿主通过 | 文件事件使候选搜索代次失效时，当前文档查询在新代次重试一次；连续两次失效则返回 `isIncomplete: true`，下一次查询可恢复。协议测试暂停 PHPDoc `@template` 补全并插入两轮文件事件，精确覆盖两个分支。宿主日志：`/tmp/sophp-completion-phpdoc-cold-epoch-host-20260928.log`；热补全 P95 2.28–3.44 ms，无旧候选：`/tmp/sophp-completion-epoch-retry-benchmark-20260928.log` |
| 数组形状字符串字面量值 | 完整语义 467 项、定向 LSP 1 项、隔离 C1 可见列表通过 | `'dra'`、嵌套 `"fin"`、未闭合 `'dra` 的接受结果正确；普通数组、未知键及闭包反例通过。原有形状值的 100 次交替未保存编辑查询 P95 1.19 ms、最大 2.38 ms，无旧值。隔离宿主 Enter/Undo 退出码 0：`/tmp/sophp-completion-shape-literal-host-fixed-fixture-20260928.log`。宿主测试原先在多文件重复声明同名全局函数，造成签名歧义；夹具改为唯一函数名后通过。|
| 未闭合赋值与返回数组 | 完整语义 467 项、定向 LSP 与隔离 C1 可见列表通过 | 函数、方法、嵌套返回形状的字面量值正确；普通数组、未知键、闭包/未知调用及原生类型冲突反例通过。隔离宿主 Enter/Undo 退出码 0：`/tmp/sophp-completion-unclosed-shape-assignment-host-built-20260928.log`。1000 个同文件无关函数、100 次交替未保存编辑，查询 P95 82.57 ms、最大 100.28 ms、无旧值：`/tmp/sophp-completion-unclosed-shape-1000-noise-benchmark-20260928.log`。|
| 修复后热查询 | 空白实参 P95 2.08 ms；类型化实参 P95 3.17 ms；成员 P95 2.33 ms；类型化成员 P95 2.96 ms | 500 个已加载函数、100 次交替编辑，无旧补全；均低于 150 ms，日志：`/tmp/sophp-completion-quoted-literal-benchmark-20260928.log` |

历史 LSP 完整回归日志：`/tmp/sophp-completion-full-lsp-after-noise-20260928.log`；语义与相关 LSP 回归日志：`/tmp/sophp-completion-blank-noise-semantic-final-20260928.log`、`/tmp/sophp-completion-blank-noise-lsp-related-20260928.log`。源码宿主日志：`/tmp/sophp-completion-context-host-20260928.log`、`/tmp/sophp-completion-context-c1-85-20260928.log`、`/tmp/sophp-completion-context-c1-72-20260928.log`、`/tmp/sophp-completion-context-real-vendor-20260928.log`、`/tmp/sophp-completion-context-real-vendor-recheck-20260928.log`、`/tmp/sophp-completion-full-method-source-host-20260928.log`、`/tmp/sophp-completion-blank-noise-source-host-20260928.log`；候选 VSIX 宿主日志：`/tmp/sophp-completion-packaged-core-workbench-20260928.log`、`/tmp/sophp-completion-packaged-core-keywords-20260928.log`；最新热查询日志：`/tmp/sophp-completion-blank-noise-500-benchmark-20260928.log`。

Core 历史候选快照：`artifacts/sophp-completion-core-20260928/php-companion-0.4.13-completion-core.vsix`（2,536,888 字节），SHA-256 `8dd6fd2a4d132f03d76fa79ba8c64f3fe3bbf3f3bccde2ee7b7489b1e464c82a`。其 ZIP 内容和隔离宿主已验证，但它**不包含后续的 `public function` 类名过滤、空白实参局部变量及无前缀噪声过滤修复，不应当作最新源码安装**。当时根目录 VSIX 保留，未安装到用户 Profile，未另打包 Symfony 或 Pack，未提交、推送或发布；真实 WSL 窗口仍未验收。

2026-09-29 更新：后续补全源码已打成 `artifacts/sophp-completion-core-20260929/php-companion-0.4.13-completion-core.vsix`，完成 ZIP/构建文件核对及隔离打包宿主 C1 补全测试，并强制安装到 `PHP Companion Alpha` Profile。同日修复 `require_once __DIR__ . '/vendor/autoload_runtime.php'` 的文件定义跳转后，仅 Core 再打包为 `artifacts/sophp-include-definition-20260929/php-companion-0.4.13-include-definition.vsix`（SHA-256 `6725821c8d09279a6350757c6e93b7397401c96cbb019a2b4d2b2b8b1a74d8c8`）并覆盖安装；安装目录运行文件与此 VSIX 一致，已安装服务器对 Winstar `index.php` 的只读 LSP 请求返回真实 `vendor/autoload_runtime.php`。Profile 中的 Symfony、Pack 未重装。用户正在真实使用并会按遇到的问题反馈；这些安装及协议证据不等于真实窗口验收。后续 C3 源码增量尚未安装。

首次候选宿主运行没有打开 Workbench 调试入口，测试用 `acceptSelectedSuggestion` 命令接受词中成员后文本未变，日志在 `/tmp/sophp-completion-packaged-core-20260928.log`。同一候选随后通过可见列表与实际 Enter/Tab 输入路径。候选验收以真实输入路径为准；程序命令路径的差异保留在日志，不把它解释成源码修复。

此前源码的完整 LSP 日志：`/tmp/sophp-completion-full-lsp-final-source-20260928.log`、`/tmp/sophp-completion-full-lsp-shape-boundary-20260928.log`、`/tmp/sophp-completion-literal-full-lsp-20260928.log`、`/tmp/sophp-completion-unclosed-literal-full-lsp-20260928.log`、`/tmp/sophp-completion-epoch-retry-full-lsp-20260928.log`、`/tmp/sophp-completion-shape-literal-full-lsp-20260928.log`、`/tmp/sophp-completion-unclosed-shape-full-lsp-20260928.log`、`/tmp/sophp-completion-short-multiprefix-full-lsp-20260929.log`；最新完整 LSP 结果为上表的 434 项通过、1 项跳过；闭包边界修复后热查询日志：`/tmp/sophp-completion-shape-final-benchmark-20260928.log`。

## 下一步与退出条件

1. 60 项矩阵及当前源码的完整语义、完整 LSP、定向隔离宿主与性能验证均已完成；继续收敛直接影响计划内体验的可复现缺口，不无限扩展补全范围。
2. 在 1000 个生成的 vendor 类加真实 Composer 包的隔离宿主中，PHPDoc 连续模板边界曾有一次首查缺少候选。定向协议测试现已复现一种相关竞态：新文件事件让候选搜索代次失效时，旧路径会把结果当作完整空列表；当前源码在同一文档版本下重试一次，连续变化时返回 `isIncomplete`。真实 Composer vendor 加 1000 类的隔离宿主复测通过；历史偶发是否完全由这条竞态引起仍未证明。宿主检查继续要求首查缺席时必须标记 `isIncomplete` 并在 5 秒内恢复，不用反复全量运行碰运气。
   PHPDoc 字符串字面量联合类型原先未在实参签名中保留，根因是 PHPDoc 类型解析器未识别引号字面量；现已修复并通过解析、语义、LSP 及隔离编辑器可见列表与接受测试。该代码缺口已关闭，真实 WSL 编辑器仍待用户安排使用时验收。
3. 最新 Core 补全候选已安装到 Alpha Profile，等待用户在原 WSL 窗口重载并反馈真实补全结果；按具体问题定向修正，不因自动化 60/60 而声称真实体验已通过。日常独立源码工作不重复打包，用户要求升级时再更新 Profile。
4. 函数体本身未闭合且 `$config = ['status' => 'dra` 也没有闭合引号的作用域恢复已通过语义、LSP、可见列表和性能验证；后续仅对真实使用中可复现的计划内缺口继续修正。
5. Winstar 只读样本中，明确限定命名空间的项目类冷查询已由约 3.3–3.5 秒且持续不完整，改为首次 425 ms、随后 7/5 ms 且均完整；无命名空间限定的同类查询由首次 3436 ms 且持续不完整，改为首次 579 ms、随后 14/12 ms 且均完整。前者避免已定位目录后再全局扫描；后者跳过 Composer 映射中确认不存在的目录，避免 `rg` 错误码 2 触发全量回退。100 次跨前缀未保存编辑 P95 85.74 ms、无旧候选。其它大型项目和真实 WSL 可见弹窗仍未验收。
6. PHP 7.2 CoreRepo 暴露的跨前缀热查询超预算已通过有界多前缀缓存修复；对应 100 轮 P95 从 259.45 ms 降至 20.65 ms。限定命名空间查询污染未限定缓存的漏候选也已由回归用例捕获并修复。两字母查询的首轮偶发缺席已追到重复 PSR-4 映射下的 64 项随机截断；有/无 `rg` 的协议回归及五次独立 Winstar 冷启动通过，真实 WSL 弹窗仍待人工使用时核对。
7. CoreRepo 中两字母 `Ca` / `La` 交替补全另外暴露了“短前缀只缓存上一种输入”的热查询超预算，100 轮总 P95 283.42 ms；改为 16 项有界缓存后两次复测为 41.13、31.28 ms。Winstar `Ap` / `Ax` 修复后总 P95 23.09 ms。冷首查仍约半秒，真实 WSL 可见等待待人工使用时核对。

只读规模基准可从仓库根目录复跑（先构建语言服务器与 testkit）：

```sh
node scripts/benchmark-project-completion.mjs /var/www/php/8.5/winstar2024 /var/www/php/8.5/winstar2024/src/Config/app.php 'new ApplicationBoo' ApplicationBootstrap 'new Dotenv' Dotenv 100
node scripts/benchmark-project-completion.mjs /var/www/php/8.5/winstar2024 /var/www/php/8.5/winstar2024/src/Config/app.php 'new Ap' ApplicationBootstrap 'new Ax' - 100
SOPHP_BENCHMARK_PHP_VERSION=7.2 node scripts/benchmark-project-completion.mjs /var/www/php/7.2/CoreRepo /var/www/php/7.2/CoreRepo/App/bootstrap.php 'new CanonicalUr' CanonicalUrl 'new LanguageRul' LanguageRules 100
SOPHP_BENCHMARK_PHP_VERSION=7.2 node scripts/benchmark-project-completion.mjs /var/www/php/7.2/CoreRepo /var/www/php/7.2/CoreRepo/App/bootstrap.php 'new Ca' CanonicalUrl 'new La' LanguageRules 100
```
