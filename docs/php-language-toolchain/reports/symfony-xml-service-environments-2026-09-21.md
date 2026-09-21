# Symfony XML 环境专属服务配置验收（2026-09-21）

## 结论

独立 `sohophp.php-companion-symfony` 扩展现已按每个工作区根的 `phpCompanion.symfony.environment` 选择 Symfony XML 服务配置。Provider 合并 `<container>` 下的无条件配置与精确匹配的 `<when env="environment">`，并把当前环境内的 imports、parameters、services 和引用纳入 Definition、References、Completion 与原子 Rename。

同一服务或参数 ID 在基础配置与当前环境中重复声明时，环境声明覆盖基础声明并保留真实源码范围。运行中切换环境会刷新容器与事件事实，同时改变 XML 编辑请求使用的活动视图，无需 Reload Window。

## 精准边界

- 语法依据来自项目安装的 Symfony 7.4 DependencyInjection 官方 `services-1.0.xsd`；`when` 只能是 `container` 的直接子元素，并可包含 imports、parameters 和 services。
- 未设置环境时只读取无条件配置，不推断 `dev`；设置环境后只合并 `env` 完全匹配的区块。
- 未选择环境、非活动环境中的声明和引用不会进入导航、补全或 Rename 编辑。
- 缺失、空白、参数化环境，嵌套 `when`、重复活动配置根、DOCTYPE、损坏 XML 或无法保持原始源码范围时拒绝发布事实。
- XML 范围扫描器现可识别 `<services/>` 等无属性自闭合元素，避免结构完整性检查漏掉空配置根。
- 本轮不解释动态 `%env(...)%` 参数值；PHP Configurator 的环境条件仍保持 unknown。

## 自动证据

- framework-symfony：50 项通过。
- provider-symfony-services：4 项通过。
- Language Server：198 项通过。
- php-companion-symfony：4 项通过。
- 根扩展：45 项通过。
- 全仓 `pnpm test`、TypeScript 与 ESLint：通过。
- `pnpm verify:packages`：24 个组件 tarball 在隔离消费者中通过；组件测试 765 项，连同独立 Symfony 扩展与根扩展共 814 项。
- 定向 stdio 覆盖 dev 环境排除 prod XML 引用、运行时 dev → prod 后激活同一引用并成功 Definition，以及切回 dev 后恢复原服务类型。
- `pnpm test:extension:packaged`：VS Code 1.138.0 隔离加载最终 Core 与 Symfony 两份实际 VSIX，Extension Host 以状态码 0 退出。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL preflight：通过。

真实 Winstar 当前没有服务 XML `<when env="…">` 正样本。正向语义证据来自项目实际安装的 Symfony 7.4 官方 XSD、固定解析样本、真实 stdio 环境切换和打包 Extension Host；不据此声称已完成真实项目人工 XML 操作验收。

## Alpha 候选

- 功能提交：`2f736dc7c0cc0516c06fee6e7ea7f8894ae26638`。
- 候选目录：`artifacts/php-companion-alpha-0.4.5-2f736dc7/`。
- 校验记录：[Winstar PHP 8.5](alpha-preflight-winstar-symfony-xml-service-environments.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-symfony-xml-service-environments.json)。

候选 SHA-256：

- Core：`e8ae73442a709cc9809aade9dca5fe206b7ee8dc73284a04f9e972085f6781a3`
- Symfony：`c4619b77805d5de17bdb7729dc49bb5e12560b71fdd83ba973a999ea368b52f2`
- Open Source Pack：`3ccb43997a04125b831092987ecbf01d503c102e00e8016ddf92fc04fab7b71c`
- Recommended Pack：`fd5d636b65474589799b1ac2c92d2021e0ca56502c1ab45e136ce320e0a7bf96`

实际 WSL Remote Extension Host 归属、竞争 PHP Provider 禁用状态和持续两小时真实编辑仍属于人工 Alpha 验收项。
