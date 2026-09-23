# F09 Doctrine Entity 未完成输入

日期：2026-09-23。编号夹具 F09-DOC-01/02/03 分别覆盖 Doctrine Entity、Nullable ManyToOne 和 Repository 返回类型，合法但非 Doctrine 的同名 Attribute，以及同文件中一个完整 Entity 与一个未闭合 Entity。`framework-doctrine` 原先可能把未闭合类发布为 Entity 事实；现在依据解析树中该类节点的语法错误抑制其 Entity、Repository 和 QueryBuilder 工厂事实，同文件的完整类继续保留。

验证：Doctrine 包 9 项测试、类型检查和相关 ESLint 通过。重建 Doctrine 包后，Language Server 既有真实 stdio Doctrine 集成用例通过，覆盖 Repository、查询结果和成员补全；该用例不是新夹具的完整编辑器验收。本轮未生成 VSIX。

F09 仍需更多 Doctrine 映射与查询形态、框架版本、真实项目动态边界和扩展宿主矩阵。
