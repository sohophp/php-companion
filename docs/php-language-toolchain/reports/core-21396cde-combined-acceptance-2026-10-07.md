# D175–D180：当前 Core 组合验收与 C3 未通过边界

## 完整 LSP 与正常宿主

绑定源码 `21396cde16eb5a1557693e676385c2191aa0cd98`、正式 Core bundle `c2b9da31bee847a2651f8c28207a33af9d562699c5a7404c2e78b15159ca9c44`。原完整 LSP 进程自然结束，**98 文件／1294 项全部通过**，零失败、跳过及 TODO，耗时 **2165.162 秒**。原 D168 的 1286 项和预算保留，新增 8 项启动／声明事实关闭边界；4865 冻结输入、六个实际 PHP CLI、Node、HEAD／工作树和完整用例名称／数量均未变化。整轮期间没有其它构建、测试或编辑器宿主并行，未因观察超时重启。

同一 Core bundle 的 D174 Linux 正常完整 C1 已通过，零意外关闭／重启失败。可见列表的六样本及未保存切换观测仍按原记录报告，不称为可见等待 P95。D177 **原生 Windows 正常完整 C2 通过**，93.847 秒，VS Code 1.140.0、宿主 Node v24.21.0，PHP 8.5／onDemand；21 资源、83 baseline 输入和正式完整套件保持，生命周期观察值全零。双路径十轮未保存编辑通过；其 Hover P95 13 ms 只属于该十轮专项。

完整数量、运行命令、实际 CLI 身份、输入审计及原始文件摘要见[机器记录](core-21396cde-combined-acceptance-2026-10-07.json)。没有把旧 Windows 资格直接转移到当前源码。

## Symfony 产物刷新

随后以模块正常 `esbuild.mjs --production` 配置进行只写独立目录的源码比对：扩展入口、Winstar Provider 和两份 WASM 一致；服务、事件、Controller 上下文、静态路由四个 Provider 与源码不一致。旧八份产物和第一次比对均保留，之后正常构建只改变这四个产物，Core bundle 和其它原冻结输入不变。

四个 Provider 的**完整单元文件共 45 项通过**。原 `stdio.test.ts` 的跨进程持久引用用例使用新打包 Provider，**1 项通过／约 105.772 秒**，原 120 秒门槛保持；533 项被名称过滤，不计作再次全量通过。D175 的 1294 项整轮绑定刷新前的 Provider，不能把该整轮重新标成刷新后的结果；更新产物的受影响协议另有本项证据。

归档脚本首次在构建前因未创建 owned 子目录退出，原脚本、日志和记录保留；未发生构建或测试。修正目录准备后执行上述正常构建与验证。

## D179 Windows 完整 C3：首次未通过

D179 用当前 Core 与源码一致的 Symfony 运行原完整 `nativeWindowsC3.ts`，PHP 8.5／experimental，未启用子集或诊断修改，原 300 秒期限保持。**198.055 秒退出 1**，失败为 `Missing cross-namespace Implement 1 interface method Action`，位置在 `c3.ts` 的 crossCases 检查。

此前日志中的新建文件 Redo 兜底、导入、提取／内联、多文件参数及重命名保护通过项只作为过程证据；整轮 C3 未通过。后续跨命名空间签名、默认值、Symfony 事件引用和第二 Composer 根的末尾流程未完成。原失败日志及当前所有源码／产物身份保留；未重跑整套挑选绿色。

原宿主日志显示契约文件已完成增量更新。五份相同源码的纯语义控制能生成正确的 fully qualified `accept` 方法及层级；这只缩小排查范围，**尚未证明协议／宿主失败根因或修复**。下一步用相同最小 fixture 比较 Linux／原生 Windows 协议及 checked generation refresh。

## D184：修正验收前提后的完整 C3

定向纯语义控制和相同五源码的 Linux 两组／原生 Windows 四组协议控制都能取得生成建议，含 VS Code 盘符 URI 和启动后新增文件。第一次 Linux 探针未传打包服务器所需的 WASM 参数，在初始化前失败；原输出保留，修正后控制通过。它不属于产品失败或编辑器资格。

源码核对确认，中间件会把 generation 的原始 `CodeAction.edit` 转为 `phpCompanion.applyPreviewedExtract`，强制安全预览；旧 crossCases／defaults 块仍筛选 `edit`，因此误报建议缺失。只修正这两段测试：必须使用预览命令、不能带可绕过预览的原始 edit，新增五组取消后源码不变和命令应用断言，保留精确签名及单次 Undo/Redo。生产源码及正式 Core bundle 未修改，TypeScript 检查通过。

随后原完整 Windows C3 **199.868 秒退出 0，审核通过**；PHP 8.5／experimental、原 300 秒门槛和全部其余流程保持，36 个 Core／Symfony 资源、83 baseline 输入及源码／运行时／工作树身份未变化。五组跨命名空间 interface、abstract、Override、DNF 和默认表达式操作均经安全预览取消／应用及原 Undo/Redo 验证。末尾 Symfony 未保存事件引用及 Undo、第二 Composer 根生成也完成；意外关闭、重启失败、待处理版本刷新均为零。D179 首次完整失败仍单独保留，不重标为通过。

## D185：九个实际 CLI 的语法文件资格

在独立测试目录获取 Remi 签名 RPM 并提取 PHP 7.3.33、8.0.30、8.3.35 的 CLI，校验签名、包／二进制摘要、实际版本／CLI／Linux 身份；未安装系统软件包、执行 RPM 安装脚本或修改用户工具路径。三份 wrapper 使用 `-n`，六份已有 `/opt/remi` CLI 保留正常 ini，区别逐项记录。

九个真实版本 7.2／7.3／7.4／8.0／8.1／8.2／8.3／8.4／8.5 运行原 `php-runtime-syntax.test.ts`，**10 项全部通过，零失败／跳过／TODO，17.727 秒**；输入、九份运行时及 HEAD／工作树保持。20 类语法边界各九版本共 180 次对照，另 27 次 void 缺少操作数及两次 PHP 8.5 正例，共 209 次实际 CLI `-l`。该资格只覆盖此冻结文件，不称为九版本全部语义、九份完整 LSP 或真人 WSL 通过；没有重新拼成 1297 项整轮报告。

## 继续范围

原 C1–C4／R4、当前普通编辑 P95、真实项目／长会话、50k 热缓存内存、裸 `$` 说明、外部 renderer 批量问题、剩余版本语义／macOS／Remote、完整框架／Twig／格式化／调试／测试组合和真实 WSL 仍开放。Windows 完整 C3 仅验证 PHP 8.5／experimental 的 Core＋Symfony 组合，不能替代 onDemand／progressive C3、Pack／Twig／格式化／调试／测试组合或其它系统。

Goal active。未打包、更新 Profile、推送或发布。
