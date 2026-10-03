# 当前 phpstorm-stubs 与声明缓存的 Windows 源码验收

日期：2026-10-03。一份当前 Core Development Path 临时副本复用三次独立宿主；没有 VSIX、安装、日常 Profile 变更、提交或推送。20 项 Core 构建、WASM、运行依赖、manifest、资源和许可文件均与根目录一致。

## 已通过的定向链

| 宿主 | 证据 |
| --- | --- |
| 数组键保留 | 8 次未保存 Hover，reverse／slice／chunk 的键域及条件合同匹配，磁盘不变 |
| 调用绑定与继承 | 10 次未保存补全；Intl、DOM、SimpleXML 子类及按值构造正确，实际引用构造撤回；磁盘不变 |
| Trait final 崩溃恢复 | 服务器 PID 6708 → 20744；未保存 final alias 限制在重启后保留，随后删除 final 恢复构造候选；父／子磁盘保持原样 |

三个实际 Windows 编辑器与原生 Node 包装器均退出 0，proof 明确 platform=win32。Core 设置为 PHP 8.5／onDemand，并隔离用户数据与扩展目录；包装进程为原生 Windows Node v24.16.0。

## 当前完整 C2

复用 `nativeWindowsC2.ts` 与完整当前 `c2.ts`，复制同一 baseline，清除全部 C2 子集和 Pack 环境开关；现运行完整 Core-only／PHP 8.5／onDemand 编辑反馈链。当前原生宿主已退出 0，取得 fullC2 proof 与 65 条 C2 流程证明。20 项 Core 与副本逐项一致，86 项源码／baseline 输入终态无变更。

包装器 `check-native-windows-host.mjs` 新增三种内部 proof 路由与平台／次数／磁盘／重启 PID 断言，ESLint 和 node --check 通过。它是验收工具变化，产品运行资产保持不变。前一批完整协议 501 的冻结在该工具改动前已正确终态释放；不把验收工具的后续改动倒算为当时冻结期间漂移。

日志：`/tmp/sophp-stubs-current-windows-{arrayKeys,stubsFlow,traitFinal,c2}.log`；Core 输入清单 `/tmp/sophp-stubs-current-windows-inputs.json`；完整 C2 源码／baseline 86 项另有输入记录。原始 proof 与哈希见同名 JSON。

范围为源码隔离宿主的 API 查询、编辑、接受文本与恢复行为。此证据不是所有可见列表逐项 DOM 验收、用户真人 WSL、完整外部 Pack 或全版本 Windows CLI 行为。当前 Windows Core 完整 C2 已通过；整体路线图及真人 WSL 仍继续。

完整 C2 的 Extension Host Node v24.21.0、包装进程 v24.16.0，当前 Windows VS Code 原生运行。源码和编译套件哈希分别记录，编译套件及包装器归档至 /tmp，临时开发 Core 不写入扩展安装目录。
