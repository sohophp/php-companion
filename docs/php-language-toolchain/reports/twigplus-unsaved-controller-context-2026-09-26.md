# TwigPlus Controller 上下文补全与未保存刷新

日期：2026-09-26。范围为 SoPHP Core、SoPHP Symfony 与相邻 TwigPlus 源码仓的隔离项目；没有修改业务项目，没有打包 VSIX。

跨扩展宿主先证明了命名 `render()` 的变量可从 Twig 跳回 PHP，但 `{{ us... }}` 中的 `user` 不出现在建议列表。TwigPlus 的 `contextFor()` 原已将变量用于诊断、类型成员和 Definition，根变量补全却只合并 Twig 局部符号与项目全局变量。新增 TwigPlus 语言服务器回归先得到空列表；现把当前模板的 Controller 变量加入同一补全提供者，仍由 TwigPlus 唯一负责 Twig 语言能力。

另一个断点是 TwigPlus 只监听 PHP 磁盘 watcher，未保存的 Controller 编辑不会主动刷新 Twig 上下文。VS Code 客户端现监听 PHP 文档打开、修改、关闭，300 ms 合并连续输入；每次刷新带代次，旧异步结果不会在新编辑后再发送，临时请求失败由下一轮重试处理。磁盘 watcher 和启动刷新继续沿用原路径。

验证：TwigPlus 源码构建通过；`languageServerIntegration.test.ts` 14/14 通过；VS Code 1.139.1 Linux x64 源码宿主同时加载三扩展，检查 `user` 补全、Twig→PHP Definition、未保存地把 `templates/named.html.twig` 改为 `templates/edited.html.twig` 后新模板取得 PHP 来源且旧模板撤销，Extension Host 退出码 0。测试特意等候启动重试结束后再编辑，以免启动刷新掩盖缺失的编辑事件。相关差异检查通过。

同一宿主随后补验 `renderView()` 的 Twig→PHP Definition，以及通过编辑器 Revert 丢弃未保存内容并关闭 Controller 标签页：原模板重新取得 PHP 来源，临时模板的来源消失，Extension Host 再次以 0 退出。这验证了明确丢弃编辑后的恢复链；没有模拟关闭脏文档时的保存确认弹窗。

该结果不代表冻结的 `15a5254` 候选已经包含这份 TwigPlus 源码更新，也不代表真实 WSL Remote 的可见建议弹窗；下一次组合候选须同批纳入 TwigPlus 新构建并验收。
