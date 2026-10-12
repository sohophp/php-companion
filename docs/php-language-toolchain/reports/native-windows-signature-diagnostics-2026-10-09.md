# 原生 Windows 签名查询的有限诊断

首轮正常 Windows C2 在 Generator 返回流的签名断言失败，仍未通过验收。两种独立观测均未重现，原因尚未证明；停止同类整轮重跑，保留首轮失败，不更改生产逻辑或原断言。

| 运行 | 观测方式 | 结果 |
| --- | --- | --- |
| D1132 | 正常生产资产、原完整 C2 | 160.60 秒退出 1，签名为空，首轮失败保留 |
| D1136 | 私有 API 观测及 verbose LSP trace | 原完整流程通过；版本 1–7 的七次请求均返回正确签名，无取消 |
| D1138 | 私有扩展 middleware，只在请求完成后记录 | 原完整流程通过；七次服务端原始回复与 Provider 回复匹配，版本未漂移、无取消 |

D1136/D1138 均仅用于诊断，不能替换正常 Windows 验收。完整原流程、300 秒截止及断言保持；运行输入与终态已核对，所有自有进程均已退出。诊断期间正常源码、扩展及服务器资产未更改，未更新日用 Profile。绑定服务器 SHA-256 为 `db088ffc47c08d92683bacf2621e6fa1ce3200f44747b26a56ff0f506cf2b18c`；后续源码修正属于另一快照。

当前不能从两次诊断成功证明首轮失败由取消、文档版本竞争、客户端转换或服务器推断导致。只有取得新的因果证据后再继续该问题。完整性能、真人 WSL 和全部原目标仍未完成。

[机器记录](native-windows-signature-diagnostics-2026-10-09.json)保存原始审计与协议复核的路径及哈希；原始日志分别保存在 `.vscode-test/d1132-current-native-windows-c2-evidence/`、`d1136-current-native-windows-c2-evidence/`、`d1138-current-native-windows-c2-evidence/`。
