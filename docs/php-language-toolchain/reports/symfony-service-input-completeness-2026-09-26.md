# Symfony 服务图的输入完整性

日期：2026-09-26。范围为独立 Symfony 服务 Provider 和临时 Composer 项目；未修改业务项目，未打包 VSIX。

服务 Provider 在尝试使用编译容器前，会检查配置输入是否能完整枚举。此前配置目录无法读取时，`inputEvidenceComplete` 已为 `false`，但最终仍可能返回 `complete: true`，让上层把服务图当作权威结果。独立夹具以存在编译容器、配置目录不可用的状态先复现该矛盾。

现在只有服务扫描与输入证据都完整时才返回 `complete: true`。Provider 11 项测试、TypeScript 构建、相关 ESLint 和差异检查通过。该测试证明 Provider 合约，不代表已安装 VSIX、真实 Symfony 项目或 WSL Remote 的组合验收。

契约路径复核：Provider CLI 将该 `complete` 值写入语义贡献；语义 Provider Host 拒绝 `complete: false` 的贡献，Language Server 不会据此提交权威容器事实。本轮未新增 Extension Host 场景。

继续检查 Bundle 注册约定：`config/bundles.php` 原来无论缺失、不可读取还是解析不完整都被同一个空 `catch` 忽略。现在仅把 `ENOENT` 视为可选约定文件缺失；其它读取错误把输入证据和服务图标为不完整，已读取但语法不完整时只把服务图标为不完整。独立夹具先复现“路径是目录却仍发布完整服务图”，再验证无法读取与语法不完整两条边界。Provider 12 项测试、构建、ESLint 和差异检查通过。真实 Language Server、安装候选与 Remote 仍需组合验收。

随后增加真实 stdio 场景：`config/bundles.php` 是不可读取的目录，而 `config/services.yaml` 含可解析服务时，Language Server 收到不完整 Provider 结果，PHP `#[Autowire(service: ...)]` 的服务 Definition 返回空位置；不会把可解析的局部服务条目当作完整服务图发布。同跑既有 F09-SVC-01 有效 YAML Definition 与不完整快照撤回场景，共 2 项通过。Language Server 构建、改动测试文件 ESLint 和差异检查通过。本轮仍未执行完整 Open Source Pack 安装或 WSL Remote 操作。

完成当前 10 项 Open Source Pack 的源码组合门禁：重建 Core 全部包与 bundle、SoPHP Symfony bundle、Extension Host 测试代码，在 VS Code 1.139.0 Linux x64 的隔离 Profile 运行完整 C3 宿主，退出码 0。日志 `/tmp/sophp-pack10-symfony-service-source-host-20260926.log` 包含 Symfony 服务 YAML 编辑/关闭的 XML 快照、PHP `routes.php` Controller Definition、YAML Controller 来源边界，以及后续生成、重构和一次 Undo/Redo 场景。此门禁确认正常服务配置仍与其它成员共存；不可读取 Bundle 的负例由前述真实 stdio 和 Provider 测试证明，尚未在完整 Pack 宿主中单独注入。源码组合结果不能代替安装 VSIX、WSL Remote 或人工持续使用。
