# P8 Symfony / Doctrine / Twig 协作完成审计

日期：2026-09-23

## 完成范围

P8 以静态、可证明的框架事实为边界完成本地开发与可安装交付。PHP Companion Core 负责 PHP 语义和版本化互操作契约；独立 SoPHP Symfony 扩展负责服务、事件、路由与 Controller 上下文；TwigPlus 继续唯一负责 Twig parser、作用域、语言服务器和 formatter。

公开 Marketplace 发布与真实 WSL Profile 的持续人工试用属于单独发布/Alpha 验收，不在本次自动化完成声明内。

## 要求与证据

| P8 要求 | 当前证据 |
| --- | --- |
| 独立 Symfony VSIX | `sohophp.php-companion-symfony` 可独立打包，依赖 Core，通过 plugin API v1 原子注册/撤销服务、事件、静态路由、Controller 上下文和可选 Winstar 路由 Provider。两个 Pack 均显式安装它。 |
| Symfony 静态分析 | YAML、XML、PHP Configurator、编译容器、环境分支、Bundle 导入、服务/参数/事件/路由的既有 Definition、References、Completion 与受限 Rename 由独立扩展提供；动态或不完整配置保持 unknown。 |
| Doctrine 常用类型 | Entity、四类关联、Repository 泛型、查询对象默认水合、自定义 Repository、精确项目 QueryBuilder 工厂均已接入。数组、标量与单标量终端增加稳定宽类型，不猜测 DQL 字段名。 |
| Twig 互操作 | interop v1 提供 Controller 上下文、公开成员、来源和失效；TwigPlus 合并多 Controller 上下文，并提供成员补全、Definition 与受限跨语言 Rename。 |
| 所有权 | Core-only Profile 不注册 Symfony 编辑器能力；PHP Companion 不复制 Twig parser/server/formatter，YAML/XML 通用能力仍由专门扩展负责。 |

## 本轮补齐的 Doctrine 终端

- `getArrayResult()`：`array<int, array<array-key, mixed>>`
- `getScalarResult()`：`array<int, array<string, mixed>>`
- `getSingleScalarResult()`：`bool|float|int|string|null`

Winstar `src` 当前有 54 处 `getArrayResult()`、2 处 `getScalarResult()` 和 11 处 `getSingleScalarResult()`。这些类型覆盖部分选择、多根和标量选择可证明的容器边界；字段键、具体标量类型和混合对象/标量行保持 unknown。

项目事实升级至 schema 7，缓存封装升级至 schema 12/v64。旧 v63/schema 11 记录会安全重建。

## 当前验证

- PHP Companion `pnpm check` 完整通过：Framework Symfony 53 项、四个 Symfony Provider 共 14 项、Framework Doctrine 6 项、Semantic 300 项、Language Server 261 项通过且 1 项跳过、独立 Symfony 扩展 4 项、仓库根 46 项；四份 VSIX 均完成内容校验。
- TwigPlus 当前工作树构建通过；`languageServerIntegration.test.ts` 14 项通过，包含 Controller 上下文合并、PHP 来源导航及跨 PHP/Twig Rename。
- TwigPlus 1.3.7 完成真实 VSIX 打包。
- VS Code 1.138.0 隔离 Profile 同时加载打包后的 Core、SoPHP Symfony 与 TwigPlus 1.3.7，Extension Host 退出码为 0。

## 保守边界

- 不执行 Symfony Kernel、项目 PHP、项目 autoloader、Doctrine ORM 或数据库连接。
- 动态 Configurator 条件、动态服务图、不能证明完整的事件构造、动态 DQL 字段和一般自定义查询返回保持 unknown。
- 运行时 Provider 不完整、冲突或失败时，不把缺失事实解释成“项目没有该关系”。

Doctrine 终端功能提交为 `6b8e50a`，P8 完成提交为 `9d0c8952662a37bff62f98add6896135f1a6847a`。最终候选位于 `artifacts/php-companion-alpha-0.4.5-9d0c8952/`：

| 产物 | SHA-256 |
| --- | --- |
| Core | `a0c52873247510fba124438da42886cfd928b0a8b51d8b4bdce43d4f4fb55ad4` |
| Symfony | `3a3d9d2274a77d934ddefd3e6a5ec0e4f6ce75bf0323471c387a6868df84277b` |
| Open Source Pack | `4c56beb320ed0c375c28376799b14c6f7b6db75c18cbf37d8a817e2c296efee6` |
| Recommended Pack | `28868cd071b49d236df8c4a4b3e5cf8193bb98dff8b61cbfdccc480c115d41c3` |

候选目录内 `SHA256SUMS` 全部通过。Winstar 使用 PHP 8.5 包装器、CoreRepo 使用 PHP 7.2 包装器的 WSL 确定性预检均绑定上述完整提交并无错误。现有 `81580890` 人工试用候选未被覆盖。
