# PHP Companion: Symfony

PHP Companion 自研 Symfony 集成扩展。它依赖 `sohophp.php-companion` 的通用 PHP 语言核心，并逐步接管服务容器、依赖注入、事件订阅、路由和 Controller 上下文能力。

当前首个独立能力是可选 Winstar 模块运行时路由 Provider。启用 `phpCompanion.symfony.winstarRoutes.enabled` 后，扩展通过 PHP Companion plugin API 注册自身打包的隔离 Provider；停用设置或扩展时会撤销注册。核心仍保留 Alpha 迁移期回退，检测到本扩展安装后不会重复注册内置副本。

Twig 语言能力继续由 TwigPlus 提供，通用 YAML/XML 语法和格式化继续由 Red Hat YAML/XML 提供。本扩展不复制这些能力。

## 本地安装

```bash
pnpm package:symfony
code --install-extension packages/php-companion-symfony/php-companion-symfony-0.4.5.vsix --force
```
