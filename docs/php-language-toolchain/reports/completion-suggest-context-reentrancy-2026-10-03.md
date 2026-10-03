# 可见补全：跨词批量插入的 Workbench 异常

日期：2026-10-03。当前 Linux VS Code 1.140.0 源码宿主，无 Profile 安装、VSIX、推送或外部消息。

## 已确认复现

输入 `enu` 并等待 enum 候选，再输入 `m`，等待完整 enum 候选。一次插入字符串 ` e`，进入声明名称位置。

| 提供者／输入 | 次数 | getItemsByProvider 异常 | 候选和文本 |
| --- | ---: | ---: | --- |
| 当前 Core，批量插入 ` e` | 6 | 6 | 名称候选正确撤回，最终文本正确 |
| 独立最小提供者，批量插入 ` e` | 6 | 6 | API 名称候选为空，显式刷新前可见列表已为空，最终文本正确 |
| 当前 Core，分别输入空格和 e | 6 | 0 | 名称候选撤回，最终文本正确 |

独立提供者仅调用标准 CompletionItem API。它在临时目录用相同测试扩展 ID、**0.0.0 合成版本**运行，未加载真实 SoPHP 代码或语言服务器；保留相同 configurationDefaults，关闭内建 PHP 补全、词语及静态模板干扰。proof 的 provider URI 明确位于临时 `control` 目录。该合成扩展不安装到用户扩展目录，测试结束已清理。

最初 function／class 的 12 次短探针及加中间等待的 12 次探针没有重现，不能据此排除问题。随后审计完整 C1 中 PHP 8.5 独有的 enum 名称转换，取得上述稳定复现。对照工具早期正则转义和缺少 configurationDefaults 使空列表断言失败，保留失败日志，不作为干净对照；正式 v4 使用相同默认配置并取得六次终态证明。

## 判断与处理

异常在不运行 SoPHP 的条件下也可重现，SoPHP 不是必要触发条件。实际 Workbench 源码的 SuggestModel 在调用 shouldAutoTrigger 前检查 completionModel，随后直接访问 getItemsByProvider；shouldAutoTrigger 会调用 tokenizeIfCheap。这与检查后状态变化／重入相符，但具体取消事件的因果链仍属推断，未宣称完成上游根因证明。

C1 的“普通键入 enum 名称”现分别输入空格和 e，匹配该场景的测试意图；批量输入继续由独立探针保留，不过滤错误日志、不将更改测试动作称作产品修复。**VS Code 批量插入异常仍未修复**。没有修改编辑器内部代码、降低语义断言或新增产品设置。

可复现工具：`node scripts/check-suggest-context-reentrancy.mjs core`、`control`、`coreKeys`。它是诊断工具，退出 0 表示其文本／候选断言完成，批量模式的渲染错误应另读日志，不能解释为无异常的工作流门禁。正式 coreKeys 宿主退出 0，六次断言、零异常；宿主 TypeScript noEmit、定向 ESLint 和 diff 空白检查通过。完整后端 506 项结果仍属于未变化的产品源码，不需要因 UI 测试动作调整重新运行后端全集。

原始证据见同名 JSON；日志 `/tmp/sophp-suggest-context-{core-enum,control-enum-v4,formal-keys}.log`。不发送上游 issue，不把自动化当作真人 WSL 或所有 IME／粘贴验收。
