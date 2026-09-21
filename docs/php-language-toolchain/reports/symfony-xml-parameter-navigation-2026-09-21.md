# Symfony XML 参数导航与重命名验收（2026-09-21）

## 结论

独立 `sohophp.php-companion-symfony` 扩展已把 Symfony XML 静态参数纳入现有参数身份图。YAML 与 XML 的 Definition、References、Completion 和 F2 Rename 共用唯一声明与完整扫描门禁，可从任一格式的声明或占位符发起跨格式操作。

Provider 只发布参数 ID、URI 与源码范围，不读取或序列化 `<parameter>` 的值。PHP Configurator 参数尚未纳入本轮范围。

## 精准支持范围

- 声明：单一顶层 `<container>` 直属 `<parameters>` 中的 `<parameter key="parameter.id">`。
- 引用：结构有效 XML 的原始文本或属性值中的 `%parameter.id%`。
- Completion：完整或正在输入的 `%parameter.id`，只替换 ID 范围。
- Rename：声明唯一、目标无冲突且全部权威 YAML/XML 文件均可读取时，一次编辑声明和所有跨格式引用。
- 拒绝：DOCTYPE、`<when>`、损坏 XML、XML Entity 编码值、CDATA、注释、处理指令、`%%escaped%%`、`%env(...)%`、非法名称、重复声明和不完整配置扫描。

## 自动验证

- framework-symfony：47 项通过，覆盖声明范围、文本/属性引用、补全范围以及全部负例。
- provider-symfony-services：2 项通过，确认 XML 声明仅以身份和位置发布。
- Language Server 定向 stdio 集成：通过；覆盖 YAML → XML References/Rename 和 XML Definition/Completion/Rename。
- Language Server 完整回归：198 项通过。
- php-companion-symfony：4 项通过。
- 全仓 TypeScript：通过。
- ESLint：通过。
- `pnpm test:extension:packaged`：VS Code 1.138.0 隔离 Profile 加载实际核心与 Symfony VSIX，验证 YAML/XML 跨格式引用、补全、Definition 和标准 F2 WorkspaceEdit；Extension Host 状态码 0。
- Winstar 当前 `config/` 没有静态 XML 参数样本，因此本轮没有宣称真实项目 XML 参数人工验收；YAML 真实样本和标准 XML 固件分别承担项目相关性与协议行为证据。

## Alpha 候选

- 功能提交：`ff4bdf815fc833f806a83d180d65c9de8687c6ef`。
- 候选目录：`artifacts/php-companion-alpha-0.4.5-ff4bdf81/`。
- `SHA256SUMS`、Winstar PHP 8.5 WSL preflight 和 CoreRepo PHP 7.2 WSL preflight：通过。

候选 SHA-256：

- Core：`303a45cc4133851199c64733fb97eb85d4a0e85191f021c68d237e0446dbc3b3`
- Symfony：`e688ed9890ca21bb21a6ee8a880cf0189b05f1f0412cabc20f84f69033128662`
- Open Source Pack：`3269317901ae7fb2a8219f804e9122259532daa94a330bfadc8647b7d97e9064`
- Recommended Pack：`83ae76e6b8b1db8feb786dfbb81090490f947b2b3eb57f99074897d0b8f3ef41`

实际 WSL Remote Extension Host 归属、竞争 PHP Provider 禁用状态和持续两小时编辑仍属于人工 Alpha 验收项。
