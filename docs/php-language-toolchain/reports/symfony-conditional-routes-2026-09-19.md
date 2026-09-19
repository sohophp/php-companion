# Symfony 条件路由与显式环境证据

日期：2026-09-19

## 交付边界

- 新增 resource scope 设置 `phpCompanion.symfony.environment`，默认 `null`。只有用户给出合法环境身份时，静态路由图才选择匹配条件；不读取 dotenv、环境变量或运行时容器。
- framework-symfony 提取 `config/bundles.php` 中值为 `true` 的环境键，以及 Kernel 顶层单一 `$this->environment === 'literal'` 分支中的直接 Bundle yield 和路由 import。复合条件、嵌套环境条件、else/elseif 和动态值不产生条件事实。
- 服务 `@Bundle` 导入仍限全环境注册。环境专属 Bundle 只进入匹配环境的路由图，并继续要求唯一类路径、无自定义构造器/getPath 的标准继承链和 realpath containment。
- `symfonyLsp.runtimeIndexing=true` 且 Symfony Language Tools 可用时，外部 provider 继续独占该根的路由能力；环境字段不会重新启用 Companion 静态候选。

## 真实 Winstar 证据

只读分析 `src/Kernel.php` 得到一个 `dev` 专属 `WebProfilerBundle` 和一个 `dev` 专属 `config/symfony/routes/dev/web_profiler.yaml` import，同时保留无条件 `config/symfony/routes.yaml`。twig-plus metadata 的复合条件没有被误当成简单环境注册。

使用构建后的 Language Server 对 Winstar 根执行 onDemand stdio 补全探针：未选择环境时得到 3 个直接主路由且没有 profiler 路由；通知完整 provider 快照并选择 `dev` 后得到 17 个候选，其中新增 WebProfiler Bundle 的 14 个 PHP Configurator 路由。探针确认 `_wdt` 和 12 个 `_profiler*` 名称；另一个 `_wdt_stylesheet` 也计入总数。过程中不创建项目文件、不启动 Symfony Kernel、不执行 PHP 配置。

该探针同时发现并修复两个真实边界：大型主 Attribute 图会在条件 Kernel 根之前耗尽 64 个资源预算；onDemand 尚未建立索引时 Bundle 解析没有 Composer 映射。最终实现优先处理已选环境 Kernel 根，并在 Bundle 证明时按需读取 Composer PSR-4 元数据。

## 自动回归

- framework-symfony 覆盖通用/多环境 bundle map、简单 Kernel 环境条件、复杂条件反例和精确来源范围。
- Language Server stdio 覆盖空环境、`dev` 条件 Kernel import、`dev` Bundle PHP 路由、非法快照保持上一状态、切换 `prod` 撤回，以及外部 provider 抑制。
- 全仓 TypeScript 与 ESLint 通过；framework-symfony 35/35、semantic 268/268、Language Server 185/185、根扩展单元测试 39/39 通过。Language Server 最终复跑耗时 222.98 秒。
- 16 个组件 tarball 通过仓库外消费者安装/导入验证；核心、Open Source Pack、Recommended Pack 三份 VSIX 内容验证通过。
- 功能提交为 `a69e3d68f9498dbe93124be72ee8f4b46b020ad0`，候选目录为 `artifacts/php-companion-alpha-0.4.5-a69e3d68/`。三个 SHA-256 依次为 `cf41e025a1190d251204a4071920b39aae8ea9a623b352006c432ccfb1e852ab`、`ed0aee89b96662b48bce7d2be840e59464d74566d5972131fc3c3cef538e9cf4`、`40bcfa939d4ab4a46bac43d99d1575b2e82b1b17e9cf3cebb787078919a2acaa`。
- 核心 VSIX 已由 Remote CLI 完整安装到 WSL RockyLinux8。已安装 adapter/server 与候选分别以 `f3195f639ab9f0d1f801c151468099acac0e69185e5c70fa1e4a357d774b8381`、`939ea115e7a3ba190a4c6e2a67300794271468a4f595272d946d88e36d403511` 核对；installed manifest 含新环境设置。Reload Window 后生效。
- Winstar `bin/php-runtime` 8.5 和 CoreRepo `phpbin` 7.2 的只读确定性 Alpha 预检均通过。当前 shell 不是 VS Code 集成终端，因此 Extension Host 所有权、竞争 provider 禁用状态和两小时真实编辑会话仍是人工门槛。
