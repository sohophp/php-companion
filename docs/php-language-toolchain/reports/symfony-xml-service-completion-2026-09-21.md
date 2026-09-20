# Symfony XML 服务 ID 补全

日期：2026-09-21。范围：独立容器 Provider 已确认配置图内的传统 `services.xml` 服务引用属性。

## 行为

- `type="service"`/`type="service_closure"` 的 argument、property、bind，以及 alias、parent、decorates、factory/configurator 的服务属性，按光标前缀补全唯一权威服务 ID。
- 空的成对引号可请求完整目录；超过 200 项时返回 incomplete 列表继续收窄。
- 编辑只替换属性值，保留属性名、引号和外围 XML。
- 声明 `id`、普通标量、参数表达式、编码实体、DOCTYPE、环境 `<when>`、损坏 XML、普通业务 XML 和歧义注册不产生候选。
- Red Hat XML 继续负责通用 XML Schema、语法补全和格式化；PHP Companion 只补充 Symfony 服务语义。

## 验证

- framework-symfony 44 项测试通过，包括部分前缀、空值、精确替换范围和拒绝边界。
- Language Server 198 项通过；stdio 回归证明 XML 前缀只返回权威唯一服务，声明 ID 返回空列表。
- 全仓 24 个组件共 755 项、独立 Symfony 扩展 3 项、根扩展 44 项，共 802 项通过；TypeScript 与 ESLint 通过。
- 24 个隔离消费 tarball 通过；VS Code 1.138.0 开发和打包 Extension Host 验证 XML 候选及属性值替换范围，退出码均为 0。

## 候选

功能提交为 `bc5014bf31fd06768cf0601ad3b5c0dd6a0196eb`。私有候选位于 `artifacts/php-companion-alpha-0.4.5-bc5014bf/`；四份 VSIX 内容、`SHA256SUMS`、Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL 预检通过。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `2ccdffc5c15d2d026289316dbc3df00d8876759c9332024d840c665b9867dd4b` |
| `php-companion-symfony-0.4.5.vsix` | `3348da69a97c073bb7154d8db83443e42c2c1a5c36301411660fbbe2488c206f` |
| `php-companion-open-source-pack-0.4.5.vsix` | `04edf93f12becd49daf92d6827a7e74bf7bfd0647e25fb7e33a4e174dcbda1a6` |
| `php-companion-recommended-pack-0.4.5.vsix` | `06ead2538c0b77debfc941cfa22841c103489c62fb8001a0b15983389c4b1971` |

严格编辑器 Profile 检查和持续人工编辑仍须从 `PHP Companion Alpha` Profile 的 VS Code WSL 集成终端执行；确定性后台预检不替代该门禁。
