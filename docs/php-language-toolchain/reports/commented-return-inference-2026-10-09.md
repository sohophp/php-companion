# 注释不再遮蔽返回类型

`return /* 说明 */ new Result();`、行注释及 `return /* 说明 */;` 原先会把 comment 当成返回表达式，使 Generator 丢失精确返回契约、闭包模板丢失成员导航。共享返回流现在跳过 comment，选择真正的表达式；没有表达式的合法 return 仍为 null。

仅修改该共享逻辑的一行，保留未知表达式、语法不完整、可达性与遍历预算规则。新测试覆盖块/行/hash/连续/尾随注释、裸返回、字符串内注释标记、未知调用及不完整语法，在即时和延迟声明模式验证 Generator 与闭包导航。

| 验证 | 结果 |
| --- | --- |
| 修正前有效基线 | 38 项，20 失败、18 通过；初版断言中位置元数据造成的额外失败不计为产品失败 |
| 完整语义 | 168 文件、23,645 项全过；原 23,607 项案例身份全部保留，新增 38 项 |
| 原 Generator 生产协议 | 委托、send、返回流共 12 项通过 |
| 正常 bundle 新协议观察 | PHP 7.2/8.5 × onDemand/progressive，32 次正确签名，4 个实际服务器正常退出 |
| 实际 PHP CLI | 9 个版本、144 次 Generator/闭包返回值观察通过 |
| 根单元 | 113 项通过 |
| 构建与静态检查 | semantic build、root strict、范围 ESLint、正常生产 bundle 通过 |

当前语言服务器 SHA-256：`0cb3e6be2ef5db651492cb89e1099c685d8070e016aa73fbb5391032d4cf95ff`。扩展 bundle 保持原 SHA，正常服务器已改变；旧 1,438 项完整 LSP、Linux 编辑器及组合性能资格只属于前一构建，不转移到本构建。

[Windows 有限诊断](native-windows-signature-diagnostics-2026-10-09.md)未证明首轮签名失败原因；该问题与之前组合 P95 153/150 ms 的失败继续保留。新完整 LSP/编辑器/组合性能、长期与真人 WSL 验收及全部原范围仍未完成。未提交、推送、打包或更新日用 Profile。

[机器记录](commented-return-inference-2026-10-09.json)绑定源码、运行时与原始结果哈希。证据归档为 `.vscode-test/d1145-commented-return-evidence/manifest.json`。
