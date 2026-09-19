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
