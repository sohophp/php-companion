# 联合类型反馈诊断内部的CPU证据

在前轮已定位的诊断就绪等待中，当前正常bundle通过私有启动包装取得实际PHP服务器CPU采样。包装仅向该服务器fork增加显式`--require`采样器；正常extension.js、language-server.js及WASM正文逐字保持。原完整12扩展Profile、50轮标量/30轮联合类型、9,100噪声文件、watcher/暂停Hover和全部原断言保留；CPU只覆盖原30轮联合类型，不含启动或整轮其它操作。

实际服务器PID由启动包装、采样开始/停止和最终宿主证明交叉绑定。1 ms间隔得到3,089样本、3,821.15 ms采样区间；其中带publishDocumentDiagnostics祖先的样本累计1,160.42 ms。累计样本不是单次延迟；inclusive重叠不能相加，异步续体可能失去启动祖先。

主要诊断自身样本落在readonlyPropertyAssignments（285.23 ms）、incompatibleArguments的call回调（172.06 ms）和missingRequiredArguments的call回调（163.93 ms）。源码核对发现，这三条路径在声明唯一性检查时反复展开整个工作区callables，再筛选精确FQCN。下一项复用已有函数/类型声明候选索引收敛检查，保留所有重复声明拒绝、未索引回退、缓存恢复与诊断语义；不增加持久格式或删减诊断。

初次D1162采样器在原30轮开始前未返回启动确认，该失败和原始日志保留，不计产品失败。改为显式服务器fork注入后，真实服务器预检取得143样本并正常退出，再完成本轮完整流程。生产目录已有开发source map的源码身份过期，已拒绝使用；重新生成的私有external map，其minified服务器正文与实际正常bundle逐字一致，方用于映射。

本轮观测标量/联合P95为105/126 ms，**不计性能验收**；原153/150 ms失败保持。31,223份冻结输入、符号链接和两仓状态无变化，实际PHP/Twig服务器及独占显示进程已退出。正常代码和资产不变，完整性能/Windows/规模长期/真人及原全部范围继续；未提交、推送、打包或更新日常Profile。

[机器记录](union-feedback-cpu-diagnostic-2026-10-09.json)绑定原始profile、逐轮数据、精确map、失败准备、实际进程及归档。
