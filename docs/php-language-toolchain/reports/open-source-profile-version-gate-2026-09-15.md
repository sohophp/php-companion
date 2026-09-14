# Open Source Profile 版本与 Provider 组合门禁

日期：2026-09-15。候选基线：VS Code 1.137.0、PHP Companion 0.4.5。自动化入口为 `pnpm install:open-source-profile` 与 `pnpm test:extension:open-source-profile`。

## 变更

`test/extension/open-source-profile.extensions.json` 现在是第三方组合的唯一机器可读版本清单。安装脚本在全新扩展目录逐项安装精确 Marketplace 版本，再核对 `--list-extensions --show-versions`，并拒绝出现 Intelephense。源码 manifest 测试和最终 VSIX 检查从同一清单生成默认 Pack 成员，避免文档、测试与产物各自维护列表。

CI 新增 Linux、Windows 与 macOS 三个 Open Source Profile 任务。每个平台都安装 PHP 8.5、PHPUnit 9.6.36、PHP CS Fixer 3.95.22 和冻结的外部扩展，再运行同一主 VSIX 的完整编辑器组合测试。它覆盖 PHP/Twig/YAML/XML/JSON 的提供者边界、PHP 格式化与 Undo、PHPUnit、Xdebug、声明级 F2、Safe Move 及既有精准语义断言。

首次跨平台运行同时暴露了两个门禁实现问题。Marketplace 在 Linux/macOS 安装途中返回临时 503；安装器现只对 429、5xx 和明确网络中断执行最多五次有界重试。Windows 的合成 fixture 没有 `vendor/`，不再把 Symfony 源索引 ready 当作通过条件；组合矩阵验证插件激活、运行时关闭及 Provider 共存，依赖完整的真实项目 ready 仍由 Winstar 专项证据负责。

移除 Symfony 后的 Ubuntu 门禁还暴露 PHPUnit 扩展把配置值作为 PHP 脚本路径调用，而 setup-php 提供的是 PATH 命令名。测试运行器现在先用 `which`/`where.exe` 解析固定版本命令的绝对入口，再在隔离 Profile 中生成 PHP 代理脚本，由同一个 PHP 8.5 可执行文件加载并用逐参数 shell 转义转发；测试进程启动与哨兵结果使用 30 秒窗口。

同一次运行还复现 Windows/macOS 文件操作完成后 Language Server 状态传播较慢：旧实现第一次三轮短重试失败时已经删除 Safe Move 计划。协调任务现在成功前保留源文件快照和已生成的精确计划，事件和文件观察器复用同一个约 20 秒的有界重试。后续 Linux 组合门禁又证明 `onWillRenameFiles` 中启动完整索引可能超过 VS Code 文件事务窗口，而且该参与者报错并不保证 VS Code 取消文件移动；will 阶段因此冻结源文件、检查未保存内容，并只尝试复用已经完成的索引。索引未就绪时，完整语义计划在移动后从冻结快照生成；若重试后仍无法形成计划，扩展会在绕过自身处理器的受控事务中把文件移回原路径。Language Server 在短期窗口内重复识别已规划移动的旧、新路径，对监控事件执行精确增量更新；快速反向移动拥有独立计划，旧方向验证发现目标已经反向恢复时立即让出串行队列。计划一旦形成，则继续以 namespace、引用、保存和最终空计划断言完成协调。

## Symfony 版本结论

本轮先以 Symfony Language Tools 0.20.2 执行完整组合。普通 alias Rename 的预期拒绝之后，接口声明 `ExportContract` 的 F2 Rename 返回 `The element can't be renamed.`，使整项 VS Code Rename 失败。该版本的客户端以 `file/php` DocumentSelector 注册 Rename，扩展设置中没有关闭该 Provider 的选项；VS Code 会聚合同分值提供者，因此 PHP Companion 无法用更具体的选择器可靠取得独占权。

把唯一变量改为 Symfony Language Tools 0.20.1 后，相同主 VSIX、项目工具链和完整测试曾在本地以退出码 0 完成；但随后冻结 0.20.1 的 Ubuntu CI 仍在普通 PHP 声明 F2 上返回相同错误。这说明冲突具有环境或时序相关性，单次通过不足以支持首发。版本注册表保留该候选及拒绝状态，受支持 Profile 只安装其余七项：

| 扩展 | 验证版本 | 默认 Pack |
| --- | --- | --- |
| TwigPlus | 1.3.7 | 是 |
| Symfony Language Tools | 0.20.1 | 否，受支持 Profile 也明确拒绝 |
| Red Hat YAML | 1.24.0 | 是 |
| Red Hat XML | 0.29.3 | 是 |
| PHP Debug | 1.40.1 | 是 |
| PHPUnit & Pest Test Explorer | 3.9.40 | 是 |
| PHP CS Fixer | 0.3.21 | 是 |
| EditorConfig | 0.18.2 | 是 |

VS Code 的 `extensionPack` 只能声明 ID，不能固定成员版本，而 0.20.1 与 0.20.2 都不能稳定共存。因此两个 Pack 和受支持 Profile 均移除该 ID；安装器还会拒绝隔离目录中出现任何版本的 Symfony Language Tools。上游提供可关闭的 Rename Provider 或稳定修复后，必须先修改清单并通过三平台组合门禁，才能恢复推荐安装。

## 本地证据

- `pnpm typecheck` 与 `pnpm lint` 通过。
- 十六个组件 624 项测试通过；组合包 manifest 的 3 项聚焦测试通过。
- 诊断阶段的全新隔离目录精确列出八个目标扩展，没有 Intelephense；修正 Safe Move 时序后的纯净打包 Extension Host 与该诊断 Profile 均以退出码 0 完成。随后 CI 复现 Symfony 0.20.1 冲突，最终受支持 Profile 收缩为七项外部扩展。
- 本地测试使用 Winstar 的 `bin/php-runtime`、项目 PHP CS Fixer 包装器和 PHPUnit 9.6.36。该证据来自 WSL2/Linux Extension Host，不冒充 Windows 客户端连接 WSL Remote 的独立验收。

## 跨平台证据

提交 `4cd7530` 的 [CI 34894351400](https://github.com/sohophp/php-companion/actions/runs/34894351400) 共 18 个任务全部成功。Linux、Windows 与 macOS 均通过 Quality、打包 Extension Host 和安装七个冻结第三方扩展的完整 Open Source Profile；PHP 7.2–8.5 八个运行时集成任务也全部通过。该结果关闭本报告的冻结版本与 Provider 组合自动门禁。

## 边界

三平台 CI 只关闭冻结第三方组合在各宿主系统上的自动门禁。Windows 客户端连接 WSL Remote、依赖完整的大型项目多小时会话、Marketplace 发布后的干净安装和人工 UI 检查仍须单独完成。公开 npm 与 VS Code Marketplace 发布未执行。
