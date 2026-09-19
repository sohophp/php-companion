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

该设置会启动项目 Symfony Kernel，等同于授权执行项目代码。route-provider-host 提供无 shell 子进程、30 秒和 16 MiB 边界，但不是安全沙箱。默认保持关闭。
