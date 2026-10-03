# R45 未保存补全在语言客户端重启后的恢复

日期：2026-10-02。对应补全专项阶段 5 的重启要求与 C4 崩溃恢复。当前产品为 R44 源码／bundle；本批仅新增独立测试及执行工具，产品源码和原 40 项冻结输入保持不变。未打包、提交、推送或更新 Profile。

## 实际操作链

Linux x64、VS Code 1.140.0、Core-only 隔离 Extension Host：

1. 磁盘文件调用 Alpha::alphaMember，先确认成员补全。
2. 编辑打开的缓冲区为 Beta::betaMember，保持未保存，确认 Beta 补全。
3. 通过测试专用命令使当前语言服务器退出，读取该 Extension Host 的直接子进程 `/proc` 信息，等待新的语言服务器 PID。
4. 从重启后的服务器取得 Beta 补全和准确的 Beta 方法声明落点；缓冲区仍为 Beta、仍 dirty，磁盘字节仍为原 Alpha 源码。
5. 在同一窗口继续编辑回 Alpha，补全恢复 Alpha。

正式门禁 PID 从 1187352 改为 1187431，宿主退出码 0；[原始 JSON](c4-unsaved-completion-restart-2026-10-02.json)记录进程与结果。单独临时探针先验证链条，随后仓库正式脚本重新执行取得上述结果。原默认 Core-only 宿主也退出码 0，但它在 `index.ts` 中提前返回，只验证能力边界；本报告不将该运行记作崩溃恢复。

## 可重复执行与验证

- `test/extension/suite/restartCompletion.ts` 保留完整操作链与严格文本／定义断言。
- `scripts/check-extension-restart.mjs` 把该 suite 编译到独立临时目录，复用已有 compiled runTest.js 的 fixture／安装路径，只替换执行 suite；原 dist-test 不改。结束后清理自己创建的目录。
- 正式独立宿主退出码 0；新增两个文件 ESLint、宿主 TypeScript `--noEmit` 与 diff --check 均退出码 0。
- 原 40 项主产品／dist／bundle／宿主／协议脚本在测试结束后全部匹配。

已有构建与宿主编译产物时：

```sh
node scripts/check-extension-restart.mjs /tmp/sophp-restart.json
```

日志 `/tmp/sophp-r44-core-host-restart-gate.log`、`/tmp/sophp-r44-unsaved-restart-host.log`、`/tmp/sophp-restart-host-{final.log,lint.log,typecheck.log,product-inputs.log}`。正式脚本必须同时取得成功宿主退出与不同 PID 的结构化证明；仅退出码 0 不计重启通过。

## 边界与剩余

本批证明一个真实语言客户端崩溃重启后的未保存补全／定义和后续编辑链；不证明反复崩溃的限流、所有 Composer 根／复杂 Provider 状态、跨平台、真实 WSL Remote 窗口或多小时使用。PID 检查仅适用于 Linux `/proc`，脚本在其它平台明确拒绝，不冒充平台矩阵通过。

R44 当前完整 stdio 集成随后终止：429/429、零跳过、退出码 0；40 项产品和本批两个工具输入全部匹配。该结果与本独立宿主分别记录，本批没有把宿主计入 stdio 数量，没有为此形成安装候选。
