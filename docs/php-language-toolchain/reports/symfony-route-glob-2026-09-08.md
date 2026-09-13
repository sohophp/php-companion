# Symfony 路由 glob 增量验收

日期：2026-09-08。范围：源码路由候选的资源选择与排除，不关闭 R4 最终资格验收。

## 结果

- Attribute 资源支持 `../controllers/**/*.php`、有界花括号候选、`?` 和字符集合；YAML 支持 `routes/*.{yaml,yml}`。
- resource / exclude 共用 minimatch；排除匹配目录时同时跳过子树。保留未保存文档优先、导入前缀、项目根边界及循环链接终止。
- 拒绝参数化路径、花括号范围展开、extglob 和超限模式。匹配/读取共享 64 次预算，预算耗尽可能返回不完整候选；不据此发布路由不存在诊断。
- `minimatch` 成为 language-server 直接运行时依赖；独立组件无需依赖 monorepo 根的隐式依赖。

## 验证

| 检查 | 结果 |
| --- | --- |
| framework-symfony 单元测试 | 17 项通过，包含范围展开/复杂模式拒绝反例 |
| language-server 全部测试 | 51 项通过，含真实 stdio glob/排除、循环链接及未保存输入 |
| 相关 ESLint / Extension Host TypeScript | 通过 |
| `pnpm package` | 主扩展 VSIX 重建成功 |
| `pnpm verify:packages` | 15 个 tarball 在仓库外隔离消费者中通过 |
| `pnpm verify:vsix` | 主扩展和两个已有 Pack 的内容校验通过 |
| 隔离 Open Source Profile | 宿主退出码 0；glob Attribute 与 YAML 候选、排除、提供者停止/恢复及原有编码工作流断言通过 |

宿主：VS Code 1.136.1，Linux x64/WSL；Symfony Language Tools 0.19.0。启动前配置 PHP 命令，再单独切换 runtimeIndexing。此项不证明外部运行时路由表采集成功。

主扩展：`php-companion-0.4.5.vsix`，SHA-256：`44f16f762c55b8d2f0771d39bbf6af2c4d2aa4405b95e00edc8c6dbff6317f84`。两个 Pack 本轮仅校验既有产物，未重新发布。没有执行 Git 提交、npm 或 Marketplace 发布。

原始证据：[宿主日志](symfony-route-glob-host-2026-09-08.log)、[隔离组件验证日志](symfony-route-glob-packages-2026-09-08.log)。本地完整宿主日志目录：`/tmp/php-route-glob-vscode-logs`。

## 仍开放

- 宿主断言虽通过，日志仍有 PHPUnit 扩展针对移动文件的 ENOENT，以及测试文件的 File Modified Since 保存错误；需要独立定位，不作为无异常组合证明。
- 先前外部 Symfony 插件连续配置修改导致事件循环退出的问题仍未修复，见 [既有错误摘录](symfony-config-change-failure-2026-09-08.log)。
- namespace 资源映射、自动路由名称、继承路由及完整环境/本地化规则未完成；候选描述仍为 source declaration。
- 本轮没有新增 Windows/macOS、完整 PHP 版本矩阵或性能矩阵验收。
