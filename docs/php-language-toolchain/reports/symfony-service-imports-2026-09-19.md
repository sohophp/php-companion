# Symfony 服务配置导入图（2026-09-19）

## 目标

在不启动 Symfony Kernel、不执行 Composer 项目代码的前提下，让拆分到本地 YAML/XML 文件的服务注册、注入和监听关系进入现有补全、Hover、Definition 与 References 主链。

## 实现边界

- framework-symfony 从 YAML `imports[].resource` 和 XML `<imports><import resource>` 提取字面量资源及精确源码范围。
- Language Server 从约定入口递归加载导入文件；导入事实先于当前文件应用，因此当前文件保持覆盖优先级。
- 只接受 Composer 根真实路径内、扩展名明确为 `.yaml`、`.yml` 或 `.xml`、不含参数、通配符、绝对路径、URL scheme 或 `@Bundle` 别名的相对资源。
- 最大递归深度为 32；当前加载栈和已加载集合共同终止循环及重复分析。
- 每个导入文件保留自己的 URI 和注册范围，类型 References 指向真正声明服务的文件。文件监视会让发生变化的导入文件绕过缓存，并重建整个服务目录。
- 原始导入事实进入 `symfony-facts-v6`，旧缓存安全重建；恢复继续校验文件元数据、源内容 SHA-256、事实结构和事实摘要。

参数化路径、glob、`@Bundle` 资源和跨文件自定义 service-id alias 的组合解析保持 unknown。它们需要额外的确定性映射或合并模型，不能从文本名称猜测。

## 验证

- framework-symfony 覆盖 YAML/XML 导入范围、动态资源拒绝和 imports-only XML。
- 缓存测试证明 YAML/XML 导入事实冷写入后可热恢复且不重新解析。
- 真实 stdio 场景使用 XML→YAML→XML 循环：冷/热启动均终止，导入 YAML 中的公开服务驱动 Container `get()` 补全，PHP 类型 References 返回导入文件 URI。
- 修改导入 YAML 并发送文件变更后，服务事实立即消失；未变化的根 XML 仍可独立从缓存恢复。

## 验收结果

- framework-symfony：3 个测试文件、30 项全部通过。
- Language Server：6 个测试文件、185 项全部通过，耗时 218.62 秒。
- 根扩展：9 个测试文件、39 项全部通过；全仓 TypeScript 与 ESLint 通过。
- 16 个 monorepo 组件 tarball 在隔离消费者中安装验证通过；三份 VSIX 均通过内容检查。

功能提交为 `abb5ed64954422d076ac901fb01316cd34d3bb27`，候选目录为 `artifacts/php-companion-alpha-0.4.5-abb5ed64/`。核心、Open Source Pack、Recommended Pack 的 SHA-256 依次为 `9a7e0451a92cac57db97542b2ca20698244a888a245f5bec73946cd9f8e6c86c`、`0286d29b89ee47caa3cd3ba5786464676f7f98d7b4f4f8d7574dc5f4a89fe712`、`ab88ec48f12b3f3c7e572c1fc653e472373bd74cb7627d4afc7efec3f1fd6335`。候选语言服务器已原子覆盖到 WSL 现有扩展目录，源码 bundle 与安装目标均为 `2a19e34cf6453a52cd0565a87ade7a8748d30433ed4187878176f5479b98e9f9`，Reload Window 后加载。
