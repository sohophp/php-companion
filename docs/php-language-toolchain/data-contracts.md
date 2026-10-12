# 当前公开数据合同基线

本页固定当前实现的跨包类型和格式来源，供后续修改审查。它不通过新增同名类型掩盖已有模型差异；[机器基线](reports/public-contract-baseline-mixed-html-2026-10-10.json)保存43个公开类型的完整定义、字段、源码行与哈希，并绑定19个来源文件。完整数据合同与迁移验收仍开放。

| 架构概念 | 当前实际模型 | 边界 |
| --- | --- | --- |
| DocumentSnapshot | refactor.DocumentSnapshot；parser.ParsedPhpDocument、SourceRange | 编辑计划记录uri/version/length与可选textHash；解析器另管文本、tree和范围。内存tree不等于磁盘格式。 |
| SymbolId | 声明名称、scope身份和各领域索引key | 本基线尚未证明统一的公开SymbolId合同；不同符号类别的大小写和项目隔离需要继续核对。 |
| Declaration | ParsedDeclaration、ParsedCallableDeclaration、SemanticDeclarationSnapshot | 解析签名与语义声明快照分别拥有自己的字段，不能从一个模型推导全部语言特性。 |
| PHPDoc | PhpDocType、PhpDocTag、PhpDocCallableParameter、PhpDocShapeField、PhpDocMethodTemplate、ParsedPhpDoc | 类型、变量、说明及UTF-16范围分开；invalid标签和真实方法默认值显式保存，超限类型不发布部分事实。 |
| 持久事实 | SemanticSnapshot、SemanticSourceDeclarationSnapshot、ProjectPhpFileFacts、CachedProjectPhpFile | 版本分别为93、10、7、13；恢复边界按各自schema与来源校验。 |
| Type | type-system.PhpType | 保存当前类型代数定义；mixed、unknown和错误恢复的完整跨查询一致性仍按行为测试核对。 |
| AnalysisResult | ProjectIndexResult、SemanticUpdateResult | 项目完整性与局部更新类型分开；尚未证明统一覆盖全部查询的完整性/预算公共合同。 |
| PhpRuntime | runtime-probe.PhpRuntime | command/path、版本/目标次版本、SAPI、扩展及可选运行时事实；失败结果不构造可用事实。 |
| 外部语义事实 | SemanticFactsContribution、SemanticProviderRequest/Response | schema/协议、身份、generation、完整性、来源位置及预算按独立边界校验。 |
| 路由与插件/interop | RouteFactsContribution、RouteProviderRequest/Response、PhpCompanionPluginApi、InteropHello、SerializedPhpType | 当前协议/事实版本为1；由各自校验器和消费者承担验收，类型定义本身不是运行证明。 |
| EditPlan | EditPlan、PlannedTextEdit、PlannedFileOperation、EditPlanIssue | schema1，编辑与文件操作分开；版本/长度/哈希及冲突通过规划/应用链核对。并非所有重构都已由此证明。 |

现有决定见[组件边界](adr/0001-component-boundaries.md)、[持久化与版本](adr/0002-persisted-facts-and-versions.md)、[设置和语言服务迁移](adr/0003-explicit-settings-and-language-owner.md)。本页记录当前实现和未证明部分。混合PHP/HTML引用事实变更只升级实现缓存schema至93；声明快照10与项目封装7/13保持，用户Profile未更新。

[parser/index复用审计](reports/parser-index-reuse-audit-2026-10-09.md)分别核对树/事实所有权、URI、项目与依赖完整性、缓存适配及候选键；统一符号身份、全查询完整性与IO失败政策仍独立开放。

公开定义门禁已接入`pnpm typecheck`；`pnpm check:public-contracts`核对43项定义的12个直接来源，`pnpm test:public-contracts`执行25项正反例及CLI退出码。检查字段、可选性、别名、导出和持久schema，允许注释/空白和无关实现变更；实际类型API变更须同步审查[当前快照](reports/public-contract-baseline-mixed-html-2026-10-10.json)。见[门禁验收](reports/public-contract-definition-guard-2026-10-10.md)，它不关闭统一身份、全部运行行为及迁移资格。
