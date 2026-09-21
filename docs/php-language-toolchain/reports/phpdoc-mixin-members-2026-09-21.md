# PHPDoc mixin 精准成员验收

日期：2026-09-21。范围：自研 PHP 核心的类级 `@mixin`，不改变独立 Symfony 扩展的能力归属。

## 实现与边界

- PHPDoc parser 将类级 `@mixin Type` 解析为带 UTF-16 源码范围的类型标签；语义层仅接受单一名称类型，用所在 namespace 和 `use` 按普通 PHP 类名规则解析。
- 唯一已索引的 mixin 目标可提供公开实例方法和属性，成员保留真实声明的 URI、范围、签名与返回类型；代理类自身、继承和 Trait 成员覆盖同名 mixin 成员。
- 同一代理的两个 mixin 提供同名成员时，整项不推断；缺失或重复目标、静态与非公开成员、自身关系和有界循环不产生代理结果。不会把 mixin 当作实际继承或改变 PHP 运行时类型关系。
- 关系进入 schema 78 的声明记录及类型依赖图；损坏、越界或未知 owner 的 mixin 缓存拒绝恢复。Language Server 缓存版本升至 v59，旧缓存经源码重新构建，开放文档继续覆盖磁盘缓存。

## 验证

- 定向正反样例覆盖成员补全、真实成员覆盖、Signature Help、链式返回、Definition、同名冲突、缺失/循环与声明优先热恢复；PHPDoc 14 项和 semantic 276 项通过。
- `pnpm typecheck && pnpm lint`、`pnpm test` 通过；24 个组件 771 项、独立 Symfony 扩展 4 项、根扩展 45 项，共 820 项。
- `pnpm verify:packages`：24 个组件 tarball 在仓库外隔离消费通过。
- `pnpm candidate:alpha`：四份 VSIX 内容与 SHA-256 校验通过；`pnpm test:extension:packaged` 在 VS Code 1.138.0 隔离 Profile 中以退出码 0 完成。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性 WSL preflight 均通过；两者均记录 VS Code WSL Extension Host 归属、竞争 PHP Provider 和持续两小时真实编辑为人工待验收项。

功能提交 `9a6ec12a5d0c1f8a2719e9b28329865945ef0241`。候选目录：`artifacts/php-companion-alpha-0.4.5-9a6ec12a/`。主扩展 SHA-256 为 `d913597634df6826b4c5970e84fce280b2cacd88e9a91f029fb73dc5c090b2fb`；独立 Symfony 扩展为 `8de11e61eb349bda847e24aa818ca2e610aeb0bef29b280a403963ede947ef84`；Open Source Pack 为 `3e30b3803635d5c236b7ab0629d27bfaea496bb59408206e1d026e2445b026b0`；Recommended Pack 为 `4b0394a68d12775fdc74cd17d1757d920f7c953b778b1c74322e16fed96ac43f`。

校验记录：[Winstar PHP 8.5](alpha-preflight-winstar-mixin.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-mixin.json)。这轮没有从 Alpha Profile 内执行持续 WSL 编辑；该项不计入自动门禁通过范围。
