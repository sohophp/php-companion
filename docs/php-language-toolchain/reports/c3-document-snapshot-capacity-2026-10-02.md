# C3 有界文档快照数量修复

日期：2026-10-02。当前主产品源码与 Symfony 源码 bundle 已更新；没有生成 VSIX。

## 原始失败与根因

完整 C3 原始组合在相同 bundle 上重现未保存事件 dispatch References 缺席：测量有 133 个打开的 PHP／YAML／XML 文档，共 32,605 字符。服务器 `semanticProviderDocuments` 与 Provider 协议都把数量限制为 128，因此撤回整组容器／事件事实；不是 8 Mi 字符容量不足。

基线会话 68811 退出码 1，日志 `/tmp/sophp-c3-snapshot-measured-baseline.log`；六项 baseline bundle／宿主输入终态一致。单独协议用例也证实 131／512 份输入丢失引用：1 通过、2 失败；契约容量正例 129／512 失败。此前两种关闭编辑器的清理方法仍作为历史失败保留，本次直接修复数量合同，没有删减完整 C3 断言。

## 修改

`@php-companion/semantic-provider` 导出 `SEMANTIC_PROVIDER_DOCUMENT_LIMITS`。完整服务／事件快照、局部控制器快照和独立进程请求校验统一使用 512 份的数量上限，单文档 1,000,000 字符、总计 8 Mi 字符保持原值。超限返回不完整结果并撤回事实，不截断文档或回退旧事实。Provider 仍读取包含无类型声明的未保存 PHP 文件。

协议版本与请求字段保持一致；新接受范围是旧范围的扩展，独立 Provider 与 Core 应按现有同版本组合使用。框架配置通知与路由 Provider 的独立容量没有调整。

## 当前验证

| 检查 | 结果 |
| --- | --- |
| 契约全量 | 14/14，128／129／512 正例，513／单文档／总容量超限反例 |
| Provider 与进程宿主全量 | 宿主 10/10、服务 14/14、事件 5/5、控制器上下文 12/12，共 41 项 |
| 定向真实 stdio | 8 通过、421 跳过，总 429，29.61 秒；包含 2／131／512 份打开文档的新未保存 dispatch、513 份撤回及关闭至 512 后恢复，现有事件模式和框架快照预热 |
| 完整 C3 编辑器组合 | 修正实际 Symfony 构建后，会话 5946 退出码 0；相同 133 份／32,605 字符输入，未保存 dispatch 引用与 Undo 后撤回通过，全部既有 C3 断言通过 |
| 构建与静态检查 | 契约和服务器构建、Core 与 Symfony bundle、定向 ESLint、相关路径 diff --check 通过 |

日志 `/tmp/sophp-snapshot-capacity-{contract-final,provider-tests,stdio-final,build,lint}.log` 与 `/tmp/sophp-c3-snapshot-capacity-final-host.log`。冻结三十七项产品与宿主输入：`/tmp/sophp-snapshot-capacity-product-inputs.sha256`。

本批没有重跑完整 429 项 stdio 或重跑全部语义包；语义逻辑未修改，前批 R39 989/989 是该前批结果。真实 WSL、其它平台与长期使用仍单列，不将本项结果记作整条路线图完成。未打包、提交、推送或更新 Profile。

首次修复验证使用了旧 Symfony bundle：`pnpm --filter @php-companion/php-companion-symfony build` 未匹配任何项目但返回 0。保留的 `/tmp/extension-failure-EoNL6I` 语言服务器日志明确记录 Provider 拒绝协议请求。实际包名是 `php-companion-symfony`；正确构建后直接执行服务／事件／控制器 CLI 的九项容量探针，129／512 均通过请求校验，513 均退出码 2 拒绝。这些探针只证明 CLI 请求校验，不证明事实提取。日志 `/tmp/sophp-snapshot-capacity-symfony-bundle-final.log` 与 `/tmp/sophp-snapshot-capacity-bundled-cli.json`。原三十七项冻结输入保留为 `before-symfony-inputs`，正确构建后重新冻结；实际新组合 5946 退出码 0，三十七项终态输入全部一致；不能把前两次旧组合或未匹配项目算作有效构建。

## 修正组合终态

`/tmp/sophp-c3-snapshot-capacity-corrected-host.log` 记录完整 C3 退出码 0，原来失败的事件 References 以及后续 Create PHP Type 的活动 Composer 项目回退均通过。`/tmp/sophp-snapshot-capacity-final-inputs.log` 的三十七项输入全部一致。原快照数量阻塞在当前 Core／Symfony 源码组合下已解决；容量外、真实 WSL 与整条路线图仍按各自范围验收。
