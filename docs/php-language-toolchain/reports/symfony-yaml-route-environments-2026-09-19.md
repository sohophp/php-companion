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

功能提交、全量回归、Alpha 候选与安装证据将在发布门禁完成后补入本报告。
