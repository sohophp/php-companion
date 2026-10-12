# parser/index 可复用范围审计

核对当前9个源码文件、12个测试文件，形成14项复用决定；parser 8文件/164项全过；index 4文件/68项全过。保留原包级配置及全部测试，逐项绑定源码位置、哈希和实际通过案例。复用现有解析、可传输事实、项目遍历、缓存适配、候选索引及依赖图；本次没有改动产品源码或资产。

| 范围 | 复用决定与边界 | 来源 |
| --- | --- | --- |
| parser-tree | 复用parseTree、parse和createIncrementalEdit；调用者拥有返回的树。语法恢复后的名称读取原始源码，范围保持。 | [index.ts](../../../packages/parser/src/index.ts) |
| parser-cache | 复用按源码及文档身份匹配的单文档缓存和事实克隆；该缓存不定义全项目或符号身份。 | [index.ts](../../../packages/parser/src/index.ts) |
| parser-prepared | 复用无树的完整/声明worker负载；接收方负责来源新鲜度和语义水合。 | [index.ts](../../../packages/parser/src/index.ts) |
| parser-declarations | 复用声明提取，包括实现体内的嵌套声明；声明结果不包含完整实现事实。 | [index.ts](../../../packages/parser/src/index.ts) |
| parser-ranges | 复用namespace及UTF-16范围，保留注释和分隔符；语法恢复仍按具体已支持规则限定。 | [index.ts](../../../packages/parser/src/index.ts) |
| parser-scopes | 复用词法作用域事实作为语义输入；不能据此证明完整控制流或跨文件类型推断。 | [index.ts](../../../packages/parser/src/index.ts) |
| index-source | 复用独立于语义消费者的来源回调，保留适配器指定的Remote URI。 | [index.ts](../../../packages/index/src/index.ts) |
| index-completeness | 区分projectComplete与complete；依赖省略、超大项目源跳过和取消分别处理。 | [index.ts](../../../packages/index/src/index.ts) |
| index-preparation | 复用有界预取和按序语义回调及取消检查；并发参数保持1至128。 | [index.ts](../../../packages/index/src/index.ts) |
| index-cache | 复用按root/key/version隔离的缓存适配及不可变代际；语义有效性仍由恢复适配器校验。 | [index.ts](../../../packages/index/src/index.ts) |
| index-postings | 复用精确的调用方候选键和原子替换；posting本身不证明SymbolId或声明唯一性。 | [inverted.ts](../../../packages/index/src/inverted.ts) |
| index-dependencies | 复用按文档贡献的反向依赖图；相同逻辑节点的多个声明保持独立贡献。 | [dependency.ts](../../../packages/index/src/dependency.ts) |
| index-prefilter | 复用保守词法预筛及rebuild/source回退；命名参数完整性独立，摘要不证明精确符号身份。 | [source-candidates.ts](../../../packages/index/src/source-candidates.ts) |
| index-events | 复用drain期间事件合并和失败事件重试；不覆盖更新的事件。 | [pending.ts](../../../packages/index/src/pending.ts) |

以下六项是明确保留的合同限制，不据此宣称已实现统一SymbolId或完整AnalysisResult，也不把未读到真实项目的零文件结果称为成功扫描：

- **no-unified-symbol-id**：公开解析声明使用name、fqcn和scope身份；posting及依赖键为调用方字符串。尚未建立统一且包含项目边界的SymbolId合同。
- **no-global-query-completeness**：ProjectIndexResult记录项目与依赖遍历结果，不覆盖逐查询的新鲜度、歧义和类型预算完整性，不能代替所有查询的AnalysisResult。
- **unreadable-composer-policy**：读不到Composer项目时，当前返回零文件、complete/projectComplete为true并附警告；不能据此证明真实项目已扫描。错误政策与消费者行为仍须独立核对。
- **discovery-io-policy**：目录readdir失败返回true，autoload路径stat失败被跳过；本次未证明不可访问路径会体现在最终完整性中。
- **hash-verification-policy**：元数据相同的缓存仅在verifyCachedSourceHash或已提供预取源码要求时核对内容；消费者须明确新鲜度要求，元数据命中不证明字节一致。
- **prepared-freshness-owner**：Prepared负载包含无树事实及可选namespace范围；来源身份、哈希、版本和generation校验由接收方承担，类型本身不证明这些守卫。

该审计推进P0现有parser/index复用审查；完整运行行为、数据合同、迁移、编号fixtures、平台和全部原目标继续。原正常构建资格仍按引擎与资产身份绑定。本批未提交、推送、打包或更新日用Profile。逐项证据见[机器记录](parser-index-reuse-audit-2026-10-09.json)。
