# 候选扫描中的命名空间范围传递

日期：2026-10-01。承接首次引用查询剩余 6–7 秒候选扫描，不更改符号候选筛选或引用覆盖。

## 两种有区别的路径

1. 复用后台已加载的完全相同源码：当前首次扫描只减少约一个 worker 解析，等待 9,097 → 8,647 ms，不能证明稳定收益。相关服务器改动已撤回。
2. 工作线程返回命名空间范围：修改前新的主线程 CPU profile 中，importScopes 包含 1,329／9,818 个样本，链路为 updatePrepared → replaceTypeDependencies → typeDependencyNodes → resolveSourceType → classImportAt → importScope；主线程为了取范围再次 parseTree。解析器现在从已有树生成纯数据 namespaceScopes，随 PreparedPhpDocument 传递，SemanticWorkspace 在登记依赖前填充范围缓存。普通 update 也使用已有树填充。没有附带 SyntaxNode／Tree；旧 PreparedPhpDocument 缺少这一可选字段时保留原解析路径。

范围提取使用同一个 helper，保持 braced／unbraced、重复命名空间和错误恢复边界。持久化缓存 schema 和声明内容保持原样；没有把工作线程状态当作项目事实版本。

## 对比限制

在同一 2,514 文件项目、空缓存、渐进索引模式分别执行基线先跑与候选先跑。四次结果均 1,071 个位置，完整位置哈希相同：`535ed7e2efd140d82677784ee0938574efd71524b373fd3cbd0187dd046db6d6`。

| 顺序 | 修改前首次查询 ms | 修改后首次查询 ms |
| --- | ---: | ---: |
| 基线先跑 | 9,957 | 8,591 |
| 候选先跑 | 7,077 | 8,260 |

两组总等待趋势不一致，因此只确认消除了主线程命名空间重复解析，不声称端到端再次提速。首次候选扫描仍未达标。本轮结束定向排查，后续先推进其它独立项，不反复调整相同方案。

## 验证

- 解析器全量 89/89 通过，包含完整与声明事实携带相同范围。
- 最终语义全量 536/536 通过，47.49 秒。重复 namespace 的 200 次类型查询无额外范围解析；编辑、移除／重开、JSON 可传递事实保持正确归属。缺少 namespaceScopes 的旧事实回退只解析一次。
- 定向真实 stdio 两项通过：重复 namespace 的 Definition 与五次缓存重启中的 References／Completion；其余 343 项未运行。
- C1_SCOPE_ONLY 隔离源码宿主通过。
- Parser、Semantic、Language Server 类型检查和相关 ESLint、git diff --check 通过。

[机器证据](c1-namespace-range-transport-2026-10-01.json)。本机数据不代表真实 WSL 弹窗或所有平台；未打包、提交、推送或更新 Profile。
