# Symfony PHP Configurator 环境分支链

日期：2026-09-23

## 范围

`framework-symfony` 现在可静态选择完整 PHP Configurator `if / elseif / else` 环境分支链。条件必须是 `$container->env() === 'literal'` 或字面量在左侧的等价写法；显式 `phpCompanion.symfony.environment` 命中第一个分支时只合并该分支，未命中时只合并 `else`。未选择环境时仍只保留分支外的通用配置。

活动分支中的相同精确环境判断可以继续嵌套。选出的服务、导入、参数声明、`service()` 和 `param()` 引用复用同一活动语句视图，因此独立 Symfony Provider、跨 YAML/XML/PHP Definition、References、Completion 和 Rename 不会看到非活动分支。

## 安全边界

- 任一 `if` 或 `elseif` 不是精确环境全等比较时，整份 Configurator 图标记为不完整，不发布部分服务或参数事实。
- 不推断 `!==`、布尔组合、动态环境名、业务函数条件、循环或 `switch`。
- 未选择环境时不把 `else` 当成默认配置；它只在调用方明确给出且没有分支匹配的环境时生效。
- Winstar 当前项目与 Symfony vendor 配置没有该分支链的真实样本；本轮证据来自解析器、Provider 图和后续打包门禁，不能代替用户项目样本。

## 验证

- `framework-symfony` 53 项通过，覆盖无环境、`dev`、`prod`、未匹配环境、嵌套精确分支、活动导入、服务/参数引用以及动态 `elseif` 拒绝。
- `provider-symfony-services` 6 项通过，覆盖完整项目配置图中的 `dev`、`prod`、fallback 和无环境视图；独立 Symfony 扩展 4 项通过。
- `pnpm check` 完整通过；其中 Semantic 300 项、Language Server 261 项通过且 1 项跳过、仓库根测试 46 项通过。
- Core、Symfony、Open Source Pack 和 Recommended Pack 四份 0.4.5 VSIX 均完成打包并通过内容校验。
- `pnpm test:extension:packaged` 在隔离 VS Code 1.138.0 Profile 中加载打包后的 Core 与 Symfony 扩展，并以退出码 0 完成。

功能提交为 `19fe83a360b914be18d55029b06568e0cd893906`。新候选位于 `artifacts/php-companion-alpha-0.4.5-19fe83a3/`，现有 `81580890` 人工试用候选未被覆盖。四份 `SHA256SUMS` 全部通过：

- Core：`6a2d0be931d91911364b373a9ba3ca00e487fa379d023e9e78acf90a5d60a1e5`
- Symfony：`16d3c891136dc7661e42a185752bcfe9f1e5d88561651bd0579e89d268a972c2`
- Open Source Pack：`1e4d81d91dc9f2781c38afd2e7a0e53bc2faf496c826e9f9865a2bfd2bd83687`
- Recommended Pack：`8c46c6937f492409c0ea2b978db7aec196f34116ce7d405295f596170ee8c58c`

Winstar 的 WSL/PHP 8.5 与 CoreRepo 的 WSL/PHP 7.2 确定性 `alpha:preflight` 均通过。实际 Remote Extension Host 归属、竞争 PHP Provider 状态和持续编辑仍由人工试用确认。
