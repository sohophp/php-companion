# C3 Add Parameter：外部磁盘修改与编辑器重载

2026-10-03。恢复后的完整 C3 原会话 86784 退出 1；定位到测试夹具假设，未发现需要修改产品的证据。原断言、失败日志和退出码保留，整轮 C3 仍记未通过。

原测试在干净文档上注入外部磁盘修改，之后要求编辑器保持旧原文。当前 VS Code 1.140.0 会自动重载该干净文档：失败 diff 仅为注入的外部注释，没有新参数。命令返回 false、预览未打开、磁盘保留外部文本三个先行断言已通过。

独立当前 Core 源码宿主把干净／真正未保存两种情况分开核对。原会话 22798 退出 0，并提供结构化证明：干净文档自动重载，旧命令拒绝；未保存文档严格保留局部内容，旧命令拒绝，外部磁盘不被覆盖。恢复测试文件后，正常新增参数的签名和两种调用准确，真实一次 Undo/Redo 文本往返通过。原始日志 /tmp/sophp-add-parameter-reload-proof-revert.log。

首个独立探针 57712 在这两种保护断言通过后，清理测试文件时 save 返回 false（File Modified Since），符合 VS Code 外部修改保护。改为通过 Revert 明确读取最新磁盘快照，再修改／保存自己的临时文件后通过；没有通过绕过磁盘保护来让测试通过。

已准备正式夹具补丁 /tmp/sophp-c3-dirty-buffer-fixture.patch：外部修改前先制造明确的未保存局部注释，严格断言未保存缓冲区不变；清理时明确重载最新磁盘状态再恢复原始文件。没有把内容断言简单放宽为任意文本或删除原有拒绝／磁盘／Undo 门槛。

当前完整 stdio 原会话 56745 仍使用 2962 项冻结输入，复核变化为零，因此补丁尚未写入正式 C3 源码或编译产物。集中回归终态后应用补丁、编译并复验完整 C3；独立探针不替代该整轮结果，不增加 stdio 通过数。未打包、提交、推送或更新 Profile。

## 正式夹具修正与完整复验

依赖检查表明完整 stdio 仅导入五个共享补全 fixture，不读取 c3.ts；这些 fixture 未改。因此不再让无关冻结阻止正式测试修正：补丁已写入 c3.ts，同一分支保留其余未提交改动，未修改产品或已有 dist-test 构建。原 2962 项清单明确记录唯一已知变化 test/extension/suite/c3.ts；协议相关 2961 项冻结清单另存 /tmp/sophp-modifier-protocol-inputs.json，并不把旧清单冒称零变化。

C3 单独 esbuild 编译到 .vscode-test/c3-dirty-buffer-verification，复用原 runner 的标准 Core／Symfony 源码入口；完整宿主原会话 54741 正在运行，独立 .pid／.exit 记录。C3 源码、该 suite 与 runner 的三个哈希另行冻结，整轮仍需终态。正式 TypeScript --noEmit 与 ESLint 同步检查，结果按原会话记录。

首次正式夹具复验 54741 退出 1：取消 Add Parameter 预览后保存的旧 TextEditor 实例已关闭，向该实例 edit 被 VS Code 拒绝。明确在制造未保存内容和清理前分别重新 showTextDocument 取得当前实例，未更改产品命令。TypeScript --noEmit 原会话 20830 和 ESLint 1986 退出 0；当前完整标准宿主 58493 已启动，日志 /tmp/sophp-c3-dirty-buffer-current.log，三项 C3 输入另存 current-inputs 清单，旧失败日志保留。整轮通过仍待终态。

当前正式完整 C3 原会话 **58493** 已退出 0，独立 .exit 也是 0，68 条 C3 证明；C3 源码、临时编译 suite／runner 三项哈希终态一致，协议相关 2961 项输入仍无变化。既有 Import、Rename、Move、提取、参数家族修改、类型生成、预览／取消／应用及一次 Undo/Redo 路径通过。该完整结果关闭本次测试夹具失败；初始失败和中间关闭句柄失败均保留。范围为标准 Core／独立 Symfony 源码宿主，日志中的 Pack 字样是历史文案，不能据此声称十扩展安装 Profile 或真人 WSL 通过。
