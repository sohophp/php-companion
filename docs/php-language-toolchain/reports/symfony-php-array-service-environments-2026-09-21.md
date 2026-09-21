# Symfony PHP 数组服务环境配置验收（2026-09-21）

## 结论

独立 `sohophp.php-companion-symfony` 扩展现可静态读取 Symfony `PhpFileLoader` 支持的 PHP 数组返回配置，不执行项目代码。Provider 合并无条件 `imports`、`parameters`、`services` 与精确匹配的 `when@environment`，并把当前环境中的服务、别名、参数和引用纳入 Definition、References、Completion 与原子 Rename。

同一服务或参数 ID 在基础配置与当前环境中重复声明时，环境声明覆盖基础声明并保留真实源码范围。运行时切换 `phpCompanion.symfony.environment` 会刷新 Provider 事实及 PHP 配置编辑视图，无需 Reload Window。

## 精准边界

- 实现依据为项目安装的 Symfony 7.4 `PhpFileLoader`：数组结果先通过 YAML loader 处理基础 `imports`、`parameters`、`services`，再处理当前环境的 `when@...`。
- 服务 ID 支持字符串或 `Class::class`；显式 class、别名、public、autowire、静态 import 和参数声明保留精确范围。
- 服务引用覆盖规范 `service()`、安全的 `'@service'`/`'@?service'` 字符串；参数引用覆盖规范 `param()` 与未转义 `%parameter.id%`。
- 未设置环境时只读取无条件配置；设置环境后只合并名称完全匹配的分支。非活动分支不会进入导航、补全或 Rename。
- 动态键、非数组 `when@...`、无法证明的 import、factory、parent、abstract/synthetic 或其他会使服务身份不确定的结构将整个配置标记为不完整，不发布部分编辑图。
- 未经转义的原始字符串才产生 YAML 风格引用范围；含 PHP 字符串转义、动态插值或无法保持源码字节范围的值不猜测。

## 自动证据

- framework-symfony：52 项通过。
- provider-symfony-services：6 项通过。
- Language Server：198 项通过。
- php-companion-symfony：4 项通过。
- 根扩展：45 项通过。
- 全仓 `pnpm test`：组件 769 项，连同独立 Symfony 扩展与根扩展共 818 项，全部通过。
- TypeScript 与 ESLint：通过。
- `pnpm verify:packages`：24 个组件 tarball 在隔离消费者中通过。
- Language Server 综合夹具改用 PHP 数组配置，验证跨 YAML/XML/PHP Definition、References、Completion、标准 F2/原子 Rename，以及 dev → prod 后激活 `when@prod` 引用。
- `pnpm test:extension:packaged`：VS Code 1.138.0 隔离加载最终 Core 与 Symfony 两份实际 VSIX，Extension Host 以状态码 0 退出。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL preflight：通过。

正向语义证据来自项目安装的 Symfony 7.4 源码、固定 AST 样本、真实 stdio 环境切换和打包 Extension Host；不据此声称已完成用户 Alpha Profile 的持续人工编辑验收。

## Alpha 候选

- 功能提交：`6fa3421cd57435d275ca899fc21f0a44452285ef`。
- 候选目录：`artifacts/php-companion-alpha-0.4.5-6fa3421c/`。
- 校验记录：[Winstar PHP 8.5](alpha-preflight-winstar-symfony-php-array-environments.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-symfony-php-array-environments.json)。

候选 SHA-256：

- Core：`759473656f1c670d0d6b12cfa9b8e9f8220d7b820236f57f00e718affe94dcc5`
- Symfony：`e9444e28d4a44703796d87b64d478ab7ab1401f9df0e9f5043abc62858c6e6b8`
- Open Source Pack：`8685a971ad35a2db529415be982e0d64277acd4ef8ca9dacc889dbeeafd45f22`
- Recommended Pack：`2f13687affc097c6b8ec47015b07f537e759ac12e217c722355289d41ea793b0`

实际 WSL Remote Extension Host 归属、竞争 PHP Provider 禁用状态和持续两小时真实编辑仍属于人工 Alpha 验收项。
