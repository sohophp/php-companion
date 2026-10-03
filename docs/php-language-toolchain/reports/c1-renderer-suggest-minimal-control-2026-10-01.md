# C1 可见补全：renderer 异常的独立对照

日期：2026-10-01。仅在独立临时宿主做归因对照；没有修改 SoPHP 产品或测试输入、打包、提交、推送或更新用户 Profile。

## 已证明范围

原 C1 可见宿主记录 `Cannot read properties of undefined (reading 'getItemsByProvider')`，栈顶为 VS Code `SuggestModel._onNewContext`，在继续输入声明名称附近出现。原列表、接受文本及 Undo 断言通过，这不代表没有错误。

本轮创建一个无 SoPHP 的开发宿主，只注册最小 PHP CompletionItemProvider：五个关键字、按词前缀过滤、普通 Keyword CompletionItem，`CompletionList.isIncomplete=true`；声明名称返回空列表。不启动 PHP 语言服务器、不安装 SoPHP，不引用其语义层或 Provider。键盘与可见列表驱动复用已编译的纯 CDP 测试辅助函数。

测试断言扩展列表不包含 php-companion，并排除 PHP Emmet 和内置 PHP 函数补全。重复八轮 function/class/enum/return 输入及声明名称，共 32 文档，135 次 Provider 请求；候选可见断言全部通过，进程退出码 0，同时出现 **8 次同一 getItemsByProvider renderer TypeError**。

因此：SoPHP 并不是该异常发生的必要条件。没有证明任意 Provider 都必然触发，也没有证明用户 WSL 窗口一定有同样问题；这个对照不算异常修复。

## 版本与代码线索

本地 VS Code 1.140.0；product.json 的 commit 为 `07f806f999227108933c2e30515b26eecc1fda74`，日期 `2026-09-30T10:38:38+02:00`。异常位置为本地 workbench.desktop.main.js:583:24675，`shouldAutoTrigger` 后检查 context，再直接访问 completionModel。

[微软 SuggestModel 源码](https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/suggest/browser/suggestModel.ts)注明自动触发判断会强制分词并可能触发取消；该代码给可重入状态变化提供线索。这里只作为分析方向：没有对状态变化做事件级追踪，也没有证明具体哪次事件清空了对象。固定 commit 的远程源码读取未成功；本地产物位置与本轮运行版本已直接核对，不把 main 远程源码当成固定版本的证明。

## 本地复现

`/tmp/sophp-renderer-minimal/runner.cjs`：独立扩展开发目录、用户数据与扩展目录，使用已有 VS Code 1.140.0，运行时清除 ELECTRON_RUN_AS_NODE 和 VSCODE_ESM_ENTRYPOINT。

`/tmp/sophp-renderer-minimal/test.cjs`：最小 Provider、未加载 SoPHP 断言、输入与候选断言。

`/tmp/sophp-renderer-minimal/workspace/.vscode/settings.json`：普通 PHP 自动建议，关闭 Emmet、词补全及静态 snippets。

```sh
node scripts/run-extension-test.mjs /tmp/sophp-renderer-minimal/runner.cjs
```

最终日志：`/tmp/sophp-renderer-minimal-host.log`。初始设置错误包括继承 Electron Node 模式、未排除 Emmet，以及 class 输入位置误放在已有函数名前；修正后才取得上述 32 文档完整通过的结果，不把这些设置错误当作产品回归。

## 后续

停止当前异常的定向排查，保留复现与版本证据。没有修改或补丁覆盖 VS Code 内部代码，没有隐藏异常日志、减少输入用例或改变 SoPHP 用户默认设置来规避它。后续宿主版本变化或实际用户反馈提供新证据时再复查；当前继续原补全阶段的协议集成验证。
