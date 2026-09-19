# @php-companion/provider-symfony-events

独立 Symfony 事件关系 Provider。它在有界项目 PHP 快照和已确定服务目录上静态提取 subscriber map、`AsEventListener`、继承/Trait 监听关系及 `dispatch()` 候选，不启动 Kernel，也不执行项目代码。调用方仍须用 PHP 类型系统验证有效公开监听方法和 Symfony EventDispatcher 接收者。
