# Winstar 运行时模块路由 Provider

日期：2026-09-19

## 实现

新增独立包 `@php-companion/provider-winstar-routes`，并把其 CLI bundle 放入核心 VSIX。用户在可信项目显式启用 `phpCompanion.symfony.winstarRoutes.enabled` 后，VS Code adapter 以保留身份向语言服务器发布内置 provider 描述符。

适配器执行项目自己的 `bin/php-runtime bin/console debug:router --format=json`，从 Symfony Router 得到实际启用的名称和最终路径。它读取模块 YAML 只为定位来源：直接路由匹配 `name`；`admin_defaults` 生成项匹配 `admin.<base>.<action>`。运行时名称只有一个可能声明时才发布；重复可能来源、损坏 YAML、无模块来源和标准 Symfony 路由保持 unknown。

## 真实 Winstar 证据

- dev Router 输出 704 条实际路由。
- 适配器保守发布 362 条具有唯一模块 YAML 来源的路由。
- `admin.login` 最终路径为 `/newadmin/login`，来源范围是 `src/Modules/Admin/Routes/admin_Login.yaml` 第 2 行名称文本。
- `admin.CompanyPage.edit` 最终路径为 `/newadmin/CompanyPage/edit/{id}`，来源范围是 `src/Modules/Company/Routes/admin_defaults.yaml` 的 `CompanyPage` 名称文本。
- 真实 onDemand Language Server 探针在 `RouterInterface::generate('admin.log…')` 返回 `admin.login`、`admin.loginSubmit`、`admin.logout` 与三个 logReader 候选；对 `admin.login` 的 Definition 精确返回上述 YAML 第 2 行第 9–20 字符。

## 验证

- 适配器 3 项测试通过，覆盖直接路由、生成路由、运行时过滤、损坏 YAML和重复来源拒绝。
- Language Server 186 项通过；扩展 manifest 设置测试 3 项通过。
- 全仓 TypeScript、ESLint 与生产 bundle 构建通过；bundle 中 `winstar-route-provider.js` 为独立入口。

19 个组件 tarball 已在隔离消费者安装并执行 smoke test。功能提交为 `1ac2be2`，Alpha 候选目录为 `artifacts/php-companion-alpha-0.4.5-1ac2be20/`：

- 核心 VSIX：`f4bff40a1df72645860aaf5692edc779822b3a72e6728f6e82ba7449315567aa`
- Open Source Pack：`ce687348ac748749d971ee5a203f6cc2c0907062c062159389e2d4c83eb064a2`
- Recommended Pack：`9ba21a6b566df2bb94cd027d47e3b989d8aa99c6f6ad882f1f189ddc73a57ab4`

三份 VSIX 内容与候选 SHA-256 复核通过，Winstar PHP 8.5 和 CoreRepo PHP 7.2 的 WSL 确定性预检通过。核心候选已安装到 WSL RockyLinux8；已安装 adapter、Language Server 和 Winstar provider bundle 分别以 `e7169e05f37abf9c87edaa0e867c6e921ea9a2ea633916e829d5384348e778df`、`6db3c50c6fad94b6635e84cd4269540fb757d9d09c137b99358dfb6556365782`、`f048ee8753ca6c95b7caf9e9d3b6ca2d7780fa1d02fa5f6e2e3e881e082c0ed5` 与构建输出核对。使用当前 WSL Extension Host 的 Node 直接运行已安装 provider，同样返回 362 条及正确 `admin.login` 来源。Reload Window 后才会由扩展设置启动新版本。

该设置会启动项目 Symfony Kernel，等同于授权执行项目代码。route-provider-host 提供无 shell 子进程、30 秒和 16 MiB 边界，但不是安全沙箱。默认保持关闭。
