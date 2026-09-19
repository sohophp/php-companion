# Symfony PHP Configurator 静态服务事实（2026-09-19）

## 目标

支持 Symfony 官方 PHP 服务配置格式，同时保持 PHP Companion 的静态边界：配置文件只交给 tree-sitter parser，不 require 文件，不加载 Composer 项目 autoloader，不启动 Kernel 或编译容器。

## 已实现范围

- 入口必须是唯一返回的 closure，唯一参数原生类型必须解析到 `ContainerConfigurator`；支持官方 Configurator 命名空间和显式 class import。
- 支持 `$services = $container->services()` 与 `$container->services()` 直接链。
- 支持 defaults、set/class、alias、load/exclude、public/private、autowire、bind、具名 arg/args、call/property、显式 `kernel.event_listener` tag、remove/get。
- `service()` 支持官方函数命名空间/import、字面量或 `Class::class` ID，以及 `nullOnInvalid`、`ignoreOnInvalid`、`ignoreOnUninitialized`。
- `$container->import('literal.php')` 进入统一本地导入图；PHP、YAML 和 XML 可互相导入，仍受真实路径、扩展名、深度和循环门禁。
- 服务、别名、resource、事件、回调和 import 保留原始 PHP 精确范围；公开服务进入 Container 返回类型，注册位置进入 PHP 类型 References。
- services 变量或 container 参数一旦重赋值，后续调用不再采信。factory、fromCallable、parent、abstract/synthetic 服务被移除；自定义 constructor 和无法映射的显式参数会抑制自动注入推断。

条件/循环内注册、动态 ID/class/resource、位置参数到 PHP 构造参数的静态映射、复杂 configurator 别名和运行时 helper 保持 unknown。

## 真实源码审计

对 Winstar 当前安装的 Symfony 7.4 vendor 进行只读分析，只选择文本上返回 `ContainerConfigurator` closure 的 PHP 文件：91/91 个文件完成语法分析，共提取 558 个可证明服务。较大的真实样本包括 FrameworkBundle `console.php` 50 个、`translation.php` 40 个、`asset_mapper.php` 39 个，TwigBundle `twig.php` 35 个以及 MakerBundle `makers.php` 30 个。该数字只代表静态支持子集，不等同于运行时容器服务总数。
