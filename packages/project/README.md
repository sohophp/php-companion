# @php-companion/project

静态读取 Composer 项目、目标 PHP 约束，以及根包和已安装依赖的 PSR-4、PSR-0、classmap、files 与 exclude-from-classmap 规则；同时提供有界、可取消且跳过 vendor/缓存目录的嵌套 Composer 根发现。`disabledExtensions` 仅收集 `config.platform` 或 lock `platform-overrides` 中明确设为 `false` 的合法 `ext-*`，不会从缺少 require 项推断扩展不存在。组件不执行 Composer scripts、项目 autoloader 或业务 PHP。
