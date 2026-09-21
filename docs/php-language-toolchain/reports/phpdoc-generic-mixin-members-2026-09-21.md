# PHPDoc 泛型 mixin 精准成员验收

日期：2026-09-21。范围：PHP 核心的类级 `@mixin Target<Argument>`，不改变独立 Symfony 扩展的职责。

## 实现与边界

- 泛型 mixin 把类型实参按目标类的模板顺序绑定，公开实例方法和属性的返回链以实参特化；`@template T of object` 配合 `/** @var T */ public object $value` 也保留模板类型。补全、Signature Help、Definition 和缓存恢复沿用普通 mixin 的同一成员身份。
- 目标必须是唯一已索引类；模板个数、约束和参数类型必须全部可证明。缺失、歧义、错数、违反 bound、循环与损坏缓存不产生代理成员；真实声明和继承成员仍优先。
- 语义快照升级至 schema 79，索引缓存升级至 v60；旧缓存由源码重建。

## 验证

- 定向样例覆盖泛型方法返回链、模板属性链、签名、错数、违反约束、缺失实参类型和热恢复。
- `pnpm typecheck`、`pnpm lint`、`pnpm test` 通过；全仓 821 项测试，其中 semantic 277 项、独立 Symfony 扩展 4 项。
- `pnpm verify:packages`：24 个组件 tarball 在仓库外隔离消费通过。
- `pnpm candidate:alpha` 完成四份 VSIX 打包和内容检查；Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL preflight 通过。两处预检均把 WSL Extension Host 归属、竞争 PHP Provider 及持续两小时真实编辑列为人工待验收项。
- `pnpm test:extension:packaged` 在 VS Code 1.138.0 隔离 Profile 中以退出码 0 完成。

功能提交 `b268269ec7465e4e1fdd758b7982b53fb9f4f74c`。候选目录：`artifacts/php-companion-alpha-0.4.5-b268269e/`。主扩展 SHA-256 为 `ab9901a912a8a20f5f4d42c09a057e8c9e1eaedb570402d34ae3362d41d9b326`；独立 Symfony 扩展为 `49e376f92d214269fbe66d710a5cc97a682c274b510afb0ea590de1a282952a6`；Open Source Pack 为 `8c72f72a8aa8f06b2f429c69e6948a61a6fb392f5c9a7e054356e227a08f4b12`；Recommended Pack 为 `14da2668a6fc04e23438f1626d091d4e5cb073db38e6be1f7ad261b12c9a5cb7`。

校验记录：[Winstar PHP 8.5](alpha-preflight-winstar-generic-mixin.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-generic-mixin.json)。这轮尚未从 Alpha Profile 内执行持续 WSL 编辑；该项不计入自动门禁通过范围。
