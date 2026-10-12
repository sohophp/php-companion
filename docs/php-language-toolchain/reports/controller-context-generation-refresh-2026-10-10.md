# 控制器上下文索引换代恢复

progressive模式会在磁盘变更发布后启动下一代索引。项目epoch此时可以保持不变；旧代Controller Provider准备被废弃后，原ensureOnDemandControllerContexts只在epoch改变时重试，导致仍有效的请求返回null。

正常源码现同时检查任务generation是否被新索引取代，在原有两次有界恢复内重新准备。取消的请求保持null，另一位共享调用者继续；未增加等待时间、重试预算或删除旧代结果拒绝规则。与修复前源码逐字核对，只有Controller函数的这一条件改变，候选源码扫描函数保持原文。

## 验证

四项受控生产协议使用真实Symfony Provider及原progressive两秒刷新：先完成watcher发布，再持有旧代查询的Provider，暂停新代source scan，确认前后epoch相同后释放。旧正常构建四项均返回null失败；新构建四项通过，PHP7.2/8.5均覆盖单请求和取消一位共享调用者。结果保留当前模板与新代snapshot，原磁盘文本保持。

原完整失败的文件删除/重建、类型修改/删除/恢复，以及原Controller共享取消、普通补全注册和magic method协议一并验证，合计28项通过。语言服务器strict编译、根strict与变更范围lint通过。

正常完整LSP原入口、原项目顺序和预算：120文件/1,476项全部通过，原1,472身份及重数保持，新增4项受控交错；0失败/待执行/todo。此前两轮1,471/1,472的原失败记录保持，新全量结果包含原Symfony重建失败用例和修正实际默认值期望的原完整stdio案例。

正常LS摘要`0ae33e9b04c83f12ccbb8dd086a8f3c547818978acb383700b27e8a3f6a131d0`；八份正常资产仅LS改变。完整运行29,976份输入、链接和仓库状态保持，实际控制器/服务器/所属进程组全部结束。52份源码与原始结果归档，见[终态证据](../../../.vscode-test/d1623-controller-generation-terminal-audit.json)及[同名JSON](controller-context-generation-refresh-2026-10-10.json)。

初始夹具的JS转义和测试释放接口错误已修正并保留；最初持有watcher自身Provider的四项通过，没有覆盖查询跨代，不作为反事实。正式反事实是D1618四项null失败。一次补丁误命中候选扫描分支，strict检出后回退；该未合格构建未用于协议验收，正式范围已作字节核对。

## 交付边界

此修复完成当前Controller换代缺口与正常完整LSP验收，不关闭P0–P9/C1–C4整体范围。PHPDoc66项和语义23,725项绑定此前相同源文件的已通过结果；语义/源码声明schema仍为91/9。后续[当前四组Linux编辑器验收](controller-generation-linux-editor-workflows-2026-10-10.md)已全部通过，其它平台、完整Profile/性能、长期及真人验收继续；Windows C2原失败与createFile fallback Redo限制保持。路线图未完成大项26，日常Profile未更新，未提交、推送或发布。
