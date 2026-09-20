# Symfony PHP Configurator 服务引用导航与补全

日期：2026-09-21。范围：独立 Symfony 容器 Provider 已确认配置图内的 `services.php`。

## 行为

- 在唯一、类型明确的 `ContainerConfigurator` 返回闭包内识别导入的 `service()`，以及服务集合的 `get()`、`remove()`、`alias()` 目标、`parent()` 和 `decorate()` 服务 ID。
- Definition 只跳到唯一权威注册；References 跨 YAML、XML、PHP 三种配置格式汇总精确范围；字符串服务 ID 按当前前缀补全，并只替换引号内的值。
- `set()` 首参保持声明语义，不计作引用；`Mailer::class` 可参与引用导航，但不提供字符串补全，避免生成无效 PHP。
- 动态表达式、错误闭包类型、重新赋值后的 container/services 变量、普通 PHP 文件、非 Provider 配置文件和歧义注册保持无结果。
- Symfony 配置图仍由独立 `sohophp.php-companion-symfony` 提供；核心语言服务器只消费该边界，不启动 Kernel 或执行项目 PHP。

## 验证

- framework-symfony 45 项通过，覆盖支持范围、声明排除、空字符串补全、类常量补全拒绝和变量重赋值失效。
- Language Server 198 项通过；stdio 回归证明同一服务 ID 从 YAML、XML、PHP 三种配置返回精确引用，并从 PHP 配置完成 Definition 和补全。
- 24 个组件共 756 项、独立 Symfony 扩展 3 项、根扩展 44 项，共 803 项通过；TypeScript 与 ESLint 通过。
- 24 个组件 tarball 在隔离消费者中通过。
- VS Code 1.138.0 开发宿主和隔离打包双扩展宿主最终均以退出码 0 通过。打包宿主首次运行在既有动态属性诊断固定等待点超时；原样重跑通过，本功能断言未放宽。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的 WSL 确定性预检通过。

## 候选

功能提交为 `3156c8ae18aeee55bd74983a56276f8d223b4d7e`。私有候选位于 `artifacts/php-companion-alpha-0.4.5-3156c8ae/`。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `3fa493c6bede2764ee3f3ec9a85f0a49b534ad146cd09094b34994b05a8aade3` |
| `php-companion-symfony-0.4.5.vsix` | `fbbd2902e3ec3973e899f30b45e9986e645901676cd4df4dec0768190a5bbef4` |
| `php-companion-open-source-pack-0.4.5.vsix` | `4bb5e6e99e6d21a1a8c52c650083ea1fcfd02049b775d9a426cc247d273195d6` |
| `php-companion-recommended-pack-0.4.5.vsix` | `f14559e819f3cd62459abb90f0463fdb21076af3622e5a41d22d3f3c297b7264` |

严格编辑器 Profile 检查和持续人工编辑仍须从 `PHP Companion Alpha` Profile 的 VS Code WSL 集成终端执行；确定性后台预检不替代该门禁。
