# C1 未保存接收者切换后的完整编辑链

日期：2026-09-24。独立 Composer 示例项目中，Consumer 初始接收 `C1Contract`，另有实现类 `C1Printer` 与同名方法但不同签名的无关类 `C1Other`。隔离 VS Code Core Extension Host 首先验证 Completion、Hover、Signature Help、Definition、Implementation 和 References；随后不保存文件，将 Consumer 的接收者类型改为 `C1Other`，在新文档上再次执行六项查询。

编辑后 Completion 只有一个 `renderC1` 候选，详情归属 `C1Other::renderC1(): void`；Hover 与 Signature Help 显示无参数 `void` 签名；Definition 指向 `C1Other`；References 包含新调用，不含旧接口或其实现类；Implementation 返回空结果，不继续显示 `C1Printer`。文档保持 dirty。隔离 VS Code 1.139.0 Linux x64 宿主以 auto、PHP 7.2、8.1、8.5 四种设置运行，同一流程均以退出码 0 结束。没有修改业务项目，也没有打包 VSIX。

宿主用例会等待新版本的正确结果，因此证明编辑后的最终可见查询链，不证明快速输入过程中每个瞬间都没有旧结果；旧请求的版本隔离另由 F04-NAV-10–13 的真实 stdio 时序用例覆盖。VS Code 的公共命令可观察查询响应，但本环境尚无可编程读取建议列表显示状态的接口；本报告不宣称已经测得从键入到建议弹窗显示的 UI 时间，也不代表完整 Open Source Pack、Remote 或持续人工编码验收。
