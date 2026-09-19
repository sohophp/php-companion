# Symfony YAML 路由环境块

日期：2026-09-19

## 语义依据与实现

Symfony 7.4 `YamlFileLoader::loadContent()` 对顶层名称以 `when@` 开头的项先比较当前 loader 环境。没有环境或名称不等于 `when@<current>` 时直接跳过；匹配时把块内每个条目当作普通 route/import 继续验证和装载。

framework-symfony 现在接收可选的显式环境，只展开唯一匹配的 map，并保留内层路由名称的原始源码范围。块外无条件条目始终参与；同一文件后出现的同名直接路由替换前一条，符合 `RouteCollection::add()` 的名称覆盖。选中块结构非法、嵌套 `when@` 或内部动态声明时保持 incomplete；未选中的块不会因其内容影响当前环境结果。

Language Server 把 resource scope `phpCompanion.symfony.environment` 传入每个 YAML 路由文件。环境快照改变后，下一次补全、Definition 或 References 会重新构建对应静态图。

## 验证

- framework-symfony 39 项测试通过，覆盖无环境、dev、prod、块内 route/import、嵌套范围、同名覆盖和选中块损坏。
- 聚焦 stdio 回归证明 `conditional.page` 在默认环境缺席，切换 dev 后以 `/conditional` 出现，切回 prod 后立即消失。
- Winstar 当前路由配置没有 `when@env` 样本，因此项目级证据只用于确认没有回归，环境块语义由 Symfony 7.4 源码对照和隔离 fixture 证明。

功能提交为 `2c56b7a`。Language Server 186 项、全仓 TypeScript 与 ESLint 通过；19 个组件 tarball 已从隔离消费者安装并执行 smoke test。Winstar PHP 8.5 和 CoreRepo PHP 7.2 的 WSL 确定性预检通过。

Alpha 候选目录为 `artifacts/php-companion-alpha-0.4.5-2c56b7ac/`：

- 核心 VSIX：`ea223125b61b2d06436cea48838942598915267f9cbecd3beeaf684e564ab7c1`
- Open Source Pack：`1e447135b10027ce9cc0db674a20fd9b66f8882669097ef2a41f6043f8a8ab99`
- Recommended Pack：`2d451f7f4fb90ed213b9195978a31b5b6ca0d58916affcb27911c198025f891c`

三份 VSIX 的清单、内容和 `SHA256SUMS` 均通过。核心候选已由 Remote CLI 成功覆盖安装到 WSL RockyLinux8；已安装 adapter、Language Server 和 Winstar Provider 的 SHA-256 分别为 `e7169e05f37abf9c87edaa0e867c6e921ea9a2ea633916e829d5384348e778df`、`a5f373b89d67d84fb69789366f45780e0d9b62cc79f6f14944e4bdd4096c9f9a`、`f048ee8753ca6c95b7caf9e9d3b6ca2d7780fa1d02fa5f6e2e3e881e082c0ed5`，与构建输出逐项一致。

直接启动已安装 Language Server 的隔离 stdio 探针得到 YAML `conditional.page` 的 `none=[]`、`dev=[conditional.page]`、`prod=[]`。Route Attribute 的同类探针及真实 Winstar `admin.CompanyPage.edit` 的唯一 `id` 参数候选也继续通过。VS Code 需要 Reload Window 才会让当前 Extension Host 加载新版本。
