# C2：条件补全可见接受（2026-10-04）

## 真实缺口与修复

此前 match／switch Provider 与 stdio 结果通过，但不能证明弹窗显示。新增隔离 Workbench 验收在首个枚举条件中实际失败：Provider 返回 Current0Enter::Ready，弹窗只有 readdir 等函数。服务器的匹配接受了 case 名片段，却未设置适用于编辑器的 filterText。

现在枚举 case 名能匹配前缀时使用该名字作为 filterText；类型名前缀仍使用完整标签。显示和插入仍为类型::case，标准 LSP 字段，无新设置。它覆盖原有预期类型枚举值入口，不限于条件表达式。

## 原始记录

- `/tmp/sophp-comparison-visible-host.log`：旧专项脚本仅替换编译 harness 第一行，跨行表达式导致 SyntaxError；已改为核验唯一属性并替换至 launchArgs 的完整跨度，不算产品运行证据。
- `/tmp/sophp-comparison-visible-fixed-runner.log`：Workbench 首个枚举条件等待超时。`/tmp/sophp-comparison-visible-diagnostic.log` 留存 Provider 目标与实际函数列表，两个失败进程均结束后再重跑。
- 服务器包重建后重新生成 bundle。`/tmp/sophp-comparison-filter-lsp.log`：两个文件、三项协议全部通过（5.23 秒）；包括 match、两版 switch、未保存变化、替换范围；此时仅大小写未对齐的 filterText=Ready，仍未通过 UI。

## 验收范围

可见专项检查 match／switch 各枚举和 bool 四个场景，Enter／Tab 共八次，目标必须为实际可见首项，try 不得混入；接受文本、光标、单次 Undo/Redo、磁盘不变分别断言。使用独立 Composer fixture、隔离 Linux VS Code 1.140.0，不改 Winstar 或 Profile。

弹窗等待从显式 triggerSuggest 到读取到首项计时，前面已查询 Provider。它是已准备文档的弹窗等待，不是自动弹出或首次输入等待，也不能用八个样本推导热查询 P95 资格。真人 WSL、Windows 与完整版本／性能矩阵仍待验证。

## 最终收口

仅使用 Ready 的 `/tmp/sophp-comparison-visible-filter-fixed.log` 仍失败，保留原记录。最终枚举 filterText 对齐当前输入前缀的大小写；不能按前缀直接匹配的 case 别名保留显式前缀。对 label 与插入文本不作改动。

最终 `/tmp/sophp-comparison-case-filter-lsp.log`：两文件三条协议全部通过（5.61 秒），枚举小写输入使用 filterText=ready。`/tmp/sophp-comparison-visible-case-fixed.log` 退出 0，四场景 × Enter／Tab 八次可见首项、精确接受文本、光标、单次 Undo/Redo 和磁盘不变全部通过。原始结构化结果见 [可见记录](completion-comparison-visible-2026-10-04.json)。等待样本与中位数见该 JSON；不等同热查询预算。

最终包构建、定向 ESLint 与 diff 检查通过。本增量服务器映射不改语义；完整语义 1393 的当前证明来自前一批 switch 上下文增量，不虚构重新执行全量。必要源码里程碑与 switch 修改一起提交，不推送、不打包或更新 Profile。Goal 继续，真人 WSL 等资格仍开放。
