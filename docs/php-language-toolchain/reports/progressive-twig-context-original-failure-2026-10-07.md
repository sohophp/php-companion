# D257：progressive 模式 Twig 上下文原始失败

日期：2026-10-07；源码 `4c324d0c`，Core `a8b50922`。本批只运行独立复现，未修改产品；[原始机器记录](progressive-twig-context-original-failure-2026-10-07.json)保存脚本、结果及摘要。

## 复现

完整 D256 终态审计结束后，使用独立 Composer 项目及实际 `provider-symfony-controller-contexts` CLI，不使用模拟上下文或业务项目。PHP 目标 8.5；每模式启动一个全新服务器。断言唯一模板 `page.html.twig`、根变量 `user` 的 `App\User` 类型及导出的 `getName` 方法；progressive/experimental 在后台索引结束后再查询一次，关闭模式要求 null。

| 模式 | 首次查询 | 后台索引完成后 |
| --- | --- | --- |
| onDemand | 精确断言通过 | 无后台索引，不计 |
| progressive | **返回 null，失败** | **仍为 null，失败** |
| experimental | 精确断言通过 | 精确断言通过 |
| off | null 控制通过 | 不计 |

原运行 11.72 秒退出 1，六项检查中只有 progressive 两项失败；六个冻结输入保持，stderr 为空。处理器 `packages/language-server/src/server.ts:5173` 只分派 experimental/onDemand，progressive 直接走 false 分支，构成明确的模式遗漏。完整回归未覆盖此缺口，D256 的 1313 项通过不能解释为该功能可用。

## 后续与边界

下一步让 progressive 使用有界且可取消的上下文准备路径，保留唯一 Symfony Provider 与 TwigPlus 所有权，不强制完整依赖索引。需要永久协议回归覆盖首次/索引结束后的查询、未保存 Controller 与类型编辑、关闭恢复、watcher 失效和取消，防止旧上下文或部分编辑被误当正确结果。源码观察还提示 indexRoot 清理与 sourceReadyTask 的边界需要检查，目前未证明该边界存在运行时竞争，不预先宣称其根因或修复。

当前产品未变，D256 的完整 LSP 资格仍绑定原 Core；修复后须为新构建分别取得相应证据。TwigPlus 既有四份未提交修改保留。真实 WSL、完整 TwigPlus 组合、性能/规模/长期与全部 C1–C4／R4 范围保持，Goal active；未打包、更新 Profile、推送或发布。
