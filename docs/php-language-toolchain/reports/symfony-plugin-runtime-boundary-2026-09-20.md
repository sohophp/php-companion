# Symfony 独立插件运行边界

日期：2026-09-20

## 结论

Symfony 框架能力应作为独立 VS Code 扩展交付。PHP Companion 核心保持通用 PHP 语言服务器；Symfony 扩展负责服务容器、依赖注入、事件订阅、路由和 Controller 元数据。twig-plus 继续唯一拥有 Twig 语言能力，YAML/XML 通用能力继续复用成熟扩展。

本增量建立拆分所需的首个可执行边界，但没有提前宣称 Symfony VSIX 已完成：

- 新增可独立发布的 `@php-companion/plugin-api` schema 1。
- 核心扩展激活后返回 `{ version: 1, registerIntegration() }`，另一个已安装扩展可以注册自身 semantic/route provider 进程。
- integration 与 provider ID 必须共享命名空间；重复身份、无效命令、越界参数、超时和输出预算在启动进程前拒绝。
- 核心只接收受限描述符，不暴露 Language Client 或任意通知通道。
- registration dispose 后，Language Server 撤销对应外部事实、重新协调剩余 provider，并刷新开放 PHP 文档。

## 验证范围

API 与注册表单元测试覆盖合法贡献、不可变快照、重复身份、外部命名空间、资源边界和幂等撤销。Language Server stdio 测试真实启动 provider 子进程，验证运行中注册后成员补全出现、撤销后同一补全消失且无需重启服务器。打包 Extension Host 检查核心激活返回 API v1；独立 tarball 门禁将 plugin-api 计入二十个组件并从隔离消费者导入和校验。

完整门禁结果：

- TypeScript、ESLint 和 `git diff --check` 通过。
- 二十个组件共 715 项测试通过；其中 plugin-api 2 项、Language Server 189 项、semantic 269 项。
- 根扩展 41 项测试通过。
- 二十个独立 tarball 在仓库外消费者完成安装、依赖范围、文档、导入及 Language Server smoke test。
- 三份 VSIX 内容验证通过；VS Code 1.138.0 隔离 Profile 的打包 Extension Host 退出码为 0，并确认激活 API v1。

功能提交为 `23e1a42`。候选目录为 `artifacts/php-companion-alpha-0.4.5-23e1a42a/`：

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `ec2016b09206979c5e5906ee92084ecb9e77bcb01a900d2045409ca0579bebcb` |
| `php-companion-open-source-pack-0.4.5.vsix` | `c96c632fe0be34974ea258d49616637407d19249cd8da4ead2a60f28334692fc` |
| `php-companion-recommended-pack-0.4.5.vsix` | `2aa2c1b47cf19028d0361c002162f97961cbf0740cf4b993f7de59086a8a84c4` |

`sha256sum -c SHA256SUMS` 三项均为 OK。Winstar PHP 8.5 与 CoreRepo PHP 7.2 的 WSL 确定性 Alpha 预检均通过。核心 VSIX 已安装到 WSL RockyLinux8；安装目录与构建输出一致：`dist/extension.js` 为 `86c48c8b49d349a2a8542697c4be995f353e61a110297b2fba7ef8441c89ab52`，`dist/language-server.js` 为 `79c28a48fd84483ec6de28aa9589d3568eba8884b3c9e72a93756d9e8f5114bc`。需要在 Alpha Profile 执行 `Developer: Reload Window` 才会由当前 Extension Host 加载新 bundle。

## 后续拆分顺序

1. 建立 `php-companion-symfony` 扩展包和核心版本协商，先迁移现有 route provider。
2. 扩展框架中立事实契约，迁移服务注册、注入和事件订阅关系。
3. 迁移 Controller/Twig 上下文的 Symfony 产生端，保持 twig-plus 为消费端和模板语言所有者。
4. 对独立安装、停用、升级、API 不兼容和 WSL Remote 路径执行 Extension Host 门禁。
5. 删除核心 Language Server 对 `framework-symfony` 的直接组装依赖，再发布独立 Symfony VSIX 候选。

在第 5 步完成前，Alpha 继续把现有 Symfony 分析随核心交付，以保证短期完整可用和行为不倒退。
