# Reflection 核心内建验收

日期：2026-09-13。范围：PHP 7.2–8.5 的高频 Reflection 类、函数、方法、属性、参数、类型、Attribute、类常量与 Enum 反射。

## 已实现

- `ReflectionClass`/`ReflectionObject`、`ReflectionFunctionAbstract`/`ReflectionFunction`/`ReflectionMethod`、`ReflectionProperty`、`ReflectionParameter`、`ReflectionType`/`ReflectionNamedType` 进入共享版本化内建目录。
- `getMethods()`、`getProperties()`、`getParameters()`、`getAttributes()`、`getReflectionConstants()` 与 `ReflectionEnum::getCases()` 保留具体集合元素类型，可经 foreach 继续提供成员补全和 Definition。
- `ReflectionClass<T>` 会从可证明的 `Foo::class` 或 `Foo` 对象构造实参绑定 `T`；`newInstance()`、`newInstanceWithoutConstructor()` 与 `newInstanceArgs()` 随后返回具体 `Foo`，动态字符串保持 unknown。
- 补齐 `ReflectionClassConstant`、PHP 8.0 `ReflectionAttribute`/`ReflectionUnionType`，以及 PHP 8.1 `ReflectionIntersectionType`、`ReflectionEnum`、`ReflectionEnumUnitCase`、`ReflectionEnumBackedCase`。
- PHP 7.2/7.4 modifier 常量值和参数名、PHP 8.0 旧 `export()` 移除、PHP 8.1 tentative returns、PHP 8.2 readonly/prototype、PHP 8.4 lazy object/property hook/typed constants、PHP 8.5 `getMangledName()` 均按目标版本选择。

## 依据

PHP 8.0、8.1、8.2、8.4、8.5 声明逐版本核对 php-src `ext/reflection/php_reflection.stub.php`；PHP 7.2 与 7.4 核对对应 `php_reflection.c` 和运行时反射结果。本机 `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 已核对类关系、方法、参数名、原生/tentative 返回及 modifier 值；本机没有 PHP 7.3/8.0，相关边界由官方源码和相邻版本交叉确认。逐项链接记录在 `packages/language-spec/SOURCES.md`。

## 验证

- `pnpm check` 通过：language-spec 45 项、semantic 238 项、language-server 141 项；十五个组件共 566 项，根扩展 33 项，合计 599 项。TypeScript、ESLint、全部组件/根测试、三份 VSIX 打包和内容检查均通过。
- `pnpm verify:packages` 通过：十五个组件 tarball 均从隔离消费者安装并验证。
- PHP 8.5 fixture lint、Extension Host TypeScript 编译通过。VS Code 1.137.0 的纯净 packaged Profile 与含七项第三方能力的 Open Source Profile 均以退出码 0 完成；Reflection 构造所得 `DateTimeImmutable` 的 `format()` 导航，以及方法、属性、参数、类常量、Enum、lazy object 与 PHP 8.5 mangled-name 的真实 Definition/Signature Help 请求通过。最终日志分别保存在 `/tmp/php-companion-reflection-generic-final-pure-logs-20260913` 与 `/tmp/php-companion-reflection-generic-final-profile-pass-logs-20260913`。
- Open Source Profile 使用 EditorConfig 0.18.2、PHP CS Fixer 0.3.21、PHPUnit 3.9.40、YAML 1.24.0、TwigPlus 1.3.7、Symfony Language Tools 0.20.0 与 PHP Debug 1.40.1；冻结目录 1,370 个文件的 SHA-256 清单运行前后完全一致。
- 主扩展 VSIX SHA-256：`ccd8ecde942fdd3359ed099e63eed54d92a0c44c772f4cecd59d1573cec935a3`。
- Open Source Pack VSIX SHA-256：`1b65928f1e96dd56b085832243c7c17f02a860c14ea4c22e19f1826fc23991a7`。
- Recommended Pack VSIX SHA-256：`bc8f665f5122816b88f464de0eafded89a8a89df456fff39d377fa2baf850a73`。

## 边界

动态反射名称、反射调用目标与运行时可见性不会被静态模型猜测。Extension Host 的合成 Symfony fixture 没有安装 Composer `vendor/`，Symfony Language Tools 0.20.0 因而记录 project bridge status 1；该插件的真实 Winstar 项目复核另见既有报告。Open Source Profile 同配置的一次运行在反向 Safe Move 的 30 秒协调等待处超时，随后对相同最终 VSIX、冻结插件目录和项目工具链完整复跑并以退出码 0 完成；该单次波动不作为跨机器稳定性证据。

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
