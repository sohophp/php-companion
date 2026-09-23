# F09 Symfony Provider 完整性与语言服务器链路

日期：2026-09-23。F09-SVC-01 现在由真实独立 Symfony 服务 Provider 读取编号 YAML 夹具，再经 Language Server 的 Symfony Definition 请求返回 `app.mailer` 声明的精确范围。F09-ROUTE-01 由真实独立静态路由 Provider 读取编号路由夹具，在 PHP `RouterInterface::generate()` 调用处补全 `account.show`。

验证中发现服务 Provider 原先忽略 `analyzeSymfonyServiceYaml()` 的 `complete=false`，因此破损服务配置可能被包装成完整权威快照。现已把解析完整性传入 Provider 响应；超大配置和导入预算耗尽也标记不完整。真实 stdio 测试把打开的服务 YAML 快照改为 F09-SVC-03 后，Language Server 清除旧容器事实，PHP `#[Autowire(service: 'app.mailer')]` 的 Definition 返回空。路由快照改为 F09-ROUTE-03 动态路径后，原有路由补全被关闭，并出现不完整快照警告。

验证命令：服务 Provider 7 项测试、Language Server 两项 F09 定向 stdio 测试、两包类型检查及相关 ESLint 均通过。当前 Winstar2024 项目在 `dev` 环境下用更新后的服务 Provider 做只读收集，返回 `complete=true`、`inputEvidenceComplete=true`、4665 条服务事实和 90 个已尝试输入文件；该探针传入空项目类型目录，不能据此宣称真实编辑器链路已完成验收。

本轮只构建相关 Provider/Language Server 以运行测试，没有生成 VSIX。F09 的更多 Symfony/Doctrine 场景、框架版本、真实动态边界和打包宿主仍待验收。

随后补充了 F09-DOC-03 的真实 stdio 编辑回归：初始完整 Entity 提供 `UserRepository::find` 补全；打开 Entity 并改成未完成类后，补全撤销；恢复完整源码后补全再次出现。定向测试、Language Server 类型检查和该测试文件的 ESLint 均通过。此步骤没有生成 VSIX。

静态路由 Provider 现将重复名称的路由图标记为不完整。来源均可读取时仍保留 `inputEvidenceComplete=true`，但不会把过滤后的冲突结果宣称为权威全集；这避免下游路由 Rename/References 把歧义误判为不存在。Provider 4 项测试、类型检查和相关 ESLint 通过，没有生成 VSIX。
