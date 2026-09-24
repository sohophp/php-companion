# C1 10,130 文件 Composer 项目的 VS Code 宿主验证

日期：2026-09-24。基于锁定 30 个包、含 1,029 个 PHP 文件的[独立 Composer fixture](c1-real-composer-vendor-2026-09-24.md)，测试运行器只在临时副本的 `src/Noise/` 生成 9,100 个无关 PHP 文件。写入 Consumer 后总计 10,130 个 PHP 文件；随后可见建议用例还在该临时项目中逐个写入六个 PHP 文件。业务项目与原始 fixture 均未修改。

复现入口：`PHP_COMPANION_TEST_C1_UI=1 PHP_COMPANION_TEST_C1_REAL_VENDOR=1 PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE=9100 pnpm test:extension:c1`。该命令构建源码并启动隔离 VS Code 1.139.0 Core 宿主，不打包 VSIX。首次运行复用了本轮已编译产物，通过相同环境变量直接调用 `node scripts/run-extension-test.mjs ./dist-test/runTest.js`；第二次使用上述完整入口。

| 宿主运行 | 首次 Implementation 命令 | 未保存切回后的 Implementation 命令 | 六个真实 vendor 建议可见时间，毫秒 | 中位数 | 最大值 |
| --- | ---: | ---: | --- | ---: | ---: |
| 已编译产物 | 2,485 ms | 800 ms | 210、212、216、222、219、223 | 218 ms | 223 ms |
| 完整构建入口 | 2,496 ms | 800 ms | 210、208、207、218、247、229 | 214 ms | 247 ms |

两轮均通过 Completion、Hover、Signature Help、Definition、Implementation、References 编辑链，以及未保存地切换到 Monolog Logger 再恢复的检查。首次 Implementation 找到 vendor Guzzle Response；12 次热态 Implementation 的中位数均为 4 ms，两轮最大值分别为 8、10 ms。每轮六种真实 vendor 类型的首个可见列表均包含目标方法、不含指定的无关方法，缓冲区保持未保存；宿主退出码均为 0，VS Code 内建 PHP 基础建议为关闭状态。

首次 Implementation 是从编辑器命令提交到测试取得正确结果的单次等待，包含宿主调度与可能的重试；可见建议时间来自 Workbench DOM 观察器。两轮各六个顺序样本不能估计长期 P95，也不证明物理键盘到屏幕像素、数小时会话、WSL Remote、Windows/macOS 或完整 Open Source Pack 组合。冷 Implementation 约 2.5 秒仍是后续体验优化对象。

## 后续：去掉已打开文件事件引起的重复扫描

测试模式分段计时确认，约 2.5 秒的首次 Implementation 是一次编辑器命令和一次 LSP 请求；服务器内部先扫描约 1.3–1.4 秒，随后因项目版本变化重扫约 0.8–1.0 秒。变化来自 VS Code 在 Consumer 已打开后补发该文件的监视事件。该事件原先使候选扫描失效；增量处理本身已有逻辑优先使用打开的缓冲区内容。

现在监视事件对已打开的 PHP 文件继续执行增量处理，但不再使整个候选扫描失效。独立的真实 stdio 用例验证磁盘内容变动后打开缓冲区仍为准确信息，且不发生这次多余失效；关闭文件、其它 PHP 文件和 Composer 元数据的处理继续按原规则。另将候选扫描的进度提示创建改为异步：客户端故意延迟确认进度时，定向 stdio 用例验证 Implementation 先返回准确结果，确认后仍发送进度开始及结束消息。这项进度调整消除了潜在的客户端确认等待；本机 10k 宿主的主要收益来自去掉重复扫描。

| 隔离宿主 | 首次 Implementation 命令 | 候选扫描次数 | 六个真实 vendor 建议 |
| --- | ---: | ---: | --- |
| 修复前两轮 | 2,485、2,496 ms | 后续诊断确认同类请求扫描两次 | 6/6 正确 |
| 修复后两轮 | 1,357、1,398 ms | 每轮一次 | 6/6 正确 |

修复后两轮都通过完整编辑链、未保存类型往返和快速输入的 10 轮可见建议检查；宿主退出码均为 0。语言服务器全套回归通过 18 个测试文件、316 项通过、1 项原有跳过。一次中间诊断构建的快速输入用例曾未在 10 秒内显示最终建议，后续两轮完整检查通过；这仍需更长会话继续观察。以上时间均为本机小样本，不是冷查询 P95，也不关闭 C1 跨平台与真实使用门槛。

清理临时细分计时后的最终源码另以同一 10k 项目运行不含 Workbench 建议观察的隔离宿主：首次 Implementation 命令 1,500 ms，服务器处理 1,490 ms，候选扫描 1,488 ms，项目版本重扫次数 0，六项编辑查询和未保存类型往返通过，退出码 0。

## 后续：100 轮未保存类型切换与可见候选

隔离宿主测试现在接受 `PHP_COMPANION_TEST_C1_RAPID_ROUNDS`（默认 10，范围 1–1,000），并将任何一轮可见的旧接收者方法列为失败。在上述 10,130 文件项目中设置为 100，连续两次完成 `RapidChoiceA` / `RapidChoiceB` 的未保存类型切换及逐字输入；每轮要求可见列表包含当前方法、排除前一类型方法，且编辑器缓冲区保持未保存。两次均通过完整 C1 宿主查询链及六种真实 Composer vendor 的可见候选检查，退出码均为 0。

| 100 轮宿主运行 | 正确候选 | 曾见旧方法的轮数 | 列表可见等待中位数 | P95 | 最大值 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 第一次通过 | 100/100 | 0 | 201 ms | 215 ms | 222 ms |
| 第二次通过 | 100/100 | 0 | 203 ms | 219 ms | 235 ms |

复现时在上述入口另加 `PHP_COMPANION_TEST_C1_RAPID_ROUNDS=100`。一次更早的完整入口运行在快速输入前的嵌套 Composer 项目 Definition 检查上超时；当时测试未保存最后一次导航结果，无法确定是否返回了父项目落点。随后两次完整宿主运行都通过该检查。测试的等待失败信息现会显示最后一次结果或异常，以便下次复现定位。以上两轮小样本不代表数小时使用，也不关闭偶发的嵌套项目超时风险。

后续将 F04-NAV-15 真实 stdio 回归扩到父子项目同名类的精确 Definition：在嵌套 `composer.json` 的监视事件后，连续 12 次查询必须都落到子项目声明。`experimental` 和 `onDemand` 各通过 12/12 次，未复现宿主超时。该回归覆盖项目归属和事件后的导航结果；它没有模拟 10k 文件宿主的全部调度与负载。

## 后续：Composer 变更只刷新相关工作区根

进一步检查发现，原实现收到任一 `composer.json` 或 `composer.lock` 监视事件后，会重新索引多根工作区的所有 Composer 项目。F04-NAV-15b 在两个独立工作区根的真实 stdio 会话中证明了问题：只修改第一个根的 manifest，第二个根也出现完整 PHP 文件索引日志。宿主首次嵌套 Definition 超时的具体原因仍未证实，但这种无关扫描会占用同一语言服务器的编辑响应时间。

现在仍重新发现工作区中的 Composer 根，但源码索引只覆盖发生变化的工作区文件夹；新增或移除嵌套项目时，同文件夹内的父子根都参与刷新。若其它文件夹中已加载的项目通过路径仓库或符号链接依赖变化的文件夹，则保持全量刷新，避免留下旧依赖事实。重新分配项目根时，已打开的 PHP 缓冲区也会写入新的所属语义工作区。工作区外的 Composer 监视事件不再引起工作区扫描。

验证：修复前 F04-NAV-15b 的无关根扫描断言失败；修复后独立双根与跨文件夹路径依赖两个分支均通过，前者不扫描第二个根，后者仍扫描第二个根且其 Definition 正确。F04-NAV-15 的父子同名类导航两个模式共 24 次通过；F04-NAV-15c 另确认在缓冲区未保存、文件未落盘时新建嵌套 Composer 项目，导航随项目归属迁移到子项目声明。语言服务器完整 stdio 测试在补充最后两个定向分支前为 137 项通过、1 项跳过；新增分支随后定向通过。相关 TypeScript 构建、ESLint 和差异检查通过。源码构建后的 10,130 文件隔离 VS Code 宿主退出码为 0，六项查询、六种真实 vendor 建议及 10 轮未保存快速切换通过，旧方法出现 0 次；首次真实 vendor Implementation 命令 1,521 ms，候选扫描一次。宿主没有直接测量此前偶发超时的长期发生率，此项仍需持续观察。

## 后续：1000 轮可见建议持续编辑

在同一 10,130 文件隔离宿主中，以已构建源码和 `PHP_COMPANION_TEST_C1_RAPID_ROUNDS=1000` 执行完整 C1 宿主测试；未生成 VSIX。未保存缓冲区中的接收者类型在 `RapidChoiceA` 与 `RapidChoiceB` 间逐轮切换，每轮逐字输入 `ren`，通过 Workbench DOM 等待当前方法可见并排除前一类型方法。1000/1000 轮正确，旧方法可见轮数为 0，宿主退出码为 0；其余六项查询、真实 vendor 建议及未保存往返也通过。首次真实 vendor Implementation 命令 1,462 ms，候选扫描一次。

| 可见建议等待 | 中位数 | P95 | P99 | 最大值 |
| --- | ---: | ---: | ---: | ---: |
| 全部 1000 轮 | 199 ms | 215 ms | 223 ms | 252 ms |
| 前 100 轮 | 204 ms | 221 ms | — | 232 ms |
| 后 100 轮 | 198 ms | 208 ms | — | 218 ms |

外部按进程每约 5 秒读取语言服务器 RSS，共 44 个样本，覆盖进程启动后第 36–252 秒：首样本 290 MiB，范围 219–293 MiB，末样本 224 MiB。样本显示本次会话没有持续增长趋势；它们不是堆内存分析，也不证明数小时、Remote 或其它操作组合的长期稳定性。原始本地运行日志位于 `/tmp/sophp-c1-rapid-1000.log` 与 `/tmp/sophp-c1-rapid-1000-rss.log`，可用本节命令与环境变量重新生成；临时日志不提交仓库。

## 后续：真实 vendor 的六项查询持续链

隔离宿主新增可选的 `PHP_COMPANION_TEST_C1_CHAIN_ROUNDS`（0–100，默认 0），每轮在同一个未保存 PHP 缓冲区中切换 `Psr\Http\Message\ResponseInterface` 与 `RequestInterface`，分别核对当前方法的 Completion、Hover、Signature Help、Definition、Implementation、References。目标声明和实现来自已安装的 PSR、Guzzle 源码；Completion 排除前一类型方法，Definition/Implementation 断言精确 URI，References 必须包含当前未保存调用位置且不能带入同文件旧调用。这个检查调用真实 VS Code 编辑命令和语言客户端，不直接调用 semantic 内部函数。

小型真实 vendor 项目先以两轮试跑通过。随后以 `PHP_COMPANION_TEST_C1_REAL_VENDOR=1 PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE=9100 PHP_COMPANION_TEST_C1_CHAIN_ROUNDS=50` 运行隔离 Core 宿主，在 10,130 文件规模完成 50 轮、共 300 次编辑器查询，全部结果正确，退出码 0；首次真实 vendor Implementation 为 1,410 ms、扫描一次。以下时间从 VS Code 命令发起至取得符合断言的结果，包含可能的重试，单位为毫秒：

| 每轮操作 | 次数 | 中位数 | P95 | 最大值 |
| --- | ---: | ---: | ---: | ---: |
| Completion | 50 | 17 | 31 | 86 |
| Hover | 50 | 4 | 14 | 16 |
| Signature Help | 50 | 4 | 8 | 12 |
| Definition | 50 | 4 | 10 | 13 |
| Implementation | 50 | 689 | 829 | 968 |
| References | 50 | 589 | 743 | 891 |

修复前类型每轮改变使项目候选版本失效，Implementation 与 References 因此重复扫描；结果正确但等待仍明显。此项测试没有观察 Workbench 建议列表，列表可见性另见上文 1000 轮数据；本机单次 50 轮分布不能代表跨平台 P95。

## 后续：复用已完成的 Implementation 候选覆盖

对于 onDemand 模式，已完成的 Implementation 候选扫描覆盖未变化的项目和依赖文件。打开的 PHP 缓冲区修改后，服务器先使旧版本失效，待该版本的完整缓冲区内容写入原语义工作区且确认文件身份、版本、项目根和索引状态一致，才把先前完整的 Implementation 候选覆盖移到新版本。新方法仍首次扫描；References 的接收者闭包与持久证据独立，继续按原规则失效；关闭文件、磁盘监视事件、Composer 变化、重建索引及项目根变化不走此复用途径。

F04-NAV-18b 的真实 stdio 正反例使用两个同名 `renderAction()` 接口方法，长度足以进入候选路径预筛：切换打开缓冲区的接收者后，Implementation 指向正确的不同实现，候选扫描次数仍为一次；另一打开缓冲区新增/移除实现会立即改变结果且不重扫；磁盘中新建未打开的实现文件触发第二次扫描并找到新类。这个用例防止以旧类型结果换取速度。

同样的 10,130 文件宿主与 50 轮六项查询复测全部通过。首次遇到新方法仍有一次扫描；之后已见方法的 Implementation 等待中位数由 689 降至 5 ms、P95 由 829 降至 7 ms，最大 888 ms。单次未保存 Response → Logger → Response 往返后的 Implementation 从修复前 955 ms 降至本轮 10 ms；这是不同宿主运行的本机样本。References 中位数仍为 651 ms、P95 805 ms，是下一项候选扫描优化缺口，不能直接复用 Implementation 的覆盖，因为其接收者闭包和持久证明不同。

最后加入同版本关闭再打开的文档身份保护，并把 F04-NAV-18b 方法名改为可触发候选路径预筛的 `renderAction()` 后，语言服务器完整 stdio 套件 140 项通过、1 项跳过。最终源码重新构建并在同一 10k 隔离宿主重复 50 轮六项链：全部正确、退出码 0；Implementation 中位数 4 ms、P95 7 ms、最大 862 ms，References 中位数 645 ms、P95 762 ms。首次真实 vendor Implementation 为 1,495 ms，未保存往返恢复为 14 ms。冷查询仍需扫描，References 的重复扫描继续开放。

## 后续：复用 References 候选覆盖并刷新接收者证据

已完成的 References 候选扫描现在按文件记录接收者方法。打开的 PHP 缓冲区每次修改后，服务器先更新原语义工作区，再用该文件的新接收者方法替换旧记录；只有项目根、文档身份、源码和候选版本均匹配时，才复用旧扫描对其它文件的完整覆盖。引用结果的持久化输入证明仍按原版本失效，不将旧结果当作新编辑的结果。未打开文件新增或修改、Composer 变化和重建索引仍要求重新扫描。

F04-NAV-18c 的真实 stdio 正反例使用两个类上的同名 `renderAction()`：未保存地切换接收者时，旧类引用消失、新类引用出现；另一打开文件新增、移除调用立即反映在结果中，候选扫描仍只有一次；磁盘新建未打开调用文件后发生第二次扫描并找到新引用。完整 stdio 回归 141 项通过、1 项原有跳过；TypeScript 检查与 ESLint 通过。

相同 10,130 文件项目的隔离 VS Code Core 宿主再次完成 50 轮未保存 Response/Request 切换、共 300 次六项查询，全部结果正确且退出码 0。References 等待中位数为 89 ms、P95 132 ms、最大 630 ms；上一轮为 645/762/828 ms。Implementation 中位数 4 ms、P95 10 ms、最大 816 ms；首次真实 vendor Implementation 为 1,548 ms。此为本机单次顺序样本，未覆盖数小时会话、WSL Remote、其它系统或完整 Open Source Pack 组合；首次冷查询和 References 每次接收者闭包处理仍有等待。
