# F04 跨文件成员工作流

日期：2026-09-24。源码阶段：C1。输入为测试中生成的独立 Composer PSR-4 项目，含接口 Contract、实现 Printer、无关同名 Other 和消费者 Consumer；不读取或修改业务项目。

## 发现与修复

onDemand 模式下，从 Consumer 的接口类型调用请求 Implementation 原来返回空数组，原因是实现类文件还未加载。语言服务器现在对可解析的方法先按名称准备项目候选，再由语义层验证继承关系和方法身份；扫描取消、文档版本变化或项目索引不完整时不返回看似完整的空结果。

F04-NAV-01 通过真实 stdio 串联 Completion、Hover、Signature Help、Definition、Implementation、References；检查接口与实现的精确位置、无关同名方法不混入、引用声明开关和未保存 Consumer 修改后的引用与定义。此前 F04-REF-04 的顶层赋值导航回归仍通过。

## 验证

- Language Server 构建、类型检查和相关 ESLint 通过。
- Language Server 定向 F04 stdio：2 项通过；Semantic F04 编号夹具：4 项通过。
- 未打包 VSIX；尚无真实 VS Code 操作、跨平台或大型项目的 Implementation 延迟数据。F04 最终验收保持开放。
