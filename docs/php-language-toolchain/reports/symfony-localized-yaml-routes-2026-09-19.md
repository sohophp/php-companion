# Symfony YAML 本地化路由

日期：2026-09-19

## 语义依据与实现

Symfony 7.4 `LocalizedRouteTrait::createLocalizedRoute()` 把 YAML route 的 `path` map 展开为基础名称加 `.locale` 的独立路由。`PrefixTrait::addPrefix()` 对 import `prefix` map 的处理取决于子路由是否已本地化：普通子路由按每个 prefix locale 克隆，已本地化子路由只接受同名 locale 的 prefix。

framework-symfony 现在把字面量 YAML path map 输出为带 locale 身份的路由事实，并保留基础 YAML key 的精确范围。import prefix 可为字符串或 locale→path map；非字符串键值、参数化值和动态结构保持 incomplete，不发布推测事实。

Language Server 在递归导入图中组合 string/string、string/map、map/string 和 locale 可对应的 map/map 前缀。最终应用前缀时，普通路由生成 `name.locale`，已有 locale 的 YAML 或 Attribute 路由只匹配相同 locale；内层 map 出现外层缺失的 locale 时不继续该导入分支。最终事实继续进入既有补全、Definition、References 和参数补全唯一性门禁。

## 验证

- framework-symfony 40 项测试通过，覆盖直接本地化 path、共享声明范围、本地化 import prefix，以及参数化和非字符串值拒绝。
- Language Server 186 项测试通过；真实 stdio fixture 覆盖直接 YAML `path` map、普通子路由按 `de/en/fr` 克隆、已本地化子路由忽略额外父 locale，以及嵌套 string/map、map/string、map/map 前缀。
- Winstar 当前源码没有 YAML 本地化 path/prefix 样本，因此未声称真实项目覆盖；实现依据 Symfony 7.4 loader 源码和隔离 fixture。

本报告当前记录功能实现与源码回归；候选打包、独立 tarball、真实项目预检、安装哈希及已安装 bundle 探针将在功能提交后补入。
