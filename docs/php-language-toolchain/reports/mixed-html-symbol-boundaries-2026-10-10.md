# 混合 PHP/HTML 的符号与编辑边界

2026-10-10。正常源码与构建修复已通过包级和相关生产协议验证；新构建的完整 LSP 已通过；完整 P2 条目、编辑器、性能、平台和真人验收继续开放。

HTML 中的 `Real`、`FLAG`、`new Missing` 原先被原文本扫描纳入 PHP 引用、Rename 或未解析类型事实；导航回退还会把 HTML 名称解析为 PHP 类型、常量和函数。现在按 Tree-sitter 的 text/php_tag/php_end_tag 排除非 PHP 区域，并复用已有非 PHP 范围缓存守卫导航、类型/常量/函数选择与签名查询。PHP 字符串、注释及 nowdoc 内的标签文字仍由真实语法树区分，短 echo 和未完成 PHP 表达式保留。

实现事实缓存 SemanticSnapshot 升至93，旧92实现记录拒绝；SourceDeclaration 不包含 rawNames，保持10，项目封装7/13保持。公开定义的新43项基线只改变 SemanticSnapshot 的版本定义，原92/10基线逐字保留，定义门禁和CLI测试同步引用当前快照。

验证：

- 完整 parser：197项通过，新11项覆盖LF/CRLF、UTF-16 emoji、file/Remote URI、增量与冷解析全部事实等价、声明/tree-only API、旧语法恢复、HTML纯文本及字符串/nowdoc标签。
- 完整 semantic：177文件/23,738项通过，原23,730项身份与次数保持。新8项覆盖保留/不保留树、增量编辑/恢复、类型与常量引用和Rename的精确位置、HTML导航拒绝及实现快照恢复。
- 生产LSP：原构建八组引用反例失败，新构建八组通过；PHP7.2/8.5 × onDemand/progressive × LF/CRLF，检查精确引用/定义、HTML Hover/签名拒绝、未完成成员补全、实际Rename编辑后的缓冲区查询和恢复，磁盘保持不变。另40项相关协议/缓存通过，共48项资格证据。
- 集成typecheck、正常生产打包构建、变更范围Lint与25项公开合同门禁测试通过。冻结1,451源码/编译输入核对，实际服务器和本批夹具结束，原失败记录保留。

第一次新构建相关LSP整轮为36通过/8失败：新测试错误要求Rename编辑按升序返回，实际记录是同一组三个精确范围的降序。只修正顺序前提，并增加实际应用与恢复；该失败整轮未改写。首次命令误选不存在的magic-method测试文件，最终单独执行真实method-parameters文件四项；没有把未选择案例当成通过。

当前构建 `a5033f60a0dc72f8cf83ece6fd4ec830e1a882169d0a5ba4e9bd0a7036a2dfc2`。此前1,480项完整LSP以及其它构建的编辑器/Profile资格不转移到新构建。源码包验证不等于真实编辑器Undo/Redo、Windows/WSL Remote或完整混合区域审计；原Windows构造器Undo、createFile最终Redo等限制继续保留。路线图未关闭大项26，日常Profile未更新。

原始审计与归档见[机器报告](mixed-html-symbol-boundaries-2026-10-10.json)。

## 2026-10-11 完整 LSP 验收

正常构建122文件/1,488项全部通过，零失败/跳过/TODO。原1,480项身份与次数保持，新增八组混合区域协议案例；30,006冻结输入、184链接、两个仓库及实际进程终态独立核对。18文件归档绑定原50文件源码证据，正常八资产与通过构建一致。此项只取得当前构建完整LSP资格，其它构建的编辑器/Profile结果不自动转移；完整P2、其它原范围和26个未完成大项保持，日常Profile未更新。
