# Symfony Autowire 服务引用与重命名验收

日期：2026-09-21

## 结果

独立 `PHP Companion: Symfony` 扩展现在把项目 PHP 中可证明属于 Symfony 的 `#[Autowire(service: '...')]` 字面量纳入权威服务 ID 编辑图。从 Attribute 服务 ID 可以执行 Definition、References、Completion 和标准 F2 Rename；从 YAML、XML 或 PHP Configurator 发起的服务 Rename 也会更新全部对应 Attribute。

一次安全 Rename 覆盖唯一显式注册、YAML `@service`、传统 XML 服务属性、PHP Configurator 服务引用及项目 PHP Attribute，并作为一个 `WorkspaceEdit` 返回。配置图、项目源码扫描或目标注册任一不完整时，整个 Rename 拒绝返回，避免把漏改包装成成功。

项目 Attribute 候选按需扫描 Composer 项目源码，不扫描依赖；扫描受现有文件数、单文件大小和总字节预算限制，可取消，并复用 `source-candidates-v1` 摘要缓存，只读取可能含有 `Autowire` 的文件。结果按项目修改 epoch 缓存，普通启动和 Reload Window 不会因为该能力主动触发全量 `Indexing PHP symbols`。

## 精度边界

识别范围包括 Symfony `Autowire` 的完整限定名、精确 import 和 import alias，以及 Attribute 自身命名空间中的短名。注释、普通字符串、无关的同名 Attribute、错误 import、多 namespace 下无法唯一绑定的短名、动态表达式、跨行或含转义引号的值均不产生服务引用。服务 ID 源码必须与容器目录中的 ID 完全一致；需要解码或推测的值不进入编辑图。

真实 Winstar 源码中当前有 24 处 `service:` Attribute：23 处引用 `monolog.logger.legacy`，1 处引用 `translator.default`。这些位置作为真实 WSL Alpha 的人工 Definition、References 与 F2 验收样本；本轮实现没有修改 Winstar 文件。

## 自动验证

- `@php-companion/framework-symfony` 45 项通过，覆盖完整限定名、import alias、原始反斜杠、注释/字符串伪装、无关同名 Attribute、非法转义及非 BMP 字符前缀后的 UTF-16 编辑范围。
- Language Server 198 项通过；stdio 覆盖 Attribute 到 YAML Definition、四格式 References、Completion，以及从配置和 Attribute 两个入口生成五处原子 Rename。
- 全仓 26 个测试组共 806 项通过。
- TypeScript 与 ESLint 通过。
- VS Code 打包 Extension Host 覆盖普通业务 PHP Attribute 的 Definition、References、Completion、标准 F2 Rename，以及 YAML/XML/PHP/Attribute 五处编辑的一次 Apply 和单步 Undo。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 候选预检通过，见 [Winstar JSON](alpha-preflight-winstar-autowire-service-references.json) 与 [CoreRepo JSON](alpha-preflight-corerepo-autowire-service-references.json)。

## Alpha 候选

功能提交为 `2dbd300`，候选目录为 `artifacts/php-companion-alpha-0.4.5-2dbd300f/`。目录内 `SHA256SUMS` 五项通过：

| 文件 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `bae735e244c297b2f8ed39b092842312c5ad4ad5ac0e98f14957cbc5424baea8` |
| `php-companion-symfony-0.4.5.vsix` | `93c641af36d871713171c5d63713ff03a215b8049e12b7e8acb5cb10f3a58bba` |
| `php-companion-open-source-pack-0.4.5.vsix` | `ea2299f87fa49f8c35fb07f04488f1df193fa626d0ca40de80207c6a83c929f3` |
| `php-companion-recommended-pack-0.4.5.vsix` | `1edde04a5e142ce5ecc7cdff557cd184c80aa259044cee63a57041bd606fec73` |
| `twig-plus-1.3.7-496f514.vsix` | `0162f5151972faee4a68f57a2d49bd749d743a0f70211422eec6302a99c7ae05` |

自动测试不替代 Windows 客户端连接 WSL Remote 的持续真实编辑验收。实际 Profile 仍应验证首次查询耗时、缓存后的重复查询、Cancel、Reload Window 后不出现无终点索引，以及上述两个真实服务 ID 的结果完整性。
