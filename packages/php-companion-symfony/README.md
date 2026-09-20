# PHP Companion: Symfony

PHP Companion 自研 Symfony 集成扩展。它依赖 `sohophp.php-companion` 的通用 PHP 语言核心，负责服务容器、依赖注入、事件订阅、路由和 Controller → Twig 上下文编排。Twig 语法、模板补全、导航和格式化继续由 twig-plus 负责。

扩展始终注册独立服务容器、事件关系与静态路由 Provider。服务 Provider 静态读取 YAML/XML/PHP Configurator、确定性导入、Bundle 资源及新鲜的 debug-container XML，返回服务/别名、自动装配、显式调用/属性、事件标签和编译参数事实；事件 Provider 提取 subscriber map、`AsEventListener`、继承/Trait 监听关系及 `dispatch()` 候选，核心再验证有效 PHP 方法与 Symfony EventDispatcher 接收者；路由 Provider 覆盖 YAML、PHP Configurator、Route Attribute、Kernel 导入、Bundle 资源、环境与本地化前缀。打开文档以有界快照覆盖磁盘。服务容器只由该 Provider 发现；Provider 缺失、冲突、失败或快照越界时服务注册、依赖注入和编译容器能力明确不可用。

配置切换通过 plugin API registration 的原子更新一次替换完整 Provider 集；旧 plugin API v1 核心不提供该操作时回退为撤销后重注册。停用或卸载扩展会释放 registration 并由核心清除外部事实；不兼容 API 会在任何 Provider 注册前拒绝激活。

启用 `phpCompanion.symfony.winstarRoutes.enabled` 后，扩展还会注册可选 Winstar 模块运行时路由 Provider；停用设置或扩展时会撤销对应注册。所有 Provider 都在独立无 shell 子进程中运行。静态服务与路由 Provider 不启动项目 PHP，也不加载项目 Composer autoloader。

Twig 语言能力继续由 TwigPlus 提供，通用 YAML/XML 语法和格式化继续由 Red Hat YAML/XML 提供。本扩展不复制这些能力。

## 本地安装

```bash
pnpm package:symfony
code --install-extension packages/php-companion-symfony/php-companion-symfony-0.4.5.vsix --force
```
