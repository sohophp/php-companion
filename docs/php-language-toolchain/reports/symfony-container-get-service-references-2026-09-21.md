# Symfony 容器 `get()` 服务引用验收

日期：2026-09-21

## 结论

Symfony 能力继续由 monorepo 内可独立安装和发布的 `sohophp.php-companion-symfony` VSIX 拥有。核心 Language Server 只提供通用 PHP 解析、类型解析、索引和编辑计划；独立 Symfony 扩展提供权威服务目录及编辑器 Provider。两者通过 plugin API v1 协作，不重复 TwigPlus、YAML 或 XML 的通用语言能力。

权威服务 ID 现在可在语义证明属于以下方法的单个未命名字符串参数中使用 Definition、References、Completion 和原子 Rename：

- `Psr\Container\ContainerInterface::get()`
- `Symfony\Component\DependencyInjection\ContainerInterface::get()`

普通业务对象的同名 `get()`、动态接收者、具名或展开参数、多个参数、转义字符串及无法唯一解析的方法保持无结果。References 和 Rename 只在有界项目扫描完整时返回，避免把部分结果当作完整结果。

## 自动验证

- semantic：275 项全部通过；新增用例同时验证 PSR 容器命中、普通业务 `get()` 排除和转义字符串排除。
- Language Server：198 项全部通过；端到端用例覆盖 YAML/XML/PHP Configurator、`#[Autowire]`、容器 `get()` 的五处引用、Definition、Completion 和六处原子 Rename，并确认业务 `get()` 不进入结果。
- TypeScript 全仓构建与类型检查通过。
- ESLint 全仓检查通过。
- 功能提交：`462b3d4`。
- Alpha 候选：`artifacts/php-companion-alpha-0.4.5-462b3d46/`；四份 VSIX 内容和 SHA-256 通过，Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL preflight 通过。Extension Host 归属、竞争 Provider 禁用状态和两小时真实编辑仍须在 VS Code Alpha Profile 中人工确认。
- VS Code 1.138.0 隔离打包双扩展宿主随后加入真实 `ContainerInterface::get()` fixture，验证服务 Definition、References、Completion、从 YAML/Attribute/容器字面量发起的 F2 Rename、单步 Undo，以及普通业务 `get()` 反例；Extension Host 以状态码 0 退出。

真实 Winstar 只读搜索发现大量 Request、Session、配置、AWS Result 等对象的字面量 `get()`，但 `src/` 当前没有 PSR/Symfony ContainerInterface 接收者。这组代码作为重要负样本：新能力不会仅凭方法名和字符串内容把它们误识别为 Symfony 服务引用。

## 交付边界和时间估算

独立 Symfony VSIX、服务/路由/事件/Controller Provider、双扩展打包结构及 Open Source Pack 集成已经存在，本项不是从零拆分插件。

按当前范围和单一持续开发流估算：

- 可安装 Alpha：已经具备；本增量完成候选打包后即可继续 WSL 实测。
- Symfony 日常核心工作流收口：还需约 5–8 个工作日，重点是 WSL Remote 持续编辑验收、真实项目问题修复、服务/路由/事件导航的剩余高频边界和发布说明。
- PHP Companion Beta 级完整主路径：还需约 4–6 周，包含剩余 PHP/PHPDoc 类型精度、重构范围和跨平台长期会话门禁。
- 接近 PhpStorm 的既定体验目标：还需约 8–12 周完成当前路线图和最终资格验收；低频动态框架行为、插件生态长尾及后续新 PHP/Symfony 版本仍会持续维护。

估算不包含 Marketplace 审核等待，也不把无法静态证明的运行时魔法计为必须猜测支持的功能。
