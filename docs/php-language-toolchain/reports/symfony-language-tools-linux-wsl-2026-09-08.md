# Symfony Language Tools 组合核验（Linux / WSL）

日期：2026-09-08
VS Code：1.136.1 Linux x64，运行于 Windows WSL RockyLinux 8
目标项目运行时：Winstar `bin/php-runtime`，PHP 8.5
Symfony Language Tools：0.19.0，Marketplace `linux-x64`

## 包与许可核验

Marketplace Gallery 返回的 Linux x64 资产 SHA-256 为：

```text
c33255ed325c1ff869925d174d7c07dbbf25dc2c8ed70ca139d3c89874d41844
```

下载后的 VSIX 校验值与 Gallery 元数据一致。包内 manifest 为 `Symfony.language-tools` 0.19.0，VS Code 门槛 `^1.91.0`；包内 `LICENSE.txt` 为 MIT。VSIX 包含 Linux x64 原生 `server/symfony-lsp`。早先无平台参数取得的是 `linux-arm64` 资产，因架构不符未计入通过证据。

## 默认边界

两个 PHP Companion Pack 均安装该插件，并写入以下默认值：

```json
{
  "symfonyLsp.runtimeIndexing": false,
  "symfonyLsp.releaseMetadata": false
}
```

该配置保留 Symfony Language Tools 的静态源码索引，默认不启动项目内核读取运行时容器，也不请求 Symfony 版本元数据。通用 PHP 语义仍归 PHP Companion；通用 Twig 解析、变量、导航与格式化仍归 TwigPlus；YAML 基础能力归 Red Hat YAML。

## Extension Host 结果

把 0.19.0 Linux x64 VSIX 与已验证的开源 Profile 放入隔离扩展目录，再运行打包版 PHP Companion 的完整 Extension Host 门禁。门禁明确断言：

- `symfony.language-tools` 已安装并可实际激活。
- `runtimeIndexing` 与 `releaseMetadata` 的有效配置均为 `false`。
- 不存在 Intelephense 或其他通用 PHP Language Server。
- PHP Companion 的诊断、补全、导航、重构、代码操作及 Undo/Redo 完整用例继续通过。
- TwigPlus 仍返回 Twig 格式化编辑；Red Hat YAML 和 VS Code 内建 JSON formatter 继续工作。
- PHP CS Fixer 经 Winstar PHP 8.5 包装器应用编辑并可单步撤销；EditorConfig、Xdebug launch 与项目 PHPUnit 执行继续通过。

执行入口：

```bash
PHP_COMPANION_TEST_EXTENSIONS_DIR=/path/to/isolated/extensions \
PHP_COMPANION_FORMATTER_EXECUTABLE=/path/to/project/.vscode/php-cs-fixer-project \
PHP_COMPANION_PHP_EXECUTABLE=/path/to/project/bin/php-runtime \
PHP_COMPANION_PHPUNIT_EXECUTABLE=/path/to/project/vendor/bin/phpunit \
xvfb-run -a node ./dist-test/runPackagedTest.js
```

结果为退出码 0。PHPUnit 扩展仍会在测试快速重命名后删除临时文件时记录已知 `ENOENT` 监听告警，未导致用例或 Extension Host 失败。

本报告只证明 Linux x64 / WSL 组合。Windows x64、macOS x64/arm64 与 Linux arm64 需要在 R4 平台矩阵分别安装对应 Marketplace 资产后复测。

## 追加审计：应用发现与静态能力边界

原组合 fixture 只声明 PHP 依赖，插件激活不能证明 Symfony 应用已经被发现。现已在隔离副本中加入 `symfony/framework-bundle` 声明、不会启动业务内核的 `bin/console` 哨兵、YAML 路由与 PHP Attribute 路由；在全部 Companion 用例之前激活 Symfony，并等待索引状态报告当前项目 `source.state=ready` 和 `runtimeEnabled=false`。

实际发现：0.19.0 在这个静态配置下没有提供路由名称补全。对照官方同版本源码，`RouteCompletionHandler` 读取运行时 `RouteIndexRegistry`，而 `RouteDefinitionHandler` 使用源码 `RouteDeclarationIndexRegistry`，两者不是同一索引。因此，本报告的激活、静态索引就绪和导航证据不能扩展成“完整 Symfony 路由补全已可用”。该缺口保留为未完成项：后续须实现精准静态补全，或另行验证用户显式启用的运行时模式，不能以测试删去补全断言关闭缺口。

源码依据：[RouteCompletionHandler](https://github.com/symfony/language-tools/blob/v0.19.0/src/Feature/Route/RouteCompletionHandler.php)、[RouteIndex](https://github.com/symfony/language-tools/blob/v0.19.0/src/Feature/Route/RouteIndex.php)、[RouteDefinitionHandler](https://github.com/symfony/language-tools/blob/v0.19.0/src/Feature/Route/RouteDefinitionHandler.php)。

加强后的组合门禁于本轮通过（退出码 0）：先确认真实 Symfony 项目的静态索引完成，再从 `generateUrl()` 字符串精确跳转到同文件第 5 行的 PHP Route Attribute，随后完成全部 Companion 和外部工具用例。这里验证的是源码导航；路由补全仍未通过。

补充日志边界：除 PHPUnit 的 `ENOENT` 外，宿主退出时还记录了两个测试临时文件的 `File Modified Since` 保存告警。退出码 0 不代表日志没有异常；这些临时文件的清理与退出保存行为需继续审计。

## 自研 YAML 补全接管验证

后续本地 VSIX 已提供静态 YAML 路由名称补全。增强后的组合 Extension Host 退出码 0：Symfony 插件继续负责已验证的 Attribute 路由导航；PHP Companion 在已解析到 Symfony AbstractController 方法的调用中，返回唯一 `profile_route_home` 候选及 `/profile/home (source declaration)` 来源说明。fixture 中包含隔离的框架方法声明，用于验证语义归属，不冒充已安装完整 Symfony 运行时。

支持常规 YAML 入口和显式 YAML 导入（名称/路径前缀）、未保存 YAML、重复候选消歧；尚不涵盖 Attribute 路由名称补全、环境/通配/本地化配置及运行时能力切换。源码包测试 10 项、LS 测试 51 项和打包组合宿主通过。已知 PHPUnit 临时文件监听及退出保存告警仍存在。

## 具名参数与字符串转义：更新产物

主扩展已重新打包，SHA-256：`79c31dc7e5f91af7c3e0d57570f9333aa531f3653ddedfa08ca5efbcf6308ed1`。

完整 Open Source Profile Extension Host 退出码 0。PHP YAML 路由测试现在使用 `generateUrl(parameters: [], route: 'profile_route_home')`，精确候选断言通过；Attribute 导航和其他编辑用例仍通过。框架组件 12 项、语言服务器 51 项回归通过，相关 ESLint、TypeScript、VSIX 内容校验及差异检查通过。已知外部插件日志告警沿用前述记录。

## 路由提供者切换：真实编辑器验收

主扩展 VSIX SHA-256：`0ca8a1c2540aec7d2fb1d00590c55cfedcd996946ea74fbdd79ba0f8f0cc9ca2`。

完整 Open Source Profile Extension Host 退出码 0：先验证静态 YAML 路由候选，再把隔离 workspace 的 `symfonyLsp.runtimeIndexing` 改为 true，等待 Symfony 状态确认该配置，并断言 Companion 的 source-declaration 候选不再出现；此时 PHP `generateUrl()` 方法导航仍准确指向声明。finally 恢复 false 后，同一查询恢复唯一静态候选，随后完整编辑器用例通过。

测试显式指定 PHP wrapper，只操作自动生成的临时 fixture，其 `bin/console` 是拒绝启动业务内核的哨兵。该证据证明客户端配置传递和提供者所有权切换，不证明 Symfony 运行时索引成功，也不证明外部运行时补全的完整性。打包、TypeScript、相关 ESLint、VSIX 内容校验和差异检查通过；此前已知的 PHPUnit 文件监听/退出保存告警仍存在。

## Attribute 显式文件导入补全验收

新增主扩展 VSIX SHA-256：`058d0025654fda88ce367f237d8a0fbd532a5a79f98ebcf5ec6c9d793d6dab8d`。

完整组合 Extension Host 退出码 0。fixture 的 YAML 显式导入 `ProfileRoute.php`（`type: attribute`），补全查询精确返回两个来源声明候选：YAML 的 `profile_route_home` 和 Attribute 的 `profile_route_attribute`，并检查各自 path。此前的提供者切换、普通 PHP 导航和完整编辑器用例继续通过。

框架组件 15 项、语言服务器 51 项测试通过；TypeScript、相关 ESLint、打包与 VSIX 内容检查通过。类级前缀和 invokable fallback 按 [Symfony 7.4 AttributeClassLoader](https://github.com/symfony/routing/blob/7.4/Loader/AttributeClassLoader.php) 对照实现。范围限于显式命名、明确 PHP 文件导入；目录/glob、自动命名、继承与环境/本地化仍是开放事项。

## 目录排除与配置变更失败审计

主扩展 VSIX SHA-256：`f7a8855cabc39a1fa148e7d306cc1cf7bdb57afd79e92c54ec050a1022ffeea8`。目录导入与排除候选断言通过，但首轮及复查均在连续修改 Symfony PHP 命令和 runtime indexing 时失败，不能记录为完整组合通过。

复查保留的 Symfony Language Tools 0.19.0 日志确认原生服务器退出码 1，报告 `Event loop terminated without resuming the current suspension`，栈涉及 Revolt DriverSuspension / Amp LocalSemaphore；随后出现 EPIPE 或销毁流错误。保留日志目录为 `/tmp/php-route-exclude-vscode-logs`，宿主输出为 `/tmp/php-route-exclude-host-recheck.log`。这些临时日志不是长期发布产物。

fixture 现将 PHP 命令在扩展启动前写入配置，切换测试只修改 runtime indexing，避免把两个配置变化混在一个断言里；测试运行器可通过 `PHP_COMPANION_TEST_LOG_DIR` 保留宿主日志。连续配置变更场景保持开放缺陷，尚不能断言其确切触发条件或已修复。

预先配置 PHP 命令、只切换 runtime indexing 的复测完整通过（退出码 0）：目录导入排除 `ExcludedRoute.php` 后保持精确两项候选，提供者停止/恢复及完整编辑器用例通过。对应主扩展仍为上述 `f7a8855c…2ffeea8`，改动在 fixture/测试运行器。框架 16 项、LS 51 项、相关 TypeScript/ESLint/VSIX/差异检查通过。连续配置变更失败摘录已持久化至 [错误日志](symfony-config-change-failure-2026-09-08.log)，该缺陷仍待独立定位。

## 2026-09-09 静态路由支持域收口

后续实现补齐 Attribute 目录与 glob 导入、exclude、映射 namespace、受 Symfony 默认命名策略约束的隐式名称、未保存 YAML、具名参数和 PHP 字符串转义。自研服务器只在调用目标可证明属于 Symfony 路由 API 且外部运行时提供者未接管时返回源码候选；环境、本地化、参数化或无法完整解释的加载配置保持 unknown。

框架组件 20 项、Language Server 98 项及完整 `pnpm check` 通过。重新打包的完整 Open Source Profile Extension Host 在 VS Code 1.136.2 / Linux x64 WSL 中通过，并验证静态候选、Symfony Attribute 导航及运行时提供者切换。宿主关闭期间仍可观察到 Symfony Language Tools 0.19.0 的 `ERR_STREAM_DESTROYED`，但功能断言和宿主均以退出码 0 完成；该上游日志行为没有被记为修复。最新产物与完整命令见 [首发候选收口验证](release-candidate-linux-wsl-2026-09-09.md)。
