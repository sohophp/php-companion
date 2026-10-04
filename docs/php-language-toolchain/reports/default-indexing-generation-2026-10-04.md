# 默认索引模式的成员生成与预览（2026-10-04）

## 本次范围

继续 C3 的生成入口；沿用同一分支、现有未提交 Import 改动，不更新 Profile、打包、推送或发布。

新协议矩阵先复现 6 项失败：onDemand／progressive 被全局 complete 标记挡住，experimental 也会生成无 watcher 外部修改前的旧接口签名；预算不足时连纯当前文件构造函数都消失。日志 `/tmp/sophp-default-generation-red-20261004.log`。

## 源码调整

- 整理导入和纯当前文件的构造函数生成前移；既有构造函数语义仍拒绝 extends／Trait 等不支持情况，不因依赖扫描预算不足丢掉可证明的当前文件操作。
- 依赖当前项目／继承关系的接口方法、抽象方法、访问器、覆盖方法及既有私有参数重写，改为按请求核对项目与 Composer 依赖，不要求 onDemand／progressive 获得全局 complete 标记。扫描不完整不提供这组建议。
- 将上一批源码复用整理为通用受检磁盘事实缓存：仍枚举、检查 size／mtime／ctime、核对打开缓冲区与当前语义事实；完整生成扫描核验实现事实已加载，避免复用只有声明的缓存。普通完整重构扫描也补齐相同源码下尚未加载的实现事实。
- 生成结果在受检事实仍有效的同步回调中读取，发布前检查原文档身份／版本及取消状态。失效最多重核验一次，预算不放宽。
- Code Action 的成员生成现已走现有预览／取消／应用及过期保护命令；原有私有参数重写的跨文件哈希快照继续传递。整理导入和不要求项目生成事实的局部提取请求，不额外等待这组成员生成扫描。

## 协议验证

最终定向 7 项通过，469 项未运行，日志 `/tmp/sophp-default-generation-protocol-final-20261004.log`。

三模式／成功与预算矩阵覆盖当前文件构造函数、访问器、vendor 接口／抽象方法与具体父方法覆盖；无 watcher 的接口签名变化必须进入下一次生成；未保存字段修改必须进入构造函数；扫描结束处暂停后修改活动文档，旧请求必须返回空建议。超预算时允许已证明的纯当前文件构造函数，拒绝依赖完整项目事实的建议。原有跨 namespace 参数／返回类型及常量默认值生成回归继续通过。

第一次组合回归是 14 通过／1 失败：生成和原有接口生成通过，progressive Import 恢复 vendor 声明仍出现空列表，日志 `/tmp/sophp-default-generation-green-20261004.log`。此前受控 Import 覆盖路径的通过不关闭这个新失败；没有放宽断言或将组合回归说成全绿，暂不继续靠重复运行追查同一问题。

## 隔离编辑器

串行 onDemand／progressive 都退出 0，各自四种实际 Code Action 的预览取消／应用、接受文本、单次 Undo/Redo 和再次执行旧建议的拒绝通过。构造函数使用未保存的 string 字段，磁盘仍是原始 int 字段；其余接口／抽象／覆盖方法验证生成的真实签名及父调用。所有应用保持磁盘原文，不保存 fixture 文件。

日志 `/tmp/sophp-default-generation-host-onDemand-final-20261004.log`、`/tmp/sophp-default-generation-host-progressive-20261004.log`。最初宿主使用了错误的内建命令 kind 参数对象，改为其字符串 value 后通过；失败日志 `/tmp/sophp-default-generation-host-onDemand-20261004.log` 保留，不属于用户窗口的功能失败。

复用方式：

```sh
pnpm --filter @php-companion/language-server build
pnpm exec tsc -p test/extension/tsconfig.json
node esbuild.mjs --production
PHP_COMPANION_TEST_C3_ONLY=1 PHP_COMPANION_TEST_C3_GENERATION_ONLY=1 PHP_COMPANION_TEST_C3_INDEXING_MODE=onDemand node scripts/run-extension-test.mjs ./dist-test/runTest.js
# 串行第二次改为 progressive。
```

onDemand 的既有局部提取宿主另外通过 7 个场景：3／4 个分支输出、两种标量链捕获及数值／类型／字符串 return；每项验证预览、取消／应用和一次 Undo/Redo。日志 `/tmp/sophp-default-generation-local-extraction-onDemand-20261004.log`。这是本次公共流程改动的定向回归，不是完整提取支持域验收。

Language Server／扩展构建、宿主编译、根 typecheck、修改源文件 ESLint 及 diff 检查通过。

## 保留的边界

这些是独立 fixture、真实 LSP 和隔离 Linux 编辑器证明，不是已安装 WSL Profile 的真人验收。不扩展生成语义的支持域；仅当前文件构造函数在预算不足时独立可用，其它生成仍需要当前完整来源。尚未测量大规模生成等待或峰值内存，不能将 Import 的规模数据套给生成入口。复杂动态继承、其它平台及完整 C3 尚未关闭。

本批与此前 Import 源码留在同一分支，待 C3 收口一起整理提交。

## 生成预览期间声明来源变化（后续增量）

隔离 onDemand 宿主先复现真实缺口：取得接口实现建议后，在预览应用前修改接口签名，旧建议仍返回 true 并应用。失败证据 `/tmp/sophp-generation-guard-red.log`。

接口实现、抽象方法实现、父类方法重写现在附带实际方法声明来源的 SHA-256 快照，复用现有 refactorSnapshots 协议。公共预览流程校验快照中的非编辑来源，不再只检查被修改的目标；开始预览和应用前分别检查当前缓冲区与磁盘。没有把所有 Composer 文件都加入预览快照。本次覆盖实际方法声明文件，尚未宣称完整继承图变化、新增符号和所有语义依赖均已关闭。

定向协议 7 项通过（`/tmp/sophp-generation-guard-protocol.log`）。onDemand 初版宿主验证三类声明来源的磁盘修改拒绝及四类生成原有预览／Undo/Redo 通过（`/tmp/sophp-generation-guard-host-onDemand.log`）；随后扩充未保存依赖签名变化，串行 onDemand／progressive 宿主四类生成都通过（`/tmp/sophp-generation-guard-host-onDemand-final.log`、`/tmp/sophp-generation-guard-host-progressive-final.log`）。未保存变更不写入磁盘，恢复基线后同一建议仍能正常应用。构建、根 typecheck、宿主编译、源文件 ESLint 通过。未更新 Profile，不是用户真实 WSL 验收。

## 中间继承关系与访问器的预览失效保护

新增独立中间 interface／abstract class fixture：消费者通过 Bridge 继承原方法，取得建议后在预览应用前撤去 Bridge 的 extends，方法原声明文件保持不变。旧实现仍返回 true 并应用接口方法，失败证据 `/tmp/sophp-generation-hierarchy-red.log`。仅校验最终方法声明文件不足以证明当前继承关系仍成立。

语义层新增有界 `declarationHierarchySourceUris`：从具名类型收集 class／interface／Trait 的完整已解析继承输入，包括 alias、接口祖先及嵌套 Trait；同名重复声明、缺失输入或超出现有 64 节点图上限不提供证明。沿用已有图预算，没有全工作区快照。成员生成在已核验当前源码的同步回调内取得这些输入及哈希，并按类型复用当前请求中的快照。接口实现、抽象实现、重写及属性访问器均复用现有预览 guard；只使用当前文件事实的构造函数保持独立。

版本化内建 facts 不通过文件系统校验，避免把其虚拟 URI 作为磁盘文件；本增量只关闭实际继承来源文件在预览期间改变的路径，不宣称版本／扩展配置变化、新增竞争声明或签名默认值引用的所有语义依赖已关闭。

语义 4 项通过（`/tmp/sophp-generation-hierarchy-semantic-tests.log`）：实时、仅声明、恢复缓存三种事实源的 alias／嵌套 Trait／接口链，未保存关系更新、重复与缺失声明，以及 64／65 节点边界。定向协议 7 项通过（`/tmp/sophp-generation-hierarchy-protocol.log`），并断言接口建议带当前消费者及 vendor 来源的实际 SHA-256。

onDemand 隔离宿主五类真实生成通过（`/tmp/sophp-generation-hierarchy-host-onDemand.log`）：构造、接口实现、抽象实现、访问器、重写。继承四类验证中间文件磁盘关系变化拒绝、原方法文件的磁盘／未保存签名变化拒绝、恢复后应用、预览取消、一次 Undo/Redo 和旧建议拒绝；所有消费者磁盘原文保持不变。构建、根 typecheck、修改文件 ESLint、diff 检查通过。不是用户已安装 WSL Profile 验收。

串行 progressive 的同一五类生成也退出 0（`/tmp/sophp-generation-hierarchy-host-progressive.log`），覆盖相同桥接关系、签名、预览和 Undo/Redo；测试日志的系统 SSL／DBus 消息没有影响宿主断言。新增语义用例文件属于本次正式回归材料，继续保留在同一分支，待 C3 源码里程碑统一整理提交；未打包、更新 Profile 或发布。

## PHP 版本变化的预览与查询保护

受控 onDemand 编辑器复现：取得构造函数 Code Action 后，在预览应用前将临时项目 PHP 设置从 8.5 切到 8.4，旧建议仍被应用（`/tmp/sophp-generation-version-red.log`）。消费者文本、声明来源文件都没有变化，因此源码快照无法捕获版本失效。

服务器将该次查询使用的 PHP 版本放入标准 LSP CodeAction.data；查询返回前再次核对版本，期间发生版本变化则撤回结果。客户端现有预览命令携带该协议版本、有效版本与显式版本设置，预览开始和应用前检查；异步磁盘检查结束后再核对，避免检测版本尚未刷新时放过显式设置变化。未绑定必须新增的用户设置，旧手工请求不携带版本字段时保持原契约。工作区外文件沿语言服务器已有的首根／全局 fallback 规则检查，不直接把缺少 FolderState 当作永久不可用。

拒绝提示新增中英文 PHP 版本／版本设置已变化的信息，不再把版本变化解释成源码修改。该增量不证明同版本下所有扩展可用性、runtime 事实或 Composer 映射变化均已保护。

协议 7 项通过（`/tmp/sophp-generation-version-protocol.log`），包含三种索引模式的暂停生成→通知 PHP 8.4→撤回旧结果→新结果携带 8.4，及预算限制下本地构造函数携带 8.5。onDemand／progressive 串行隔离宿主均通过五类生成（`/tmp/sophp-generation-version-host-onDemand.log`、`/tmp/sophp-generation-version-host-progressive.log`）：版本变化拒绝、恢复版本后正常应用、继承／签名变化拒绝、预览取消和一次 Undo/Redo。只修改各宿主自己的临时项目设置，并在 finally 恢复；没有修改用户 Profile 或业务项目设置。

Language Server／扩展构建、宿主编译、根 typecheck、修改文件 ESLint、diff 检查通过。仍是源码与隔离 Linux 宿主证据，不是用户真实 WSL 验收。

公共预览 guard 的 onDemand 局部提取回归另行通过 7 个既有场景（`/tmp/sophp-generation-version-local-extraction.log`）：分支多输出、标量链及结尾 return；每项检查预览取消／应用和一次 Undo/Redo，没有把版本保护变成正常提取的常规阻断。后续仍按 C3 源码里程碑统一整理提交；本次未更新 Profile、打包、推送或发布，goal 继续 active。


## C3 源码阶段检查点

本节记录本地提交前的核对；提交号以 Git 历史为准。收口范围是本报告的默认模式生成／预览保护，以及 Import 的受检源码、后台覆盖保护、内容哈希和 Worker 复用。新增语义用例和本报告是正式回归材料，纳入版本控制；没有删除规划所需文件。

- 完整语义：78 文件、1,352 项通过，零跳过，67.08 秒；日志 `/tmp/sophp-c3-checkpoint-full-semantic.log`。
- 完整 Language Server：56 文件、810 项通过、2 项失败、1 项跳过，1,405.25 秒，退出 1；日志 `/tmp/sophp-c3-checkpoint-full-lsp.log`。唯一跳过项是未指定 `PHP_COMPANION_TEST_REFERENCE_BUNDLE` 的跨进程引用 bundle 场景。没有放宽预算或跳过失败项。
- 两项失败均为既有魔术方法 1,500 注释文档的热 P95：PHP 7.2 为 185.57 ms，8.5 为 209.14 ms，超过 150 ms。候选、static edit 和插入文本断言通过。单独运行同一文件的两项通过（`/tmp/sophp-c3-checkpoint-magic-diagnostic.log`），但不能据此把整套回归改记为通过；组合负载下的性能门槛继续开放。
- 本批最近 Language Server／扩展构建、根 typecheck、宿主编译和修改源文件 ESLint 均通过，分别见 `sophp-generation-version-*` 与 `sophp-worker-reuse-*` 日志；源代码核对与 `git diff --check` 通过。双默认模式五类生成及局部提取七条隔离宿主证据沿用上节，不重复打包或运行无关宿主。

这是有明确剩余性能门槛的源码检查点，不是完整 C3 或真实 WSL 验收。1,003／2,503 文件的上一批有效性能数据仍以 Import 报告为准；下一批扫描窗口实验在临时副本中进行，不纳入本检查点，也不把与全量回归并行的测量作为独立性能验收。实验副本已经清理，日志保留。未更新 Profile、打包、推送或发布；goal 继续 active，按原路线图推进。


## 公共预览的 PHP 运行程序设置保护

与已有新建类型流程核对后发现：公共成员生成预览只绑定 PHP 版本，没有绑定 `phpExecutablePath`。隔离 onDemand 先复现：目标设置仍是 PHP 8.5，在执行旧建议前更换运行程序设置并完成检测，旧构造函数编辑仍被应用；日志 `/tmp/sophp-generation-executable-host-red.log`，断言 true 与期望 false 不符。不是借版本变化复现同一已有保护。

现有 Code Action middleware 在请求前同时记录资源作用域的版本与运行程序设置，作为内部公共预览参数传递；`null` 明确表示当时未配置运行程序，与不携带字段的旧手工请求区分。预览开始和确认应用前的现有检查均比较该设置，异步磁盘核验后再比较；拒绝提示说明 PHP 版本或运行程序设置变化。没有新增用户设置、LSP 协议字段或必须配置的值。历史不携带字段的手工请求保持原契约。本增量针对设置变化，不宣称同一路径的运行程序内容、扩展事实及所有 runtime 输入都已绑定。

onDemand／progressive 串行隔离宿主各通过原有五类生成：纯当前文件构造、接口方法、抽象方法、访问器、覆盖方法。新构造场景固定版本设置 8.5，分别在预览之前及应用之前更换运行程序设置，旧编辑均被拒绝；恢复后同一建议正常应用、一次 Undo/Redo 和旧文档版本拒绝继续通过。每次只改宿主自己的临时工作区设置，并在 finally 恢复；日志 `/tmp/sophp-generation-executable-host-{onDemand,progressive}.log` 均退出 0。七条既有局部提取流程的预览／取消／应用和一次 Undo/Redo 也通过（`/tmp/sophp-generation-executable-local-extraction.log`）。

根 TypeScript、扩展构建、宿主编译、修改的扩展／宿主源文件 ESLint 与 diff 检查通过。初次 lint 的测试回调缺少返回类型已补注解，最终日志 `/tmp/sophp-generation-executable-lint-final.log` 无错误；宿主重新编译后 JS SHA-256 与完成上述验证时逐字一致（`/tmp/sophp-generation-executable-host-emitted-before.sha256`）。本批保留同一分支未提交，没有打包、更新用户 Profile、推送或发布，不是用户真人 WSL 验收。

## 接口提取前的当前类型冲突

在 `a4f300a` 及未提交的路径查找增量之后，复现 onDemand／progressive 均在同名 `BuilderInterface` 被写入另一个文件、未收到 watcher 时仍提供提取建议。目标文件 `BuilderInterface.php` 不存在，因此仅检查目标文件不能发现这种冲突。两个定向测试均失败，保留 `/tmp/sophp-extract-conflict-red.log`。

接口提取入口按当前文件中被选中的 class 请求项目准备，再复用受检磁盘扫描，检查 class 与拟生成接口名称。只在当前声明核对后的同步回调重新计算接口计划；即使旧缓存已有冲突也重新检查，删除冲突文件后可以恢复。扫描取消、不完整或超预算均不提供接口提取建议。其它局部变量／方法提取继续走原路径；公共预览源文档、运行程序、PHP 版本及新建文件保护保持既有机制。

最终协议 7 项通过、480 未运行：两模式 × 正常／单文件预算四例，核对初始建议、无 watcher 的异文件冲突拒绝、删除后的恢复、不写盘；其余三例沿用 PHP 7.2／8.0／8.5 的 late-static 及未保存签名更新。日志 `/tmp/sophp-extract-conflict-protocol-final.log`，初版五例通过日志另保留 `/tmp/sophp-extract-conflict-protocol.log`。原始支持域与完整套件边界不变。

测试 runner 增加 `PHP_COMPANION_TEST_EXTRACT_INTERFACE_ONLY=1`，仅选择已有独立接口提取宿主模块。模块补充异文件冲突拒绝、删除恢复及预览取消，继续验证 static 返回类型、实际应用、单次 Undo 恢复源码并删除接口、Redo 恢复两份文本和目标 EOL。两个默认模式串行通过，日志 `/tmp/sophp-extract-conflict-host-{onDemand,progressive}.log`，均退出 0：

```sh
pnpm --filter @php-companion/language-server build
node esbuild.mjs --production
pnpm exec tsc -p test/extension/tsconfig.json
PHP_COMPANION_TEST_CORE_ONLY=1 PHP_COMPANION_TEST_C3_ONLY=1 PHP_COMPANION_TEST_EXTRACT_INTERFACE_ONLY=1 PHP_COMPANION_TEST_C3_INDEXING_MODE=onDemand node scripts/run-extension-test.mjs ./dist-test/runTest.js
# 然后串行执行 progressive。
```

构建、根 TypeScript、宿主编译、修改文件 ESLint 和 diff 检查通过。这是建议生成前的当前声明核对；预览打开期间才新增的异文件同名声明仍需单独验证，不能由上述新建目标文件保护推出它已完成。大规模等待、Remote／Windows、真实 WSL 及完整 C3 继续开放。本增量与前批路径查找保留同一分支未提交，不打包、更新 Profile、推送或发布；goal 继续执行。

## 接口提取预览的重新核验与源码检查点

后续隔离 onDemand 宿主已复现预览阶段的独立缺口：取得原建议并打开预览后，在异文件创建同名接口，确认应用仍返回 true。失败 `/tmp/sophp-extract-preview-red.log` 保留，不能用建议生成前的检查代替它。

接口建议现在通过标准 CodeAction.data 携带选择位置与计划 SHA-256，覆盖类型全名、插入位置／文本、接口源码及目标 URI。Core 中间件将它送入已有公共预览流程，打开预览前及确认后的应用检查调用 `phpCompanion/validateInterfaceExtraction`。语言服务重新核对当前项目／依赖、活动缓冲区、class 的 PSR-4 来源与唯一目标，然后重新生成并比较原计划。文档版本、PHP 版本、根、映射或计划不匹配，以及预算不足／服务不可用／请求失败，均拒绝应用。原设置、源码哈希、新文件存在性、预览完整性及 Undo/Redo 机制继续有效；语言服务检查之后还核对当前活动源码的版本／文本。没有新增产品设置。

最终 **24 项组合协议通过、463 未运行**，67.57 秒：`/tmp/sophp-extract-preview-combined-final.log`。七项接口测试扩充校验 true、错误哈希／旧版本 false、无 watcher 的磁盘冲突与删除恢复、仅未保存的新声明及关闭恢复、正常／单文件预算，以及 Composer PSR-4 映射改变后原计划拒绝。组合还复用远程 URI、Import 内容变化、旧后台快照、首次准备交错、Import 超预算、PSR-4 Rename 与不完整依赖。初版 24 项日志 `/tmp/sophp-extract-preview-combined-protocol.log` 另保留，最终目标 URI 哈希增量以 final 为准。

最终 bundle 的 onDemand／progressive 串行独立宿主均通过：预览期间创建同名磁盘接口拒绝、`testBeforeApply` 时在另一个活动文件中仅作未保存同名声明拒绝、保留两份源码／没有孤立目标文件、撤销测试冲突后原建议正常应用、原取消／static 返回类型／单次 Undo/Redo 与目标 EOL 仍通过。磁盘冲突文件与未保存编辑互不混用，后者核对磁盘原文未变。日志 `/tmp/sophp-extract-preview-target-host-{onDemand,progressive}.log` 均退出 0；早期未绑定目标 URI的两模式通过日志仍保留 `...-host-{onDemand,progressive}-final.log`。

公共流程最终构建的 onDemand 七条局部提取回归也通过预览、取消／应用及一次 Undo/Redo：`/tmp/sophp-extract-preview-local-host.log`。语言服务／扩展构建、根 TypeScript、宿主编译、六个修改源码／宿主文件 ESLint、diff 检查通过。没有重跑完整语义／LSP，原全量两项魔术方法性能失败、条件跳过及大规模／跨平台／真实 WSL 边界保持开放。

扫描路径查找、提取前冲突检查及本次预览重新核验整理为一个必要本地源码里程碑，提交标题 `fix(refactor): revalidate extracted interface previews`。本节更新前节未提交状态和预览缺口；不将该局部证明扩展为完整 C3，不打包、更新 Profile、推送或发布。goal 保持 active，继续原路线图。
