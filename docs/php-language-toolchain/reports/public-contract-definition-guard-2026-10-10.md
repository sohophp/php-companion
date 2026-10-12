# 公开数据契约定义门禁

`pnpm typecheck`现在在组件依赖检查后执行公开契约检查，依据已审查的43项模型验证12个直接来源文件。字段、可选性、字面量、别名、导出状态和四个持久化schema发生变化时拒绝通过，要求同步审查契约快照。

检查使用TypeScript AST定位唯一直接声明，以保留字面量的token序列比较定义，允许空白、注释及无关实现函数调整。快照缺失、损坏、定义摘要不符、数量减少、重复身份、源文件缺失或语法错误也会拒绝。它检查已登记公共定义，不推断所有运行时行为或未登记类型。

| 验证 | 结果 |
| --- | --- |
| 实际公开契约 | 43项、12来源，0违规；包含原35项以及六个PHPDoc、两个项目缓存模型 |
| 门禁正反例 | 25项通过，包括实际CLI成功/失败退出码 |
| 集成类型检查 | `pnpm typecheck`全流程通过：原组件门禁、新契约门禁、完整包编译、根及Symfony检查 |
| 原组件检查 | 24组件、200源码、511导入，0违规 |
| 相关Lint/diff | 通过 |
| 运行资产 | 八个正常Core资产与411份已编译产品依赖摘要保持；manifest精确逆变换证明仅增加两个命令及typecheck调用 |

25项测试覆盖合法定义及仅格式/注释/实现修改，删除/合并声明、移除export、interface与alias种类替换、字段类型/删除/新增/可选性、alias与字符串字面量、schema、坏TypeScript、坏快照摘要/数量/身份/条目/JSON、路径与源文件缺失，以及两项实际CLI退出码。专属临时fixture由测试按所属目录清理。

11份文件独立归档核验，见[同名JSON](public-contract-definition-guard-2026-10-10.json)、[归档清单](../../../.vscode-test/d1657-public-contract-gate-evidence/manifest.json)和[脚本](../../../scripts/check-public-contracts.mjs)。正常引擎仍为`1e43306f108b60e2b86a1691fe20bbd4a7923c3a92448b8e7db1e3ecf57edf6d`，未因构建检查改变生产bundle。

本次完成公共定义门禁及现有检查链集成，不证明全部数据合同、统一SymbolId/AnalysisResult、运行时迁移或P0整体完成。原C1–C4/P0–P9及26个未完成大项保持；日常Profile未更新，未提交、推送、打包或发布。
