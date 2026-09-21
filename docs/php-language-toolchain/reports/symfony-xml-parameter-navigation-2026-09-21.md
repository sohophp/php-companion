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

提交与候选 SHA-256 将在干净提交生成 Alpha 候选后追加。
