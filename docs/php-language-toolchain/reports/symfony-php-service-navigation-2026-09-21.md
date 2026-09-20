# Symfony PHP Configurator 服务引用导航与补全

日期：2026-09-21。范围：独立 Symfony 容器 Provider 已确认配置图内的 `services.php`。

## 行为

- 在唯一、类型明确的 `ContainerConfigurator` 返回闭包内识别导入的 `service()`，以及服务集合的 `get()`、`remove()`、`alias()` 目标、`parent()` 和 `decorate()` 服务 ID。
- Definition 只跳到唯一权威注册；References 跨 YAML、XML、PHP 三种配置格式汇总精确范围；字符串服务 ID 按当前前缀补全，并只替换引号内的值。
- 从 PHP 类声明执行 References 时，也会为该类实现且唯一注册的每个服务 ID 合并三种配置格式中的精确用法；歧义注册不合并。
- `set()` 首参保持声明语义，不计作引用；`Mailer::class` 可参与引用导航，但不提供字符串补全，避免生成无效 PHP。
- 动态表达式、错误闭包类型、重新赋值后的 container/services 变量、普通 PHP 文件、非 Provider 配置文件和歧义注册保持无结果。
- Symfony 配置图仍由独立 `sohophp.php-companion-symfony` 提供；核心语言服务器只消费该边界，不启动 Kernel 或执行项目 PHP。

## 验证

- framework-symfony 45 项通过，覆盖支持范围、声明排除、空字符串补全、类常量补全拒绝和变量重赋值失效。
- Language Server 198 项通过；stdio 回归证明同一服务 ID 从 YAML、XML、PHP 三种配置返回精确引用，从 PHP 配置完成 Definition 和补全，并从 PHP 类声明返回三格式服务用法。
- 24 个组件共 756 项、独立 Symfony 扩展 3 项、根扩展 44 项，共 803 项通过；TypeScript 与 ESLint 通过。
- 24 个组件 tarball 在隔离消费者中通过。
- VS Code 1.138.0 开发宿主和隔离打包双扩展宿主最终均以退出码 0 通过。打包宿主首次运行在既有动态属性诊断固定等待点超时；原样重跑通过，本功能断言未放宽。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的 WSL 确定性预检通过。

## 真实 Winstar 类引用

使用当前源码构建的 Language Server 与独立 Symfony service/event Provider，对 `src/Bridge/AdminSecuritySubscriber.php` 的类声明发送只读标准 LSP References 请求，不应用任何编辑。首次请求为 8.173 秒，返回两处：`config/symfony/services.yaml:42` 的 `App\\Bridge\\` resource 注册，以及类内 `KernelEvents::CONTROLLER` 订阅关系；完整索引日志和 `Indexing PHP symbols` 进度信号均为 0。项目中不存在该 subscriber 服务 ID 的其它直接配置用法，因此没有额外文本结果。

## 候选

PHP Configurator 导航提交为 `3156c8ae18aeee55bd74983a56276f8d223b4d7e`，类 References 服务用法提交为 `c965290e95d117626f9f34356b3af1a57a6dd869`。私有候选位于 `artifacts/php-companion-alpha-0.4.5-c965290e/`。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `a2d133b8ba8b18872b239eb13f9a7839703f9be5ca0741983c0fbfc249f0690d` |
| `php-companion-symfony-0.4.5.vsix` | `6e7a62e08412a6b28644d91de0af675f518d6b58f58f6eae59832ce34d39d9a6` |
| `php-companion-open-source-pack-0.4.5.vsix` | `5f8e6d97e0add69f621b0b3d3e542a1e95e7e15829d6c097a8339ab6e53461ca` |
| `php-companion-recommended-pack-0.4.5.vsix` | `62b6fc0b7e2ad53636332f70b4843e4903471c7b8042f80ec2c141af8f44e42d` |

严格编辑器 Profile 检查和持续人工编辑仍须从 `PHP Companion Alpha` Profile 的 VS Code WSL 集成终端执行；确定性后台预检不替代该门禁。
