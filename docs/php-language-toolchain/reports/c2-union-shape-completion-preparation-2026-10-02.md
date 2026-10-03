# C2 联合数组形状补全隔离准备

日期：2026-10-02。当前主产品全量 stdio 419 项正在同一进程运行；为保留其输入一致性，本项只在 `/tmp/sophp-union-shape-completion-preparation` 修改语义副本并生成独立服务器。**尚未应用到主源码，也不是 Profile 或真实 WSL 验收。**

后续状态：前批 419 项终态通过后，已将相同实现应用到主源码，见 [R36 产品验证记录](c2-union-shape-completion-2026-10-02.md)。本记录保留隔离准备时的范围。

## 已复现与实现

当前主产品对于 `array{mode:'create',id:int}|array{mode:'update',name:string}` 的实参数组没有 `mode` 键与 `'create'`／`'update'` 值补全。隔离实现取各数组形状都能证明的共有字段，并合并该字段的值类型；分支独有键不输出。嵌套字段、返回表达式和赋值表达式使用同一规则。

原生 `?array` 参数的合法可空形状 PHPDoc 还会被参数精化逻辑丢弃。修复保留 nullable 原生类型的 null 分支，并在兼容判断中展开括号包裹的 PHPDoc 联合类型。保留不兼容类型过滤；展开预算 128 个类型节点。

联合形状最多 32 个分支，共有字段计算共享 2,048 个字段预算，嵌套路径沿用 64 层限制。未知类型、普通宽数组、重复字段与超过预算的合同不生成共有形状。没有基于已填 discriminator 猜选分支，也没有扩大错误恢复规则。

## 本轮证据

| 核验 | 结果 |
| --- | --- |
| 隔离 TypeScript 编译 | 退出码 0 |
| 定向语义用例 | 新增 27 项，全部包含在下述全量结果 |
| 隔离语义全量 | 33 文件、794/794 通过，50.36 秒，退出码 0 |
| 隔离实际 stdio | PHP 7.2／8.5 共 20 个场景通过，退出码 0；检查精确候选、替换范围、插入文本，以及未保存的共有字段变更、宽类型撤回与恢复 |
| 定向 ESLint | 退出码 0 |
| 四项隔离输入终态 SHA-256 | 源码、编译语义、新测试、独立服务器均一致 |
| 主产品十三项输入中途复核 | 一致；完整 stdio 尚未终态，不能计通过 |

首次 nullable 用例失败后，确认同时存在原生 nullable 精化丢失和括号联合类型未展开问题；没有删除该正例。最终正例及原生 `array`／`?string` 冲突负例都通过。

日志：`/tmp/sophp-union-shape-completion-full-final.log`、`/tmp/sophp-union-shape-completion-lint-final.log`、`/tmp/sophp-union-shape-completion-protocol.log`。协议结果与实际替换后的文本在 `/tmp/sophp-union-shape-completion-protocol.json`。准备补丁 `/tmp/sophp-union-shape-completion-preparation.patch`；输入清单与终态复核分别为 `/tmp/sophp-union-shape-completion-preparation-inputs.sha256`、`/tmp/sophp-union-shape-completion-preparation-final-inputs.log`。

## 下一步与开放范围

等待已有完整 stdio 419 同一进程终态并核验十三项输入，再应用本项，补入正式协议及编辑器宿主回归、可见列表与 Tab 接受验证。当前独立 stdio 服务器关闭了持久索引引擎身份，不替代主产品完整协议、持久索引或编辑器测试。

额外探测中，未闭合引号且整个调用未结束时没有共有形状提示；该恢复缺口保留待后续处理，不能把本项称为所有未完成输入均通过。真实 WSL 与完整 C3 Symfony 快照组合也仍未验收。未打包、提交、推送或更新 Profile。
