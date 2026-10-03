# phpstorm-stubs：数组模板声明与未知元素

后续性能修复已通过：[局部范围定位](completion-local-range-performance-2026-10-02.md)在同一 200 次查询样例中得到 P95 81.17 ms，且完整语义 1213、相关 LSP、隔离宿主通过。下文 197.12 ms 保留为修改前基线，该单文件预算缺口由后续报告关闭。

## 本批范围

`array_fill_keys` 及相邻十项：reverse、unique、slice、chunk、fill、rand、intersect、diff、intersect_key、diff_key。保留现有版本签名，不新增配置。固定来源仍为 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681`。

## 发现与修改

- `array_fill_keys` 四版基线只返回宽 `array`，对象值类型和成员建议丢失。它把合法输入误限为 list，同时多个 PHPDoc 标签挤在同一行，模板未被完整消费。
- keys 改为 `array<array-key, mixed>`，返回为 `array<array-key, TValue>`；保留 PHP 7 val／PHP 8 value 名称。按 [官方手册](https://www.php.net/manual/en/function.array-fill-keys.php)及实际调用，允许关联输入与 float／bool／null／数字字符串键转换；不把输出键错推断成纯 string。
- 整理 auditedArrayFunctionStub 的标签换行。相邻十项的四版消费基线失败；整理后原本已有的对象值、键及 chunk／fill 的 PHP 7 失败分支才进入语义查询。
- 未知填充值会使直接 TValue 绑定缺失。额外返回重载尝试无效，已完全撤回。
- 共享语义消费保留已经由 PHPDoc 证明的数组／列表容器，将无约束的未知元素模板替为 mixed。直接模板返回、受约束模板、未知键位置、非集合返回及缺少必需参数均不据此补类型。原有调用兼容检查仍执行。

## 最终验证

- 六套实际 Linux PHP 7.2／7.4／8.1／8.2／8.4／8.5：关联键、转换后的键、同一对象身份、空填充、九个相邻函数的对象值及单键 rand 通过。运行 `node scripts/check-array-fill-keys-runtime.mjs /usr/bin/php72 /usr/bin/php74 /usr/bin/php81 /usr/bin/php82 /usr/bin/php84 /usr/bin/php85` 可复验。
- 四版 fill_keys 4/4，每版六种已知 keys/value 组合及未知元素；相邻十项四版合同 4/4；共享未知元素六项正反例和每项缺参数反例由完整集合覆盖。
- 语言规格全量 195/195，九文件，16.13 秒。
- 最终完整语义 1211/1211，58 文件，48.86 秒。早一轮 1205 属于共享未知元素修复前，不用它证明最终状态。
- 两版实际 stdio 4/4，两文件，5.46 秒：fill_keys 共八次候选／Hover 更新，相邻十项共二十次 Hover，磁盘均未变。
- Linux VS Code 1.140.0 隔离 Core 宿主退出 0：fill_keys 与 reverse 各四次 Item→Other→mixed→Item 的 Hover、成员撤回和恢复，八次全部正确；文档 dirty，磁盘保持原样。最初宿主混合类型 Hover 失败的构建已被最终构建取代。
- language-spec、semantic、language-server 和根 bundle 构建、扩展测试 TypeScript、本批 ESLint 均退出 0。

连续补全测量已退出 0：1003 类基线单文件加两个当前值类型，200 次未保存切换，正确候选排首位且对侧候选撤回，磁盘未变。P50 153.47 ms、P95 197.12 ms、最大 212.47 ms、首次 156.45 ms。**P95 超过 150 ms，性能验收未完成**，下一批需定位这一真实查询的耗时；不能把测量退出 0 当作预算通过。这是单文件测量，不是可见弹窗等待或多文件/vendor 基准。

未重跑完整 stdio、Windows 宿主、可见弹窗或真人 WSL UI；不打包、提交、推送、更新 Profile。本批不证明全部内置函数或整个路线图完成。
