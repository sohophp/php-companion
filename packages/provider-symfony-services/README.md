# @php-companion/provider-symfony-services

PHP Companion Symfony 的静态服务容器 Provider。它读取 YAML/XML/PHP Configurator、确定性导入、Bundle 资源和新鲜的 debug-container XML，并返回服务、别名、自动装配、显式调用/属性、事件标签及编译参数事实。YAML 的顶层 `when@environment`、XML 的 `<when env="environment">` 与 PHP Configurator 的直接 `$container->env() === 'literal'` 守卫都按请求环境精确选择；没有明确环境时只发布无条件配置。

进程不启动项目 PHP，也不加载 Composer autoloader。项目类型目录由 PHP Companion 核心通过有界协议提供。
