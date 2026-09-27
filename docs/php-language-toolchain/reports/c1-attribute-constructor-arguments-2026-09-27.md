# C1：Attribute 构造参数提示与命名参数补全

日期：2026-09-27。仅修改 SoPHP 隔离工作树和独立测试夹具；没有修改 Winstar、打包 VSIX 或安装用户 Profile。

未闭合的 `#[Config(na` 原先没有 `name:` 建议或构造函数参数提示，即使 `Config` 是已声明的 Attribute 类。语义回归先得到空结果。Core 现在识别当前 Attribute 的实参列表，复用已有构造函数参数匹配、已使用命名参数过滤和参数提示；普通函数调用、嵌套调用仍走原有解析。只对可证明为 Attribute 的类提供此结果。类位于未打开的 Composer 文件时，Language Server 根据已导入或限定的类名按需载入声明，并在返回前检查取消状态与文档版本。

验证：语义包完整 435/435 项通过；定向真实 Language Server stdio 同时得到 `name:` 和构造函数签名；语义包、Language Server 与扩展测试 TypeScript、相关 ESLint、差异检查通过。完整 10 项 Open Source Pack 的隔离 VS Code 1.139.1 Linux x64 源码宿主，在未打开的项目 Attribute 类上执行实际补全和参数提示，退出码 0，日志 `/tmp/sophp-c1-attribute-arguments-pack10-imported-20260927.log`。最初宿主夹具遗漏跨命名空间 `use` 导入，无法解析短类名；修正夹具后通过，不能将该次失败归因为按需载入实现。

为检查普通编辑路径是否因新增的 Attribute 上下文识别明显变慢，运行 100 轮直接 LSP 编辑基准：热 Completion/Hover/Definition P95 分别为 1.76/1.26/1.93 ms，诊断更新 P95 29.85 ms，取消 1.32 ms；旧补全、Hover、Definition 计数均为 0。日志 `/tmp/sophp-c1-attribute-arguments-editing-bench-20260927.log`。这是单机合成夹具，不代表完整 Pack 的首次请求或 Remote 等待。

此项涵盖可解析的用户自定义 Attribute 构造参数；复杂嵌套实参、构造参数 Rename、真实 WSL Remote、已安装候选与其它平台仍须另行验证。源码未进入冻结的 0.4.8 VSIX。
