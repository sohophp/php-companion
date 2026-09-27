# C2：Attribute 构造参数的未保存声明往返

日期：2026-09-27。使用独立临时 Composer 项目与真实 Language Server stdio；未修改业务项目、安装 Profile 或打包 VSIX。

在 `Lib\Config` 类的磁盘构造函数参数为 `$name`、使用方输入尚未闭合的 `#[Config(` 时，补全和 Signature Help 均读取 `name`。随后打开声明文件并保留未保存的 `$label` 修改，使用方不变；两项结果同步切到 `label`。关闭声明文件后，结果立即恢复磁盘的 `name`。该 1 项定向回归通过，覆盖从未打开 Composer 类按需载入、跨文件未保存缓冲区权威性及关闭后恢复。

这条证据仅覆盖该通知顺序与单机 stdio；不同版本并发请求、真实 VS Code Remote、已安装候选及长时间编辑仍按 C4/R4 验收。新 Attribute 参数能力的源码与完整 Pack 宿主结果见[功能报告](c1-attribute-constructor-arguments-2026-09-27.md)。
