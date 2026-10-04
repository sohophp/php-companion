# Safe Move 当前源码覆盖：2026-10-04

## 发现与修复

原实现仅在 `projectCompleteRoots` 尚未完成时扫描项目内名称候选，且不包含 Composer 依赖；项目完成后只处理已收到的 watcher 更新。定向回归在未修改实现时确认：onDemand／progressive 的规划漏掉 vendor 调用者，experimental 的第二次规划漏掉未发送 watcher 事件的新项目调用者。

Safe Move 现在每次请求复用 `refreshRefactorDiskSources`，扫描完整当前 PHP 项目与依赖源码，发现新文件、刷新变化内容并移除已消失的关闭文档。它不把源码覆盖证明写成全局索引或框架 Provider 完成状态。

保留捕获源快照的先后顺序、Explorer 已经移动源文件后的快照入口、未保存内容、PSR-4 路径和 namespace 校验、相关文件快照，以及 `overwrite: false`。扫描预算不足、取消或项目 epoch 改变时不生成编辑。

既有“依赖索引不完整”用例曾允许 Safe Move：未读依赖可能含有待改引用，现改为拒绝 Move；其普通 Import 查询不重复启动完整项目索引的断言仍保留。

## 验证

- **10 项定向协议测试通过**，其余 452 项未运行。包括 onDemand／progressive／experimental 六项成功与预算不足矩阵，以及既有全局／具名 namespace、导入 reconciliation、部分依赖和 PSR-4 重命名／移动竞态用例。
- 成功矩阵精确核对源文件操作、项目与 vendor 调用者的编辑和 sources。第二次请求前新增未打开调用者，不发送 watcher 事件，要求规划独立发现它。
- 预算矩阵项目两份源码在 maxFiles=2 内，加入依赖后超出预算。每次请求要求有 `safeMoveDiskRefresh` 计时，确认完整扫描实际执行并拒绝，而非其它前置条件提前返回。
- 规划请求不写磁盘。
- 隔离 Linux VS Code 串行运行 onDemand 和 progressive：源与调用者预览、取消不修改、应用时移动文件并改 namespace／引用、单次 Undo/Redo 恢复均验证。此处没有 vendor 宿主用例，vendor 覆盖证据来自协议矩阵。
- 语言服务器构建、根 TypeScript noEmit、隔离宿主编译、三份修改源码 ESLint 和 diff 空白检查通过。

复用命令：

```sh
pnpm --filter @php-companion/language-server build
pnpm --filter @php-companion/language-server exec vitest run test/stdio.test.ts -t 'Safe Move with current project and dependency|plans Safe Move between global|reconciles Safe Move imports|only the dependency index is partial|renames a unique type and its matching'
node esbuild.mjs --production
pnpm exec tsc -p test/extension/tsconfig.json
PHP_COMPANION_TEST_C3_ONLY=1 PHP_COMPANION_TEST_C3_MOVE_ONLY=1 PHP_COMPANION_TEST_C3_INDEXING_MODE=onDemand node scripts/run-extension-test.mjs ./dist-test/runTest.js
# 第二次串行运行将 mode 改为 progressive。
```

宿主日志：`/tmp/sophp-default-move-onDemand-20261004.log`、`/tmp/sophp-default-move-progressive-20261004.log`。

## 剩余范围

这是 Safe Move 源码覆盖证明，不是 C3 整体完成或真实 WSL 验收。每次扫描会增加大型项目操作等待，仍需实际规模测量。类型复制／粘贴导入等入口仍存在全局索引前置条件，后续核对；Move 目标文件状态已进一步复用 Rename 的严格检查，见[目标预检后续记录](rename-destination-preflight-2026-10-04.md)。没有打包、更新用户 Profile、推送或发布。

## Safe Move 预览期间的新声明和调用者

Core 源码里程碑 `fc87ff6` 后的独立增量，继续同一分支，未提交、未更新 Profile。本节不改变上述历史证据。

实际 onDemand 隔离编辑器复现：旧计划仅检查已参与文件的文档／磁盘内容；预览期间新增调用者后，源文件和原调用者保持不变，命令仍应用旧计划，新增引用漏改。`/tmp/sophp-move-revalidate-red.log` 中断言实际 true、期望 false，保留原始失败。

Core Safe Move 命令现在在打开预览前、用户确认后且应用前，重新请求既有受检规划。核对排序后的来源文本、编辑范围／内容及移动身份的 SHA-256 指纹；参与集合或变更内容不同即拒绝原预览，已有冲突、预算不足和扫描失败也继续拒绝。重新规划的编辑不会悄悄替换用户看过的预览，用户需重新发起操作；源文档和参与文件的原守卫仍保留。实际磁盘字节核验、索引预算和取消条件不省略。仅 Test 模式输出拒绝原因供宿主取证。

隔离宿主回归覆盖：预览时新增调用者、预览时新增目标同名类型、确认后应用前新增调用者，均拒绝且原文件和新文件未改。保留两个新增调用者后再次发起操作，新预览标签须包含它们，应用后的命名空间和四个文件中的引用正确；一次 Undo／Redo 同时恢复并重新应用源文件移动及三个调用者修改。

中间宿主失败记录为 `/tmp/sophp-move-revalidate-host-onDemand.log`、`/tmp/sophp-move-revalidate-host-onDemand-final.log`、`/tmp/sophp-move-revalidate-host-probe.log`、`/tmp/sophp-move-revalidate-host-onDemand-cleanup.log`。这些暴露测试删除磁盘文件却保留打开文档，以及错误假定关闭标签会立即释放模型的清理问题。最终采用保留新增调用者并重新预览的恢复流程，由既有 runner 结束时移除整个独立临时项目；不忽略断言或降低原计划拒绝要求。

已完成证据：

- `/tmp/sophp-move-revalidate-protocol.log`：原受检源码／依赖调用者三模式成功与预算拒绝矩阵，加严格目标和全局命名空间场景，共 8 项通过、486 未运行。这是原规划端点回归，新预览守卫由下述宿主证明。
- `/tmp/sophp-move-revalidate-host-progressive-visible.log`：Linux VS Code 1.140.0 Core 隔离宿主退出 0，三种过期拒绝、新预览包含新增调用者、应用与单次 Undo／Redo 通过；循环和悬空目标仍拒绝。
- `/tmp/sophp-move-revalidate-host-onDemand-recovery.log`：onDemand 相同拒绝／恢复／UndoRedo 流程退出 0；`/tmp/sophp-move-revalidate-host-onDemand-visible.log` 最终增强后的可见预览标签核对及同一流程也退出 0。
- 根 TypeScript、扩展 bundle、宿主编译与定向 ESLint 通过。

一轮中间日志出现针对人为循环目标的后台 codeAction ELOOP 请求错误，最终 progressive 和 onDemand recovery 日志未出现；本节没有定位或修复该独立后台错误，需另行核对。默认模式之外的旧索引提供者、Explorer 文件操作、批量移动、平台矩阵、运行程序设置变化、大项目重复扫描成本和真实 WSL 验收不由此证明。没有新性能测量，不把多次核验的成本写成预算通过。

## 不可读文件通知不再反复阻断 Code Action

后续定位上述 ELOOP：applyPendingFiles 只允许 ENOENT 作为不可用源码，其它 readFile 失败向外抛出；PendingChanges 为防丢任务将失败项重新放回队列。后续 Code Action／重构读取同一队列，再次处理循环链接并失败。本修复不改变 PendingChanges 对普通消费者异常的重试契约，而在磁盘读取边界记录非 ENOENT 失败，撤回不可用文件的旧事实并继续队列；当前打开文档仍优先于磁盘。恢复为正常文件并收到通知后重新加载，不保留旧成员或未保存缓冲区的过期结果。

原始 `/tmp/sophp-unreadable-watch-red.log`：onDemand、progressive、experimental 三项均复现 textDocument/codeAction 的 ELOOP 响应错误。`/tmp/sophp-unreadable-watch-fixed.log` 为修复后测试错误地只接受 CompletionList，遇到合法空数组后的三项失败；最终明确接受标准 CompletionItem[]／CompletionList／null，同时保留响应无错误及精确成员断言。

证据：

- `/tmp/sophp-unreadable-watch-fixed-final.log`：三模式定向协议通过，连续两次 Code Action 有本地构造函数建议，循环文件的旧成员撤回，打开的未保存类型仍可补全，关闭并修复磁盘后新成员恢复、旧成员与未保存成员均不出现。
- `/tmp/sophp-unreadable-watch-regression.log`：上述三项加原有打开缓冲区通知／磁盘更新／progressive 引用移动回归，共 6 项通过、491 未运行。
- `/tmp/sophp-unreadable-watch-focused-onDemand.log`、`/tmp/sophp-unreadable-watch-focused-progressive.log`：Linux VS Code 1.140.0 Core 隔离宿主均退出 0。循环／悬空 Move 目标拒绝且未进预览，四次实际 Code Action Provider 查询返回未禁用、包含构造函数生成文本的预览命令。没有把 Provider 结果称为用户真实 WSL 菜单验收。
- `/tmp/sophp-unreadable-watch-standard-move-onDemand.log`、`/tmp/sophp-unreadable-watch-standard-move-progressive.log`：最新 bundle 两默认模式原 Move 场景均退出 0，目标链接拒绝、三种过期预览拒绝、重新预览包含两个新调用者，以及四文件应用和单次 Undo／Redo 回归通过；没有 Request failed、指定 getItemsByProvider 或断言异常。该证明不覆盖下面保留的带构造生成组合扫描失败。
- `/tmp/sophp-unreadable-watch-host-onDemand.log` 初次宿主失败，是断言直接读取 action.edit，未按现有 middleware 的预览命令读取编辑内容。修正该测试契约，未改产品来通过断言。
- `/tmp/sophp-unreadable-watch-host-onDemand-final.log` 中，循环／悬空目标和构造函数建议已通过，后续带构造生成的组合 Move 在进入测试回调前因扫描失效被拒绝，测试读取尚未创建的调用者失败。原始证据保留，不能把该组合记为通过。默认 Move 用例保留原无属性类型；构造函数场景通过专门 Test 环境变量 PHP_COMPANION_TEST_C3_UNREADABLE_WATCH_ONLY 选择，独立验证不可读 watcher；该变量不是产品配置。组合扫描交错仍待核对。
- 语言服务器构建、扩展 bundle、根 TypeScript、宿主编译、定向 ESLint 与 diff 检查通过。未运行全量协议、跨平台或性能矩阵，不更新 Profile、打包、提交、推送或发布。

## 生成与 Move 交错后的扫描重验

继续核对上一节保留的组合失败。受控协议先暂停 Safe Move 的磁盘扫描，再修改闭合调用者并发送 watcher：两个默认模式均拒绝，错误为 `Safe Move source scan was incomplete or changed; retry the move.`，见 `/tmp/sophp-move-superseded-red-final.log`。此前 `/tmp/sophp-move-superseded-red.log` 是测试状态未暴露 epoch 而导致的观察超时，不能算产品失败证据。

已有 checked Import／生成扫描会在 epoch 或来源失效时重新扫描一次；普通 Rename／Safe Move 因未复用校验缓存而被排除。本次将同一有限重验用于所有受检重构扫描，仍读取当前源码、执行预算和取消检查。第二次失效直接拒绝，不无限重试，也不使用第一次的过期事实。Test-only 暂停／epoch 观察增加 Safe Move，未新增产品设置。

证据：

- `/tmp/sophp-move-superseded-fixed-targeted.log`：两个默认模式通过。单次 watcher 后规划 sources 精确匹配最新调用者；两次变更拒绝且重验计数只有一次；取消不增加重验、不返回 edit；源磁盘与目标保持未改。
- `/tmp/sophp-move-superseded-regression.log`：12 项通过、487 未运行，包含三模式 Move 当前源码／依赖调用者成功和预算拒绝、严格循环／悬空目标、三模式不可读 watcher，以及首次 Import 被 watcher 取代后的恢复。
- `/tmp/sophp-move-superseded-rename.log`：一项普通 PSR-4 类型及文件 Rename 协议回归通过。
- `/tmp/sophp-move-superseded-combined-onDemand.log`、`/tmp/sophp-move-superseded-combined-progressive.log`：Linux VS Code 隔离宿主均退出 0。通过 Test-only `PHP_COMPANION_TEST_C3_MOVE_WITH_GENERATION=1` 恢复带私有属性、四次构造生成 Code Action 查询及完整 Move 的同一组合；随后取消、三种过期预览拒绝、重新预览包含新增调用者、四文件应用和一次 Undo／Redo 均通过。没有将单独空类型 Move 或提前返回的 watcher 用例替代组合证明。
- 语言服务器构建、扩展 bundle、宿主编译、根 TypeScript 和定向 ESLint 通过。一次命令多传了 `--`，误启动较宽测试后立即终止，保留 `/tmp/sophp-move-superseded-fixed.log`，不计入通过证明；之后使用显式 `exec vitest` 定向运行。

上一节组合失效缺口在上述限定场景已有回归证明，历史失败日志保留。大规模重验的等待、完整 LSP／性能门槛、其它平台和真实 WSL 仍开放。没有打包、更新 Profile、提交或推送。

## Safe Move 运行环境变化保护

继续审计应用前条件：重新规划的文本和参与源码即使相同，也不能证明 PHP 目标／运行程序仍是用户开始规划时的环境。`/tmp/sophp-move-runtime-red.log` 在隔离 onDemand 编辑器中真实复现：规划后将 PHP 8.5 改为 8.4，命令仍返回 true 并应用，断言失败；原始日志保留。

Core Safe Move 现在在初始版本解析后，捕获源和目标 URI 的资源配置、有效 PHP 版本、项目根以及已探测运行程序路径／版本。规划后、预览前和最终应用前核对该环境；当前配置直接读取，不依赖异步 VersionManager 刷新已经完成。配置项涵盖 phpVersion、phpExecutablePath、indexing.mode 和 composer.includeDevAutoload。源码、磁盘、目标冲突和计划指纹保护继续保留。此处未增加配置，不额外重新执行运行程序探测。

当前证据：

- `/tmp/sophp-move-runtime-fixed-onDemand.log`：隔离宿主退出 0。PHP 目标与运行程序路径各在规划后、应用前变化，四项均拒绝；确认测试确实到达设置变更回调，原文档、原磁盘和不存在的目标均保持不变。每项恢复原配置并重新检测版本。
- `/tmp/sophp-move-runtime-recovery-progressive.log`：隔离宿主退出 0。四项环境变更拒绝后，继续同一带私有属性／构造生成建议的完整 Move 夹具；正常预览取消、三种过期预览拒绝、恢复后的四文件应用与单次 Undo／Redo 通过。
- `/tmp/sophp-move-runtime-recovery-onDemand.log`：同一增强夹具在 onDemand 退出 0，四项环境变更拒绝及恢复后完整 Move／UndoRedo 均通过。
- 扩展 bundle、根 TypeScript、宿主编译和定向 ESLint 通过。

证明限于上述实际设置变更和当前默认模式。外部替换同一路径的 PHP 二进制且没有重新探测、Explorer／批量路径、Rename 的运行环境保护、其它平台及真实 WSL 待核对；没有把本次 Safe Move 保护写为这些入口完成。增量未提交、不更新 Profile、不打包或推送。
