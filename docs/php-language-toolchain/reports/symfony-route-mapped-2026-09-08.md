# PSR-4 与默认路由名称 VSIX 验收

日期：2026-09-08。范围：前两轮源码增量在实际打包扩展中的组合验证。

## 已验证

实际 Open Source Profile 断言通过，退出码 0。测试配置同时保留 YAML 路由、glob Attribute 导入/排除，并加入 `resource: {path, namespace}` 与未命名方法 Route。候选严格为：

- `profile_route_home` → `/profile/home`
- `profile_route_attribute` → `/profile/attribute`
- `profile_route_app_mapped_implicit_index` → `/profile/implicit`

同一映射文件中的额外类不得进入候选。仍执行原有 Attribute 导航、路由 Provider 停止/恢复、PHP 核心编码及格式化/调试/测试入口断言。环境为 VS Code 1.136.1、Linux x64/WSL、Symfony Language Tools 0.19.0；PHP 命令在激活前配置。

`pnpm package`、Extension Host TypeScript、相关 ESLint、`pnpm verify:vsix` 和 `git diff --check` 通过。前两轮源码证据为框架 20 项与语言服务器 51 项通过；本轮没有重复整个源码测试矩阵，也没有重新执行所有独立组件 tarball 安装。

主扩展 SHA-256：`fd790a2a74fb2fad9a99e6c469794b5faaf5f6a5e7f3cc31fc4700e50a0079d6`。文件：`php-companion-0.4.5.vsix`。两个 Pack 本轮仅校验既有 manifest，未重建或公开发布。

## 证据与边界

[原始宿主日志](symfony-route-mapped-host-2026-09-08.log)。完整本地日志目录：`/tmp/php-route-mapped-vscode-logs`。

宿主仍报告测试文件 `File Modified Since` 保存冲突；本轮退出码 0 不代表已修复既有组合异常。之前的 PHPUnit 文件监听 ENOENT 和 Symfony 连续配置变更事件循环问题亦未作为已修复关闭。

静态源码候选不代表完整运行时路由表；自定义 Loader、继承、环境/本地化与自动 FQCN 别名仍开放。其他平台与最终 F01–F14 验收未由本报告覆盖。
