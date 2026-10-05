# D124 函数返回对象的首次 Hover、跳转与参数提示

日期：2026-10-06；源码起点 `3dd112ae`，根 bundle SHA-256 为 `5e7b0dc53f7ed11ab64434f504faaa9cdb70c8c704a069a82992ed66da04b30e`。[结构化证据](cold-function-query-sources-2026-10-06.json)保留初始失败、中间失败、最终验证、宿主输入摘要及四组热查询数据。

## 实际缺口与修复

独立 Composer 项目通过显式 `autoload.files` 声明 `rows()`，返回 PSR-4 类 `Row`。打开调用文件后，D121 的首次成员补全可以加载函数来源，但先直接 Hover 变量或跳转其成员，仍得不到结果。原产品在 PHP 7.2／8.5、onDemand／progressive 的八个首次请求场景全部失败，没有诊断／index-ready 等待或补全预热。

本次将已有函数来源加载提取为共享方法，供 Completion、Hover、Definition、Signature Help 使用。语义层沿现有有界表达式来源取得变量或成员接收者的具名函数依赖；在函数声明已知时，取得声明的返回类作为源码依赖。函数别名、namespace、变量别名及合法闭包捕获复用已有作用域判断；动态调用、跨作用域、引用捕获、注释与 HTML 不提供猜测依赖。

只复用 Composer 显式自动加载文件及既有 PSR-4 类型读取，不新增整项目扫描、PHP 执行或设置。函数依赖不是值证明，最终 Hover／签名／成员／跳转仍由原语义查询判定。既有 128 节点／16 层来源限制、自动加载文件的读取限制和 Worker 预筛选保持；异步步骤继续核对取消与请求文档身份／版本。没有增加长期驻留候选缓存。

初步接入后，成员 Hover、跳转和签名通过，四个变量 Hover 仍失败：函数声明加载后，返回类尚未加载。补上声明的返回类依赖后，原断言通过，没有用补全或诊断等待预热。两次失败记录分别保留。持久化事实格式没有变化，语义／源码声明／wrapper／engine 仍为 88／6／12／v67。

## 源码与协议验收

- 完整语义 **128 文件／3161 项通过**，零失败、待执行；新增 28 项覆盖具名依赖、别名、捕获、作用域／动态反例、无返回类时不证明变量值，以及成员查询和参数括号位置。
- 定向协议 **24 项通过**：新增 16 项将变量 Hover、成员 Hover、Definition 或 Signature Help 各自作为第一个语义请求；PHP 7.2／8.5 × 两模式，每项还覆盖缓存重启、未保存 `Row→Other→Row` 和磁盘不变。原 PHPDoc 四项与原变量 Hover 四项继续通过，后者包含已有取消／文档变更保护。
- 缓存与原热门槛 **11 项通过**，包含项目事实、数组接收者来源、Trait 的五次重启／旧版本回退／磁盘变更，以及魔术方法与未完成赋值位置。
- 当前产品的四组固定热 P95：魔术声明 PHP 7.2／8.5 为 **9.30／8.47 ms**，注释赋值场景为 **44.48／73.25 ms**，均在原 150 ms 内。这些固定文档数据不代表普通连续编辑的既有 155.06 ms 已关闭。
- Semantic／Language Server 构建、根 bundle 构建、根与扩展测试 TypeScript、所改文件 ESLint、工具 Node 语法和 diff 检查通过。

**本批没有重跑整个 LSP 组合。**D122 的完整 981 项通过仍只绑定旧 bundle `64793c…`；本批 35 项不能替代当前全套 LSP 资格。早先的 59 项定向语义检查对应尚未补齐返回类的中间源码，不冒充最终全量证明。

## 隔离 VS Code 宿主

新增可复用工具 `scripts/check-cold-function-query-acceptance.mjs` 和对应套件，使用现有 Core-only 隔离宿主，启动前创建独立 Composer 函数文件与返回类，未更新用户 Profile。

PHP 7.2／8.5 × onDemand／progressive 共四组通过，每组：

1. 第一项显式语义 Provider 请求为变量 Hover，严格一次取得 `App\ColdQuery\Row`，不重试空结果、不先请求补全。
2. 核对实际 Definition Provider 的返回类文件路径、Signature Help 的 `name(): string`。
3. 普通逐键输入 `na`，可见列表仅一个 `name`；分别按 Enter／Tab 接受，核对完整文本、光标与 Undo／Redo。
4. 磁盘内容不变；指定 `getItemsByProvider` renderer 异常为零。

共八次自然可见列表及八次精确接受，宿主十个输入摘要在四组过程中保持。可见等待在最后输入后观察，包含已有可见列表状态；不是首次激活等待或后台热查询 P95。键入前已经请求 Hover／Definition／Signature，因此不将本组描述为完全无其它 Provider 预热的补全冷启动。协议的四类首次查询各自来自独立新进程，与宿主的首次 Hover 工作流分开报告。

复现示例：

```bash
SOPHP_AUTOMATIC_COMPLETION=1 SOPHP_AUTOMATIC_INDEXING_MODE=onDemand SOPHP_VISIBLE_PHP_VERSION=7.2 \
  node scripts/check-cold-function-query-acceptance.mjs /tmp/cold-function-host.json
```

将版本换为 `8.5`、模式换为 `progressive` 可复现其它三组。自动化不代表真实 WSL 使用验收，也不关闭其他查询入口／来源形式的完整性、长期会话、缓存规模内存或普通编辑预算。

本批与 D123 缓存失败证据一起整理为必要本地源码里程碑；继续原 C1–C4，goal active。
