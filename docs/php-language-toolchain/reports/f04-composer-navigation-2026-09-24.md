# F04 跨文件成员工作流

日期：2026-09-24。源码阶段：C1。输入为测试中生成的独立 Composer PSR-4 项目，含接口 Contract、实现 Printer、无关同名 Other 和消费者 Consumer；不读取或修改业务项目。

## 发现与修复

onDemand 模式下，从 Consumer 的接口类型调用请求 Implementation 原来返回空数组，原因是实现类文件还未加载。语言服务器现在对可解析的方法先按名称准备项目候选，再由语义层验证继承关系和方法身份；扫描取消、文档版本变化或项目索引不完整时不返回看似完整的空结果。

F04-NAV-01 通过真实 stdio 串联 Completion、Hover、Signature Help、Definition、Implementation、References；检查接口与实现的精确位置、无关同名方法不混入、引用声明开关和未保存 Consumer 修改后的引用与定义。此前 F04-REF-04 的顶层赋值导航回归仍通过。

F04-NAV-02 在同一真实 stdio 会话中把未保存 Consumer 的接收者从 `Contract` 改成具有同名方法的 `Other`；Definition 改指向 `Other`，Implementation 为空，References 合并两个接收者的三处 `Other::render` 调用，Hover 与 Signature Help 显示 `Other::render(): void`。第三版文档的精确范围断言防止把旧接口缓存或旧文档偏移当成当前结果。 F04-NAV-03 再把接收者切回 `Contract`，不等待诊断发布就立即请求 Definition 和 Implementation；两项均按第四版文档返回接口及 `Printer` 实现。

## 验证

- Language Server 构建、类型检查和相关 ESLint 通过。
- Language Server 定向 F04 stdio 中 F04-NAV-01（含 F04-NAV-02/03 第三、四版文档）1 项通过；完整 F04 stdio 与 Semantic 夹具本轮尚未重跑。
- 未打包 VSIX；尚无真实 VS Code 操作、跨平台或大型项目的 Implementation 延迟数据。F04 最终验收保持开放。

## 跨 namespace 继承的首次查询

F04-NAV-04 使用独立 Composer 项目的 `App\` 与 `Acme\` 两个 PSR-4 映射：Consumer 通过 `Report as Alias` 接收子类，子类通过 `Base as ImportedBase` 继承另一个 namespace 的公开 `format()`；同项目的 `Other::format()` 是无关同名反例。首次查询原本能跳到 `Report` 类型，却无法在按需模式中补全或 Hover 其父类方法。原因是按需加载只加载直接接收者，接收者文件已存在时不再推进父类。现在沿语义层已解析的声明依赖最多加载四层，并在每次异步加载后检查取消和文档版本。首次全套回归指出链式返回值场景 `$request->getSession()->get()` 也需要在每层加载后重新解析当前接收者；修正后该既有回归与 F04-NAV-04 定向测试同时通过。测试为 Hover、Signature Help、Definition、Completion、References 各自启动新语言服务器，避免前一个查询预热掩盖问题；每项都返回父类方法或唯一真实调用位置。语义包 314 项、语言服务器全套 297 项通过且 1 项跳过，相关 ESLint 与 TypeScript 构建通过。冷启动 Implementation 当前用例只证明不捏造实现，尚未形成正例。
