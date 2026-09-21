# Symfony YAML 环境专属服务配置验收（2026-09-21）

## 结论

独立 `sohophp.php-companion-symfony` 扩展现已按工作区配置 `phpCompanion.symfony.environment` 选择 Symfony YAML 服务配置。Provider 合并无条件配置与精确匹配的 `when@<environment>`，并把选中环境内的 import、service、alias、parameter 和引用纳入 Definition、References、Completion 与原子 Rename。

环境配置在运行中改变时，Language Server 会清除对应工作区根的容器与事件事实并重新请求 Provider，无需 Reload Window。多根工作区按最具体的所属根选择环境，父工作区不会继承嵌套子工作区的设置。

## 精准边界

- 未设置环境时只读取无条件 YAML 区块，避免猜测 `dev` 或执行项目代码。
- 已设置环境时只合并完全匹配的 `when@<environment>`；其它环境的服务、参数和引用不会进入结果或 Rename 编辑。
- 同一 ID 在基础区块和当前环境区块重复声明时，当前环境声明覆盖基础声明，并保留真实源码位置。
- 当前环境区块损坏或无法完整解析时拒绝发布完整事实，避免把漏报解释为没有引用。
- 显式非 `dev` 环境不会复用 `var/cache/dev/*DebugContainer.xml`，防止静态配置与错误环境的编译容器混合。
- 本轮只覆盖 YAML `when@env`。XML `<when env="…">`、PHP Configurator 的环境条件和动态 `%env(...)%` 值仍保持 unknown，等待真实样本后实现。

## 自动证据

- framework-symfony：49 项通过。
- provider-symfony-services：3 项通过。
- semantic-provider：8 项通过。
- semantic-provider-host：5 项通过。
- Language Server：198 项通过。
- php-companion-symfony：4 项通过。
- 根扩展：45 项通过。
- 全仓 `pnpm test`、TypeScript 与 ESLint：通过。
- `pnpm verify:packages`：24 个组件 tarball 在隔离消费者中通过，共 763 项组件测试；连同独立 Symfony 扩展和根扩展共 812 项。
- 定向 stdio 覆盖 `dev`/`prod` Provider 入参、非活动环境引用排除、运行时环境切换后的补全刷新，以及切回原环境恢复。
- `pnpm test:extension:packaged`：VS Code 1.138.0 隔离加载 Core 与 Symfony 两份实际 VSIX，Extension Host 以状态码 0 退出。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL preflight：通过。

真实 Winstar 当前没有服务容器 YAML `when@env` 正样本，因此本轮正向语义证据来自 Symfony 官方语法固定样本、真实 stdio Provider 环境切换及打包 Extension Host；Winstar 仍提供真实大型工作区的启动与兼容性证据。

## Alpha 候选

- 功能提交：`76aaebc96586d3bf218ba4d33eec5f640a4131bc`。
- 候选目录：`artifacts/php-companion-alpha-0.4.5-76aaebc9/`。
- 校验记录：[Winstar PHP 8.5](alpha-preflight-winstar-symfony-service-environments.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-symfony-service-environments.json)。

候选 SHA-256：

- Core：`0756bf62bc1ff550af20dd139b5a6acabaa50329e35c0124d6bcef3e35be9f8e`
- Symfony：`1c9d3e36c2747b8e18bf520c267026d6e8c62eecb7a33c5e1882800f67a260a0`
- Open Source Pack：`77d5b56ab7945a079cefeebbb3ee68377cfc49e18c78f8886056b090f85d99a0`
- Recommended Pack：`aa4e9cadc1a60a698f86d4d8884feca724670ff805301f8cb569c04b9e7477b6`

实际 WSL Remote Extension Host 归属、竞争 PHP Provider 禁用状态和持续两小时真实编辑仍属于人工 Alpha 验收项。
