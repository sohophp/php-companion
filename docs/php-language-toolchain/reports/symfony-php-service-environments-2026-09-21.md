# Symfony PHP Configurator 环境专属服务配置验收（2026-09-21）

## 结论

独立 `sohophp.php-companion-symfony` 扩展现已按每个工作区根的 `phpCompanion.symfony.environment` 选择 PHP Configurator 服务配置。Provider 合并闭包中的无条件语句与精确匹配的顶层 `$container->env()` 分支，并把当前环境内的服务、别名、参数和引用纳入 Definition、References、Completion 与原子 Rename。

同一服务或参数 ID 在基础配置与当前环境中重复声明时，环境声明覆盖基础声明并保留真实源码范围。运行中切换环境会刷新容器与事件事实，同时改变 PHP 配置编辑请求使用的活动视图，无需 Reload Window。

## 精准边界

- 语法依据来自项目安装的 Symfony 7.4 `PhpFileLoader` 与 `ContainerConfigurator::env()` 实现。
- 只接受配置闭包顶层的直接 `if ($container->env() === 'dev') { ... }` 和字面量在左侧的等价严格比较。
- 未设置环境时只读取无条件语句；设置环境后只合并环境名完全匹配的分支。
- 未选择或非活动环境中的声明和引用不会进入导航、补全或 Rename 编辑。
- `else`、`elseif`、复合条件、嵌套条件、动态环境名、非严格比较或无法证明的容器变量使该 PHP 配置保持不完整，不发布编辑事实。
- PHP 数组返回式 `when@env` 使用另一种 AST 结构，留作后续独立实现；本轮不把它误当成 Configurator 闭包。

## 自动证据

- framework-symfony：51 项通过。
- provider-symfony-services：5 项通过。
- Language Server：198 项通过。
- php-companion-symfony：4 项通过。
- 根扩展：45 项通过。
- 全仓 `pnpm test`：组件 767 项，连同独立 Symfony 扩展与根扩展共 816 项，全部通过。
- TypeScript 与 ESLint：通过。
- `pnpm verify:packages`：24 个组件 tarball 在隔离消费者中通过。
- 定向 stdio 覆盖 dev 环境排除 prod PHP 引用、运行时 dev → prod 后激活同一引用并成功 Definition。
- `pnpm test:extension:packaged`：VS Code 1.138.0 隔离加载最终 Core 与 Symfony 两份实际 VSIX，Extension Host 以状态码 0 退出。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL preflight：通过。

本轮正向语义证据来自项目实际安装的 Symfony 7.4 源码、固定解析样本、真实 stdio 环境切换和打包 Extension Host；不据此声称已完成真实 WSL Remote 持续编辑验收。

## Alpha 候选

- 功能提交：`685de866b5090f427a20757d35482999b59f1239`。
- 候选目录：`artifacts/php-companion-alpha-0.4.5-685de866/`。
- 校验记录：[Winstar PHP 8.5](alpha-preflight-winstar-symfony-php-service-environments.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-symfony-php-service-environments.json)。

候选 SHA-256：

- Core：`d4e97285e07dc3b52b999c7860672cbd4664c824af9152f7831be824bb004396`
- Symfony：`275557b71315c252139b476ba494ee63ce14ff928a9b3d6f2a919c9a55bfdd49`
- Open Source Pack：`ec2114d015e1a0959f0365007f5e02771b2e9a1913e40c5a84f9e9f3993d0798`
- Recommended Pack：`b94d6d723d1314c8f5899b1559014e375b3738b8340a100f9e5a0b51b84746f5`

实际 WSL Remote Extension Host 归属、竞争 PHP Provider 禁用状态和持续两小时真实编辑仍属于人工 Alpha 验收项。
