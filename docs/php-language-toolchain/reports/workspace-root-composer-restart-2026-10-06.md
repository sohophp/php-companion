# D139 Workspace 根 Composer 生命周期与重启

## 范围与当前状态

基于 `2cc00e14`，处理目录根 Composer 的删除、无 Composer 冷启动后创建、恢复，以及目录移除／重新加入。源码已接入；正式根扩展 21 文件／113 项通过，其中版本管理 17 项与重启队列 3 项。类型检查、相关 ESLint 与生产构建退出 0。Linux 自动模式完整 C1 最终宿主退出 0，根 Composer 四阶段的诊断、状态栏和原文档版本一致性通过。没有更新 Profile、打包或推送；原 C1–C4／R4 和真人验收保持开放。

语言服务器源码没有改变，生产 bundle 保持 `2a3ff3766f3ae9d0ca998b7ec27f5ed5cec0770215001393cc401b74e5158a84`／v71。D138 的 1153 项完整 LSP 结果只绑定其冻结提交及输入；本批扩展变化由独立根单测与宿主验证，不转移 D138 的整个输入清单。

## 修复与边界

- 有 Composer 与无 Composer 状态都使用所属目录的项目代次，避免旧根身份和迟到探测覆盖新状态。
- 删除根 Composer 会立即清除该根的版本缓存；独立嵌套项目仍按自己的代次管理。
- 无 Composer 冷启动也注册根目录 `{composer.json,composer.lock}` 监听，新建文件后可以自动解析。没有新增全目录监听或扫描。
- 目录变化引发的语言客户端重启通过 `WorkspaceRestartQueue` 串行执行；停止期间的多次变更合并到下一次启动，启动期间的新变更最多排一个后续重启。释放后不重新启动，停止失败记录一次且不自动循环重试。
- 日志证实原客户端默认 2 秒停止期限不足：11:19:11 报停止超时，直到 11:19:25 才完成缓存写入并退出。重启流程现在允许最多 30 秒停止，保留正常缓存退出处理。最终宿主确认客户端恢复并重放原文档；没有宣称退出速度改善。长退出等待仍需另批处理。

## 测试与原始证据

正式根单测先为 20 文件／110 项通过，加入串行重启后为 21 文件／113 项全部通过。新增队列检查覆盖停止中多次变化、启动中的后续变化、释放中止、停止失败后下一次用户变化可以继续。

真实 stdio 补充用例有 `onDemand`／`progressive` 两项：一个无 Composer 根为 PHP 7.2，独立 Composer 根为 PHP 8.5；验证 `enum` 版本诊断和 `str_contains` 可见性。随后无 Composer 根在 8.5／7.2 间切换，文档保持 version 1、不新增编辑；使用宿主同样的版本化诊断协议，验证更新结果和另一目录的补全隔离。两项全部通过，测试未改语言服务器版本算法。

保留测试与宿主失败历史：

1. 最初宿主新增断言要求无 Composer 根也有 PSR-4 文件名诊断，这不符合语义契约；原结果仅有 PHP CLI 语法诊断。改为只在 Composer 根要求文件名诊断，保留版本诊断数量检查。
2. 即时观察请求遇到正常重启的停止窗口而提前退出；改为在原 30 秒期限内等待服务器收到同一原文档。
3. 修正等待后仍连续 30 秒 `Client is not running`，不是文档版本或 PHP 算法错误。保留一次相同输入的完整失败日志，确认两条重启失败警告、2 秒停止超时及迟到缓存退出。
4. 新 stdio 测试第一次从错误目录运行，采集为 0；第二次未兼容标准 CompletionItem[] 返回形态而发生 TypeError。修正测试后两项通过。
5. 加入未修改文档的版本切换时，progressive 的第一条消息仍属于尚未结束的旧索引任务；初次 1／2。等待本次变化之后匹配新版本的诊断后 2／2，不把旧版本消息误当本次处理结果。

原始日志与结果：

- 根单测：`/tmp/sophp-d139-root-unit.json`、`/tmp/sophp-d139-root-unit-restart.json`。
- 原 stdio 采集／返回形态：`/tmp/sophp-d139-projectless-before.json`、`/tmp/sophp-d139-projectless-lsp-before.json`、`/tmp/sophp-d139-projectless-lsp-normalized-before.json`。
- 版本化切换：`/tmp/sophp-d139-projectless-versioned-transitions.json`、`/tmp/sophp-d139-projectless-versioned-settled.json`。
- 宿主：`/tmp/sophp-d139-c1-auto-host.log`、`/tmp/sophp-d139-c1-auto-observation.log`、`/tmp/sophp-d139-c1-auto-ready.log`、`/tmp/sophp-d139-c1-auto-preserved.log`。
- 完整失败环境：`.vscode-test/d139-host-failures/extension-failure-fqKfC7/fixture/profile-user-data/logs/20261006T111808/`。
- 串行重启候选输入：`.vscode-test/d139-serial-input.json`；当前运行日志 `/tmp/sophp-d139-c1-auto-serial.log`。

受控原型的 14／16、16／16、创建场景 16／17、17／17 原记录见 D138 报告与 `.vscode-test/d139-parent-composer/`。它们不充当正式宿主或真实 WSL 证据。

## 最终宿主

串行重启后的同一完整 C1 在 2026-10-06T03:23:47 UTC 终态退出 0。既有六入口编辑／未保存切换、Composer vendor、多根引用和嵌套 Composer 的 8.1 → 8.5 → 8.1 → 8.5 链保持。新增目录根链为 CLI 7.2 → 新建 Composer 8.1 → 删除后 CLI 7.2 → 恢复 Composer 8.1；分别检查当前文档和服务器均为 version 1、SoPHP 版本诊断数量、Composer 根的 PSR-4 文件名诊断、状态栏，以及第一目录的版本仍为 8.5。

日志中的 `root version observation` 在等待最终诊断之前输出，可能仍含前一版本的消息；随后的断言必须等新版本的准确诊断数量才继续，四次全部通过。PHP 内建校验器使用实际 CLI 7.2 的语法诊断另行保留，不误称 SoPHP 错误。此运行是 Linux 隔离宿主命令／Problems 证据，没有开启可见建议列表测量，也不是用户真实 WSL 窗口验收。

输入指纹、原型和各轮失败、最终结果及完整失败日志按 SHA256 归档 `.vscode-test/d139-evidence/`，结构化索引见同名 JSON。源码／bundle／运行器与启动指纹逐项核对，不将失败历史覆盖成绿色。

## 待关闭

真实 WSL 多目录与长会话；停止等待性能；其它 PHP 版本和平台、普通编辑 150 ms 预算、缓存规模／内存和原重构边界。没有因为本批单测或定向协议通过缩小原路线图。
