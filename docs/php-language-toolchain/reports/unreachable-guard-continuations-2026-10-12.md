# 退出guard后的不可达尾部语句

正常构建 `c390c035998872f2ef9066a241cb780eba96f790ac2665517ba1c3170a7a0ede` 修复guard分支已无条件return/throw或退出当前循环，却因后面还有不可达语句而丢失断言的问题。例如 `if (!ready($item)) { return; unknown(); } needReady($item);` 现在保留已证明的Ready类型，后续成员、精确导航及实参诊断使用同一事实。

按语句顺序识别保证退出的路径，覆盖循环break/continue、多分支及try/catch/finally。仅部分分支返回、仍可继续的catch和局限于内层循环的跳转保持保守；包含语法错误的分支不发布退出证明。原goto排除、跳转目标/层级及副作用检查保持。持久语义缓存升级v82，旧v81拒绝后重新索引，随后暖缓存闭合文件References保持正确。

修正前原编译Parser探针8失败/6控制通过；源码16项Parser测试8失败、28项Semantic测试16失败，原日志保留。修正后完整Parser15文件/244项、完整Semantic187文件/24098项全过，原228/24070案例身份和重数保持。标准构建及受影响源码/新测试Lint通过，202份包公开声明不变。

正常生产协议五文件16项通过。新增PHP7.2/8.5 × onDemand/progressive四组，共64版本更新，核对补全、精确Definition/Hover、错误出现消失、恢复、关闭重开及磁盘不变；另外两项旧v81拒绝/暖缓存References验证通过。目标版本是语言服务配置，不替代完整九版本真实环境矩阵。

独立核对2245份无关源码/测试输入与进程终态，49份归档摘要复核。证据 `.vscode-test/d2357-*`、`d2359-*`、`d2360-*`；审计 `.vscode-test/d2362-unreachable-guard-fix-terminal-audit.json`。新F05-FLOW-06使编号179/14家族；26大项和六最终检查保持开放。

新构建完整LSP、根质量门禁、真实编辑器、组合及性能尚未取得资格；旧a154的[规模](receiver-guard-current-server-scale-2026-10-12.md)与[真实两小时会话](receiver-guard-current-real-editor-two-hour-2026-10-12.md)仅属于旧冻结构建。复杂文档150/500ms性能缺口及完整平台/Remote/真人与剩余功能继续。无提交、打包、推送或发布，日常Profile未更新。

[机器报告](unreachable-guard-continuations-2026-10-12.json)。
