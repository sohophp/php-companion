# 声明与实现分层语义更新报告

日期：2026-09-14

## 目标

为 P3 的声明/方法体分层索引建立可消费的更新契约，使局部实现编辑不会默认清除同文件所有派生摘要，也不会重复构建只依赖声明的框架事实。

## 已实现契约

- `SemanticWorkspace.update()` 返回 `declaration`、`implementation` 或 `none`，并列出 lowercase callable/type 稳定身份。
- 声明表面覆盖类型关系、Trait adaptation、方法/属性/常量签名、PHPDoc 模板与 magic members、namespace 和 import；源码范围变化不作为声明变化。
- 实现层按具名函数、方法和 Property Hook 的完整声明片段比较。顶层可执行代码或其他源码变化至少归入 implementation；仅文件末尾空白变化归入 none。
- 工厂构造摘要只按实际变化的 callable 或返回类型失效；构造器与 Property Hook 实现变化沿受影响的继承/trait 关系失效构造摘要。文件删除仍按完整声明删除处理。
- Language Server 对 implementation 更新继续刷新 Symfony controller/Twig 上下文；Doctrine 映射和 Symfony service 候选只在 declaration 更新时重新分析。诊断仍对每个打开文档版本正常发布。

## 精准反例

- 文件末尾增加换行：`kind=none`，工厂摘要保留，不重新解析工厂体。
- `return new State(1)` 改为 `return new State(2)`：`kind=implementation`，只报告并失效该工厂 callable。
- 方法 `oldName()` 改为 `newName()`：`kind=declaration`，报告旧/新 callable 与所属类型，成员补全立即只显示新名称。
- 构造器体变化：继承该构造摘要的子类型会重新计算，避免保留过期 readonly 初始化事实。

## 验证与边界

本地验证：

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm test`：十六个组件 616 项、根扩展 33 项，共 649 项通过；Semantic 251/251，Language Server 161/161。
- `node scripts/benchmark-editing.mjs 500 50`：500 次真实 stdio 更新无陈旧补全；更新到诊断 P50/P95/最大值为 2.20/3.78/6.61 ms，热补全为 0.90/1.45/2.65 ms，取消 1.34 ms，最终 RSS 增长 17.75 MiB，损坏缓存恢复及重启后补全恢复均通过冻结预算。
- `pnpm verify:packages`：十六个真实 tarball 在仓库外隔离消费者中安装和调用成功。
- `pnpm package:all` 与 `pnpm verify:vsix`：三份 VSIX 构建和内容检查通过。
- `pnpm test:extension:packaged`：VS Code 1.137.0 Linux x64 隔离配置完成完整 Extension Host 用例，退出码 0。

本地候选 SHA-256：

- `php-companion-0.4.5.vsix`：`ee835ec422af2300461f1df9da1123970ff9b1555ea5e70fecdb5adb6db46432`
- `php-companion-open-source-pack-0.4.5.vsix`：`f3ab558f6685ae19c368fbf2983b32bba38d33a4a6dc91e38b1435c86fb253da`
- `php-companion-recommended-pack-0.4.5.vsix`：`89a885f4ad0a048f29bc2be0da499351a249d42c6dc8e218ebdfdcfe28c9c855`

当前增量关闭分层更新契约和首批派生缓存失效，不代表引用倒排表、完整依赖图或分层磁盘持久化已经完成；P3 总项保持开放。
