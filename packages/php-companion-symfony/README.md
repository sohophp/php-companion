# PHP Companion: Symfony

PHP Companion 自研 Symfony 集成扩展。它依赖 `sohophp.php-companion` 的通用 PHP 语言核心，负责服务容器、依赖注入、事件订阅、路由和 Controller → Twig 上下文编排。Twig 语法、模板补全、导航和格式化继续由 twig-plus 负责。

权威服务 ID 的编辑能力覆盖 YAML、XML、PHP Configurator 和项目 PHP 中可证明属于 Symfony 的 `#[Autowire(service: '...')]` 字面量。Definition、References、Completion 与 Rename 共用同一服务目录；Rename 只有在配置图和项目 Attribute 扫描都完整时才返回一次可撤销的跨文件编辑。

静态 YAML/XML 参数支持从顶层 `parameters` 声明或精确 `%parameter.id%` 占位符执行跨格式 Definition、References、Completion 与 Rename。Provider 只向核心发布参数 ID 和源码范围，不读取或传递参数值；声明不唯一、配置图不完整、文件不可读、`%env(...)%`、`%%escaped%%`、XML Entity 及需要解码的字符串都保持无结果。

扩展始终注册独立服务容器、事件关系与静态路由 Provider。服务 Provider 静态读取 YAML/XML/PHP Configurator、确定性导入、Bundle 资源及新鲜的 debug-container XML，返回服务/别名、自动装配、显式调用/属性、事件标签和编译参数事实；事件 Provider 提取 subscriber map、`AsEventListener`、继承/Trait 监听关系及 `dispatch()` 候选，核心再验证有效 PHP 方法与 Symfony EventDispatcher 接收者；路由 Provider 覆盖 YAML、PHP Configurator、Route Attribute、Kernel 导入、Bundle 资源、环境与本地化前缀。打开文档以有界快照覆盖磁盘。服务容器、PHP 事件关系和静态路由只由对应 Provider 发现；Provider 缺失、冲突、失败或快照越界时对应能力明确不可用。

配置切换通过 plugin API registration 的原子更新一次替换完整 Provider 集；旧 plugin API v1 核心不提供该操作时回退为撤销后重注册。停用或卸载扩展会释放 registration 并由核心清除外部事实；不兼容 API 会在任何 Provider 注册前拒绝激活。

静态路由 Provider 的完整结果会复用到 Provider/环境、磁盘 PHP/YAML 或打开文档快照变化为止，避免每次补全、Definition 和 References 都重新启动进程；任一失效事件后的首个查询会重建快照。启用 `phpCompanion.symfony.winstarRoutes.enabled` 后，扩展还会注册可选 Winstar 模块运行时路由 Provider；它保持逐次执行，以反映真实运行时集合。停用设置或扩展时会撤销对应注册。所有 Provider 都在独立无 shell 子进程中运行。静态服务与路由 Provider 不启动项目 PHP，也不加载项目 Composer autoloader。

Twig 语言能力继续由 TwigPlus 提供，通用 YAML/XML 语法和格式化继续由 Red Hat YAML/XML 提供。本扩展不复制这些能力。

## 本地安装

```bash
pnpm package:symfony
code --install-extension packages/php-companion-symfony/php-companion-symfony-0.4.5.vsix --force
```
