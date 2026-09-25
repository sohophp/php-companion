# Symfony 通配路由导入的预算完整性

日期：2026-09-26。范围为独立 Symfony 静态路由 Provider 与临时 Composer 项目；未修改业务项目，未打包 VSIX。

`config/routes.yaml` 通过通配模式导入 Controller 文件时，扫描预算可能在目录遍历中耗尽。之前该分支虽把输入证据标为不完整，却可能继续把只读到一部分文件的路由表标为 `complete: true`。这会让上层把遗漏的路由误认为不存在。

新增两份带 Route Attribute 的 Controller 夹具，并用五个扫描条目的预算复现：旧实现只返回一条路由，`inputEvidenceComplete: false`，但 `complete: true`。现在预算耗尽的目录分支同时标记路由表不完整。定向测试先失败后通过；Provider 全部 10 项测试、TypeScript 构建、相关 ESLint 与 `git diff --check` 通过。

此修复使截断的路由图不能作为完整事实发布，不提高现有预算。大项目的完整覆盖和真实安装环境仍须按 F09/C4 门槛另行验证。

随后检查输入证据到路由事实的最终返回值，发现另一个反例：约定的 `config/bundles.php` 路径存在但无法作为文件读取时，Provider 已把 `inputEvidenceComplete` 标为 `false`，仍可能返回 `complete: true`。新增独立 Composer 夹具先复现该状态；现在最终路由表只有在扫描本身与输入证据都完整时才标为完整。Provider 全部 11 项测试、构建及 ESLint 通过。既有 Language Server 对不完整路由贡献返回空结果的门禁继续适用；本项没有把部分路由发布为权威补全。

再沿真实 Language Server 查询检查缓存：选择 `cacheUntilInvalidated` 的 Provider 首次返回不完整路由图时，旧代码仍缓存该结果。独立 stdio 夹具先证明下一次查询在 Provider 恢复后继续得到空补全；现在只缓存 `complete: true` 的路由贡献。定向真实 stdio 同时通过“不完整后恢复”和“完整快照复用到 watcher 失效”两种场景，Language Server 构建通过。未改变完整快照的现有缓存协议。

最后复核正常规模：通配导入的每个匹配文件原来在目录遍历和实际读取时各扣一次扫描预算。把独立 Composer 夹具从 40 个 Controller 扩到 130 个后，默认 256 项预算下旧实现错误地标为不完整；现在遍历已计数的文件在读取时不再重复计数，130 个 Controller 的路由图完整且既有路由仍正确。两文件夹具的边界也分别验证：预算 4 项时仍明确不完整，预算 5 项时恰好完整。预算上限未提高，Provider 全部 11 项测试、构建、ESLint 与差异检查通过。

重建后的 Provider 再经真实 stdio 的 Symfony 路由验收、导入子文件 Controller 导航及两种缓存回归共 4 项通过；这一步验证路由事实进入 Language Server 后仍可用于已有补全与导航。完整 VS Code 安装候选和 Remote 场景仍待 C4。

最后重建 SoPHP Symfony 与 Core 的源码 bundle，在 VS Code 1.139.0 Linux x64 隔离环境运行当前 10 项 Open Source Pack 的完整 C3 宿主：PHP `routes.php` 类别名与方法 Definition、YAML Controller 来源边界及后续编辑链均通过，Extension Host 退出码 0；日志 `/tmp/sophp-c3-symfony-route-budget-pack10-20260926.log`。这仍是源码组合验证，不代表现有已安装 0.4.5 VSIX 或真实 WSL Remote 已更新。

继续以独立 Composer 项目量化默认预算：`config/routes.yaml` 通配导入 500 个 Controller 文件，首尾文件各有一个 Route Attribute。旧的 256 项上限使快照不完整，末尾路由无法作为权威结果使用；改为 1024 项后，三条路由均出现且快照完整。该定向测试的 Provider 测试阶段约 1.7 秒，低于 Symfony 静态路由 Provider 当前 30 秒超时；这只是本机样本耗时，不能推断大型真实项目的延迟。显式 `maxEntries` 仍可设置更小的预算，预算耗尽仍标记为不完整。Provider 11 项测试、构建、相关 ESLint 和差异检查通过。下一步在候选冻结时观察真实项目规模、超时与响应大小，再决定是否需要可配置预算；不为此重复打包 VSIX。
