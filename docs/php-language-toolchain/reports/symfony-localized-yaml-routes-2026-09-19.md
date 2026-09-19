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

功能提交为 `b55cb35`。全仓 TypeScript 与 ESLint 通过；19 个组件 tarball 已从隔离消费者安装并执行 smoke test。Winstar PHP 8.5 和 CoreRepo PHP 7.2 的 WSL 确定性预检通过。

Alpha 候选目录为 `artifacts/php-companion-alpha-0.4.5-b55cb35a/`：

- 核心 VSIX：`5ad2074ab9bed521ad9ee2e9e9b85fd89250f43fb18d30f28555e37865192f66`
- Open Source Pack：`2255973354d935ff6486da1ae475c37f512a38909ab366f20767dd540ded24ba`
- Recommended Pack：`607e7f3bc452d5a26a3feec276e5bb8786d50e8e1066ddfc7a8238b3ea1388b0`

三份 VSIX 的清单、内容和 `SHA256SUMS` 均通过。核心候选已由 Remote CLI 成功覆盖安装到 WSL RockyLinux8；已安装 adapter、Language Server 和 Winstar Provider 的 SHA-256 分别为 `e7169e05f37abf9c87edaa0e867c6e921ea9a2ea633916e829d5384348e778df`、`7de3db0d6228bc0d0cfea2923644de04f138ace7e4c0ed88d1e718171f334d2f`、`f048ee8753ca6c95b7caf9e9d3b6ca2d7780fa1d02fa5f6e2e3e881e082c0ed5`，与构建输出逐项一致。

直接启动已安装 Language Server 的隔离 stdio 探针得到：直接 YAML path map 为 `localized.page.en/fr`；未本地化导入子路由按父 prefix map 展开为 `imported_page.de/en/fr`；已本地化子路由只匹配 `imported_child.en/fr`，没有制造 `.de`。Attribute 本地化、Route Attribute 环境 none/dev/prod 及真实 Winstar `admin.CompanyPage.edit` 的唯一 `id` 参数候选也继续通过。VS Code 需要 Reload Window 才会让当前 Extension Host 加载新版本。
