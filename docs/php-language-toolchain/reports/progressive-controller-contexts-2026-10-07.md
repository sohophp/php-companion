# D258：渐进模式 Controller 上下文

日期：2026-10-07；基础提交 `4c324d0c` 加本地源码修改，正常构建 Core 为 `0680ad5a`。完整摘要、原始结果位置与归档哈希见[机器记录](progressive-controller-contexts-2026-10-07.json)。

## 修复

[D257 原始失败](progressive-twig-context-original-failure-2026-10-07.md)确认 progressive 首次及索引完成后均返回 null。永久回归先在原 Core 上取得 PHP 7.2／8.5 两项 progressive 失败、两项 onDemand 通过。首次仅补模式分支仍为两项失败：后台准备启动独立全量 Provider 请求，会使前台有界扫描的 scoped 请求失效。该次诊断和原失败保留。

最终让渐进模式的后台准备与 Twig 请求共享已有 Controller 候选扫描；请求仍可单独取消，后台或其它等待者继续使用同一份任务。候选扫描仅包含项目源码、沿用既有资源限制，不强制完整 vendor 索引。索引收尾不再清除渐进模式扫描发布的上下文；这项顺序保护不单独宣称已复现缓存提交时的清除竞争。onDemand、experimental、off 的原路径保持。唯一实际 Symfony Provider 和 TwigPlus 的所有权保持，新增 language-server patch changeset。

## 验证

| 范围 | 最终结果 |
| --- | --- |
| 三份永久协议文件 | 50／50，175.98 秒退出 0；42 个原并发／关闭案例全部保留，新增 8 项，收集身份与执行一致；原期限保持 |
| 实际 Symfony Provider | 目标 PHP 7.2／8.5、onDemand／progressive：首次查询、后台结束、未保存 Controller 修改、类型成员更新、关闭恢复、watcher 修改／删除／重建通过 |
| 并发取消 | 两个目标版本分别取消一个／全部前台等待者，后台准备继续；重试和后台结束后查询通过，只执行一次实际 Provider，进度 begin／end 各一次 |
| 原独立四模式探针 | 原脚本未改，六项精确断言全部通过，11.00 秒退出 0；progressive 首次及索引完成后均有正确模板、变量类型与方法 |
| 普通完整 C1 宿主 | 123.72 秒退出 0；可见本地／跨 namespace／vendor 补全、未保存接收者切换及 Composer 版本生命周期通过；意外关闭／重启失败／待完成版本刷新均为零 |
| 静态检查 | 正常 language-server 编译、正式 esbuild、包 typecheck、两文件 ESLint 和 diff 空白检查通过 |

最终协议、模式对照和 C1 各冻结 4918 个工程输入；源码／构建、HEAD／工作树、Node 和既有实际 CLI 二进制均保持。协议中的 PHP 版本是语义目标，不声称这八项测试分别执行 PHP CLI。C1 另使用实际 PHP 7.2.34 运行时。历史只读日志保留辅助脚本没有列入这 4918 个本轮预冻结输入，已在运行中及结束后分别与 D254 的冻结哈希核对一致；此边界保存在机器记录中。

首次共享扫描修订的 50 项通过另归档为诊断记录；最终收窄到只改变渐进模式清理后，重新取得上述独立冻结结果，不把两个构建拼接为一次验收。

## 继续范围

D256 的 98 文件／1313 项完整 LSP 仅属于旧 Core `a8b50922`，不能转移到 `0680ad5a`。本批关闭渐进模式 Controller 上下文的协议缺口和所列 C1 范围；未验证新构建完整 LSP、完整 TwigPlus 两仓／真实 VSIX 组合或真人 Ctrl+点击。TwigPlus 既有四份未提交修改保留。

下一批优先固定新构建的完整 LSP 组合，再继续 F10 的实际组合。真实大 Controller P95 173.01 ms 超过 150 ms、10k／50k 持久缓存 RSS、其余平台／版本、长会话和真实 WSL 验收继续开放。原 C1–C4／R4、P0–P9／F01–F14 与 Goal active 保持；未打包、更新 Profile、推送或发布。
