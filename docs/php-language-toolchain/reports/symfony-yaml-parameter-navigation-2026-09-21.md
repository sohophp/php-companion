# Symfony YAML 参数导航与重命名验收（2026-09-21）

## 结论

独立 `sohophp.php-companion-symfony` 扩展已为权威 Symfony 配置图中的静态 YAML 参数提供 Definition、References、Completion 和 F2 Rename。能力由 Symfony 扩展发布参数身份，PHP 核心只消费名称与源码范围；参数值不会进入 Provider 协议。

当前范围限定为顶层 YAML `parameters` 声明及标量值中的精确 `%parameter.id%` 占位符。XML 参数和 PHP Configurator 参数留待后续增量，因此本次不宣称跨格式参数支持。

## 精准边界

- Definition 仅在参数有且只有一个声明时跳转。
- References 只扫描独立 Provider 确认的权威 YAML 配置图，可选择包含声明。
- Completion 仅列出唯一声明的参数，并只替换 `%` 之间的 ID 范围。
- Rename 从声明或占位符均可发起；只有声明唯一、目标名称合法且无冲突、全部配置文件可读且所有原始文本仍匹配时，才返回包含声明和全部引用的一次原子 WorkspaceEdit。
- 损坏 YAML、非法名称、重复声明、不可读或超限文件、`%%escaped%%`、`%env(...)%`、需要 YAML 解码的字符串及动态表达式均保持无结果，避免部分引用或部分重命名。

## 验证证据

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- framework-symfony：46 项通过。
- semantic-provider：8 项通过。
- provider-symfony-services：2 项通过。
- php-companion-symfony：4 项通过。
- Language Server：198 项通过；stdio 集成覆盖声明和引用起点的 Definition、References、Completion 与双位置 Rename。
- `pnpm test:extension:packaged`：VS Code 1.138.0 在隔离 Profile 中安装实际核心与 Symfony VSIX，验证参数 Definition、References、Completion 和标准 F2 的两处原子编辑；Extension Host 状态码 0。
- Winstar 只读样本：`config/` 中存在 3 个顶层 `parameters` 区块及 5 个不同的静态 `%parameter.id%` 占位符，可供后续 WSL 人工验收。检查只统计参数身份，没有输出参数值。

## 后续范围

下一步按相同隐私和完整性门禁加入 XML 参数声明/引用，再评估 PHP Configurator 的静态 `parameters()->set()` 与 `param()` 子集。跨格式 Rename 只有在所有格式都能完整扫描后才会开放。
