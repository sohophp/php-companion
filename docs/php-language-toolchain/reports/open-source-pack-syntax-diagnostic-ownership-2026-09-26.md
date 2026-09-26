# Open Source Pack 的 PHP 语法诊断归属

日期：2026-09-26。范围为 VS Code 1.139.0 Linux、当前 10 项 Pack 源码 Profile 的独立 Composer 夹具；未修改业务项目，未打包 VSIX。

VS Code 内建 PHP 扩展的 `php.validate.enable` 默认开启，`php.validate.run` 默认 `onSave`；Pack 目前只关闭内建基础补全，没有关闭 CLI 校验。隔离 C2 宿主实际保存两种错误并等待诊断更新：

| 输入 | 保存后的诊断 | 观察 |
| --- | --- | --- |
| `<?php function syntaxProbe(: void {}` | 1 条 PHP CLI 语法错误 | 当前 SoPHP 解析器树含匿名 `MISSING ")"` 节点，但其公开 `errors` 列表为空；不能关闭 CLI 后仍声称覆盖此错误 |
| `<?php echo ;` | SoPHP `php.syntax` 和 PHP CLI 各 1 条 | 两项报告同一语法问题，Problems 面板会重复显示；CLI 更新前还短暂保留上一轮保存的旧消息 |

原始隔离宿主日志为 `/tmp/sophp-pack-syntax-provider-settled-20260926.log`，整轮 C2 退出码 0。解析器本地对照确认第一项 `rootNode.hasError=true`、`errors=[]`，第二项有明确 `ERROR` 范围。临时宿主探针已移除，以上结果尚未进入持久门禁，也不代表已安装候选或其它平台。

当前保留内建 CLI 校验，避免产生语法错误漏报。下一步先让 SoPHP 对匿名缺失 token 给出稳定、受限的实时诊断，并用合法的未完成输入及 PHP 7.2–8.5 版本边界防止误报；再在完整 Pack Profile 中决定保存后的去重归属。只有这些结果通过，才考虑修改 `php.validate.enable` 的默认组合设置。

后续已先补闭合分隔符缺失这一项：解析器在后续仍有 PHP token 时收集匿名 `MISSING )`、`]`、`}` 的位置，并将诊断范围落在缺失位置的下一个字符；不把普通 `MISSING ;` 一并纳入，避免误报当前 grammar 尚未完整识别的 PHP 8.5 `(void)` cast。解析器 82/82、语言分析 46/46，以及语言服务全量 370 通过、1 跳过；全量日志 `/tmp/sophp-missing-delimiter-language-server-20260926.log`，退出码 0。完整 10 项 Pack C2 源码宿主中，未保存的缺失 `)` 诊断出现且 Undo 后撤回，退出码 0，日志 `/tmp/sophp-c2-missing-delimiter-pack-20260926.log`。这只关闭该类缺失分隔符的实时反馈，不证明所有 PHP 语法错误均由 SoPHP 覆盖；保存后其它明确错误仍可能与内建 CLI 重复，因此 Pack 默认值保持不变。
