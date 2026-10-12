# PHPDoc 独立 AST 基础合同验收（2026-10-10）

路线图 P2 的“独立 PHPDoc AST，区分类型表达式、参数名和普通说明文本”已取得直接证据，可以关闭这一基础条目。`@php-companion/phpdoc` 不依赖 VS Code；独立类型节点、标签的 variable 和 description 分别保存类型、变量及普通说明，类型/标签保留 UTF-16 源码范围。语义组件通过本包导入解析模型，并按原文档范围传入偏移。

本轮执行包内全部 28 项测试，零失败、跳过或 TODO，覆盖嵌套类型、形状、Callable、条件类型、模板/方差、变量及说明分离、Unicode/CRLF 偏移、合法未知标签与未完成输入错误。严格独立编译通过，产出的 JS 和类型声明与正常 dist 逐字一致。另在没有项目依赖的隔离消费者目录，只放本包及编译产物，通过公开 package exports 导入，实际核对复杂类型/变量/说明分离、UTF-16 偏移、已支持 param-out、未知后缀标签和不完整输入；没有安装依赖或联网。该消费者是一次独立消费检查，不计入 28 项包内测试数。

| 原条目要求 | 当前实现与直接证据 |
| --- | --- |
| 独立 AST | 独立包导出 PhpDocType/PhpDocTag/ParsedPhpDoc；严格编译和隔离 package exports 消费通过 |
| 类型表达式 | 有结构化 name/generic/shape/callable/conditional 等节点；嵌套语法和范围测试通过 |
| 参数名 | 标签 variable 与 Callable 参数 name 独立存储；参数、variadic、引用及方言测试通过 |
| 普通说明文本 | 标签 description 不并入类型或变量；param/return/deprecated 的说明与 Unicode/CRLF 范围测试通过 |
| 未完成输入 | 返回结构化错误；缺失类型、未闭合泛型和 Callable 原测试保持 |

18 个相关输入及当前仓库状态终态保持，正常八运行资产没有改变，所有测试/编译/消费者与控制器实际进程已结束。原始结果、输入、产物和消费者共 38 文件归档核验，另绑定当前完整 LSP 的 23 文件归档。逐项身份、命令和终态见[同名 JSON](phpdoc-ast-foundation-contract-2026-10-10.json)。修正了本包 README 把已支持 param-out 错称未知标签的旧说明；解析器和测试源码未修改。

本次仅关闭独立 AST 基础要求。当前标签解析按单行标签体处理，跨行复杂类型、更多方言及其语义传播仍需按后续支持范围逐项审计；不会把 AST 基础通过扩大成所有 PHPDoc 语法、高级类型、平台或全部 P2/P5 完成。其它未关闭条目保持，路线图未完成大项由 27 减为 26；当前 Windows 完整 C2 原失败、显示启动失败及真实 WSL/长会话继续记录。没有更新日常 Profile、安装、打包、提交、推送或发布。

可复现源码测试和类型检查：`pnpm --dir packages/phpdoc test` 与 `pnpm --dir packages/phpdoc typecheck`。本轮精确命令及隔离消费者源码保存在 JSON/归档中。
