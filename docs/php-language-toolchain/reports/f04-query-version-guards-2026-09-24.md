# C1 查询期间的文档版本保护

日期：2026-09-24。代码审计发现，Completion、Hover、Definition、Type Definition 和 Implementation 的部分路径在等待语义工作区或框架事实后只检查取消状态，未统一复核发起请求时的文档版本。Definition 在解析方法声明依赖的循环中也可能跨异步文件读取；若此时编辑器提交新版本，旧位置或旧接收者的结果不应返回。

语言服务器新增统一的 `currentQueryDocument()` 检查，在上述请求的相关异步边界确认请求未取消且打开文档仍为同一版本。Completion 的路由与服务解析后、Hover 的服务解析后、Definition 的路由/服务目标读取和声明依赖加载后均再次检查；Type Definition 与 Implementation 在取得语义工作区后检查。Signature Help 原有最终版本检查保留。该改动不改变已解析结果的排序或语义支持范围，只阻止能观察到版本变化的旧请求返回结果。

验证：Language Server 构建及改动文件 ESLint 通过；F04 定向真实 stdio 5 项通过；完整 Language Server 测试 17 个文件、300 项通过、1 项跳过。修改后的源码重新构建，并在 VS Code 1.139.0 Linux x64 隔离 Core Extension Host 完成 F04-HOST-01 六项请求及未保存切换后的 Definition，退出码 0；首次补全 180 ms 为单次观测，不是性能预算结论。F04-NAV-10 已对进行中 References 的取消和新版本结果提供确定性协议证据；本次新增的各查询版本检查主要来自代码审计，尚未为每条异步分支建立可控暂停点，不能声称每种竞态都已被真实时序复现。
