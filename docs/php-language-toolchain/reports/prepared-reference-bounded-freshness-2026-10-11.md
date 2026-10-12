# 准备引用的新鲜度校验成本与并行读取

2026-10-11。原选区查询语义复用已是1ms，但总耗时仍超过1000ms。请求区间CPU证据显示源码新鲜度校验含大量逐文件stat/read和重复autoload路径判定。本轮保留全部候选及旧候选撤回检查，将同一次查询的路径判定缓存到局部Map，文件检查改为最多八个一批；未改符号筛选、业务副本或原门槛。

各批先等待文件状态检查并预留总字节预算，再完成最多八个源文件读取，按原顺序发布。单文件/总字节、文件类型、取消、项目epoch及source-ready判断保留；读取期间打开的缓冲区在发布前重新核对，失效后仍清除旧路径搜索。局部路径Map不跨查询保存。此项减少后台等待与重复判断，不通过略过新鲜度检查取得更快结果。

| 同一固定项目、未采样的单次控制 | 首次选区References | 准备/实际语义结果 | 原1000ms门槛 |
| --- | --- | --- | --- |
| 原正常bundle b8a6df45 | 3258ms | 188 / 188、semantic1ms | 失败 |
| 新正常bundle 7933c0b3 | 2015ms | 188 / 188、semantic1ms | 失败 |

两轮均保留完整位置与Definition1摘要，独立核对继承/vendor四锚点，66079项目输入及工具输入终态保持、所观察的进程与自有缓存清理完毕。失败均在cold，reload没有执行。该成对单次控制证明此数据下耗时下降，不是P95、统计显著性或整个选区性能资格。

原新增/修改/恢复/删除消费者的十项协议通过；[新读取竞态回归](../../../packages/language-server/test/prepared-reference-batch-stdio.test.ts)在PHP7.2/8.5 × progressive/experimental四项通过。真实磁盘读已完成但暂未交付时打开不同的未保存内容，最终引用不能包含旧调用，磁盘仍保留原文；实际并行读取大于一且不超过八，取消返回-32800，下一查询恢复。首轮三文件13通过/1失败为观测JSON读到非原子写入；改为按线程临时文件rename后四项完整补验，原错误与工具源码保留，产品未因该工具错误重跑或更改。严格语言服务器构建、正常Core重建及定向Lint通过。

新正常构建的独立CPU采样请求1944ms仍失败1000ms；1658主线程请求样本与单调时钟对齐，另六个worker profile保持。主线程idle约599ms，文件open/close/stat/read/fstat与新鲜度函数仍有明显样本，nativeMethodReturnTypeName约152ms；样本用于继续审查文件操作与重复接收者方法查询，不把全部idle归因于文件IO，也不证明唯一根因。

[机器报告](prepared-reference-bounded-freshness-2026-10-11.json)；[独立终态审计](../../../.vscode-test/d1805-bounded-reference-freshness-terminal-audit.json)；[78文件归档](../../../.vscode-test/d1805-bounded-reference-freshness-archive/manifest.json)。新正常bundle完整摘要`7933c0b3d80349ddf42090b4d86950e3487fea5060c3f3a056760e70965d3cc8`；先前完整1488回归不作为此新构建资格。新增F04-REF-07，167编号/14家族；选区性能、完整新构建与六流程、编辑器/Remote及F13/P9/R4继续，路线图未完成大项26，日常Profile未更新，未提交或发布。
