# D54：数组形状键和值之间的注释

## 复现与修改

在 f062597c 的已构建语义包上，`'enabled' /* key */ => tr`、`'enabled' => /* value */ tr`、键后的行注释以及嵌套键注释均丢失 `true` 字段值；函数候选 `pickA():string`／`pickZ():bool` 不再按 bool 字段排序。无注释对照返回 `true`。

统一 quotedArrayKey 的三处调用（嵌套路径、字段值、已用键）传入当前解析器确认的 commentRanges。仅遮蔽该元素范围内的真实注释，保留长度、换行和原源代码偏移；解码仍读取原始字符串，字符串中的 `/*`、`//` 不当注释。不创建整文件遮蔽副本，不改公开 LSP 或设置，不猜测动态键和未知字段。

## 验证

- 新增 34 项语义测试：保留／临时语法树、块／行／井号注释、嵌套路径、已用键过滤、注释样式字符串、未知／动态键、内层实参契约、注释内光标、未保存契约刷新；查询不改 revision／snapshot。首轮测试错误地在 PHPDoc 字段名内放入 `*/`，导致文档提前结束，已改成合法的 `/*key` 字符串，未修改产品迎合错误夹具。
- 定向三个文件 148 项通过（之后新增 8 项由完整回归覆盖）；日志 `/tmp/sophp-shape-comment-focused.log`。
- 当前完整语义 90 文件／1732 项通过，61.60 秒，原会话 61395 退出 0，日志 `/tmp/sophp-shape-comment-full-semantic.log`。
- semantic、language-server、根生产 bundle 构建及定向 ESLint／diff 检查通过。
- 真实 stdio：PHP 7.2／8.5 两项共 42 次查询通过，516 项未选中不记通过；8.13 秒，日志 `/tmp/sophp-shape-comment-protocol.log`。覆盖候选首项、兼容候选保留、范围、注释、内层契约与未保存更新。PHP 版本是服务器配置，未运行两种 PHP 编译器。
- [可见宿主证据](completion-shape-comments-visible-2026-10-04.json)：隔离 Linux VS Code 1.140.0／PHP 8.5，函数、行注释字面量、嵌套字面量、常量四场景各 Enter／Tab，8 次可见首项、精确文本、光标、Undo／Redo、磁盘不变通过，日志 `/tmp/sophp-shape-comment-visible-host.log`。实际接受文本用 PHP 8.5.9 `-l` 全部通过，不执行。显式触发等待 149–380 ms，不视为自动弹出或 P95 门禁。

## 边界

真人 WSL、完整当前 LSP、平台／运行时矩阵尚未关闭。没有重新测量大型编辑性能，前一组合 P95 292.56 ms 超过 150 ms 的失败记录保留；本批不宣称性能改善。保持同一分支，当前源码未提交，留待必要的组合里程碑提交；没有打包、推送或更新 Profile。goal 继续 active。

### 后续组合检查点

D55 接续处理尾部注释后的空值变量建议，并修复 LSP named-argument 提前返回。D54／D55 合为一次本地里程碑，替代上文当批未提交状态；当前最终完整语义 91 文件／1774 项和 50 次定向 LSP 请求通过，见 [D55 最终记录](completion-blank-comments-2026-10-04.md)。本文件八次可见宿主证据绑定 D54 当批源码，D55 的当前八次空值验收另列，不能把两批可见记录描述成当前同一次验收。
