# C1 查询版本快照与旧结果回写

日期：2026-09-24。F04-NAV-12 使用真实 stdio LSP，在独立 Composer 项目中以测试模式暂停 Completion、Hover、Signature Help 和 Definition。每次请求已经捕获打开的文档后，客户端将接收者从 `Contract` 未保存地改成 `Other`，等待新版本诊断，然后释放旧请求并对新版本重查。测试模式只提供暂停/释放点，不代替实际 Language Server 处理、文档同步、诊断或查询逻辑。

首轮测试发现旧 Completion 返回 702 个新文档上的通用函数候选，而预期为旧请求空结果。`TextDocuments` 保留可变的 `TextDocument` 对象；原先 `currentQueryDocument()` 读取对象当前 `version` 与管理器当前 `version` 比较，两边会随编辑一起变成新版本，因此错误通过。修复后，五类主要查询在入口捕获数字版本，并在异步边界与管理器的当前版本及文档身份比较；Completion 也在等待语义 Provider 协调之前捕获文档。Signature Help 原有最终检查改用入口版本。诊断发布同样在开始计算时捕获版本，异步准备后及发布前复核，避免旧计算冒用新版本。F04-NAV-13 进一步验证关闭并以相同版本号重新打开文件的情况。

修复后 F04-NAV-10/11/12 与快速诊断/编辑器能力定向真实 stdio 测试 4/4 通过。修复核心查询后的完整 Language Server 套件 17 个文件、303 项通过、1 项跳过；随后补充的诊断发布检查、Completion 入口顺序和同版本重新打开防护，由重新构建后的 F04-NAV-12/13 与诊断用例 3/3 验证。最终源码重新生成 Core bundle，在隔离 VS Code 1.139.0 Linux x64 宿主完成六类正常查询及未保存 Definition，退出码 0；本次首次补全 160 ms。没有打包 VSIX。完整组合、WSL Remote 与持续人工输入仍按 C4/R4 门槛验收。

为定位隔离宿主中 Completion/Hover 偶发等待，本轮另运行 `node scripts/benchmark-editing.mjs 100 10`。Linux x64 直接 LSP 在 100 次未保存类型切换中的热态 P95：Completion 1.01 ms、Hover 1.00 ms、Definition 1.72 ms，诊断更新时间 2.65 ms；无旧结果，缓存损坏恢复检查通过。该夹具与 VS Code 宿主输入不同，只说明直接 LSP 在此夹具中没有复现百毫秒级等待，尚不能判定宿主延迟来源。
