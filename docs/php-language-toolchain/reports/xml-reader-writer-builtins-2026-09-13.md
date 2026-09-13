# XMLReader / XMLWriter 内建目录验收

日期：2026-09-13。范围：PHP 7.2–8.5 的 XMLReader 与 XMLWriter 完整公开类、过程式函数、属性、常量、参数、返回和版本边界。

## 已实现

- `XMLReader` 覆盖 22 个 node/parser 常量、14 个虚拟读取属性和 25 个基础公开方法；PHP 8.4 起增加 `fromUri()`、`fromString()`、`fromStream()`，达到 28 个方法。
- Reader 的 attribute/namespace/navigation/validation/schema/string/expand API 全部进入成员补全、Signature Help 与 Definition。`open()`/`XML()` 保留 `XMLReader|false`；`expand()` 保留 `DOMNode|false`。
- `XMLWriter` 覆盖 42 个过程式函数及对应对象方法、两个 open 方法和 PHP 8.4 起三个 `to*()` 静态工厂。元素、属性、namespace、PI、CDATA、DTD、内存输出与 flush 均有精确参数和返回。
- PHP 7 保留 XMLReader 的旧参数名与实例 factory 反射形态、XMLWriter 的 `$xmlwriter`/`$uri`/`$subset` 等历史名称、resource 工厂返回和仅双参数的 `writeDtdEntity()`。PHP 8.0 切换对象参数与现代签名；PHP 8.1 应用 tentative returns 和 Reader 类型属性；PHP 8.3 `close()` 为 true；PHP 8.4 使用 typed constants 并增加六个静态工厂。

## 核对依据

PHP 8.0–8.5 逐版本核对 php-src 的 XMLReader/XMLWriter stub；PHP 7.2–7.4 核对 C 注册表。本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 的完整 ReflectionClass、过程式函数和常量清单用于反向比较；PHP 7.3/8.0 由官方源码和相邻版本交叉确认。来源入口记录在 `packages/language-spec/SOURCES.md`。

## 精度边界

- XMLReader 的 14 个属性由扩展属性 handler 提供；声明用于精确读取类型和导航，不表示普通用户属性存储。
- `XMLReader::expand()` 暂时引用后续 DOM 批次将提供的 `DOMNode`；在 DOM 目录封板前，不对其成员链宣称完整支持。
- XMLReader/XMLWriter 都可能未在目标运行时启用。项目级扩展发现和能力裁剪尚未完成，目录表达扩展存在时的 API。

## 验证

- language-spec 与 language-server 聚焦测试覆盖目录数量、PHP 7 历史签名、resource/object 边界、8.1/8.3/8.4 变化、属性/常量/现代工厂 Definition、返回传播和 Signature Help。
- PHP 8.5 fixture lint、Extension Host TypeScript 与 ESLint 检查均通过。`pnpm check` 验证十五个组件 573 项和根扩展 33 项，共 606 项测试；三份 VSIX 内容检查通过。
- `pnpm verify:packages` 在隔离消费者中验证十五个组件 tarball。VS Code 1.137.0 的纯净 packaged Profile 与七插件 Open Source Profile 均以退出码 0 完成，真实验证 XMLReader/XMLWriter 的函数、方法、属性、常量 Definition 与工厂、成员和过程式 API Signature Help。日志分别位于 `/tmp/php-companion-xml-io-final3-pure-logs-20260913-1056` 与 `/tmp/php-companion-xml-io-final-profile-logs-20260913-1101`。
- Open Source Profile 测试前后 1,370 个冻结第三方插件文件 SHA-256 清单完全一致。运行中的 Symfony Language Tools 输出既有 EPIPE/stream 日志，但完整功能断言与 Extension Host 最终退出码为 0。
- 候选 SHA-256：主 VSIX `a6ca312c072b4a5e1374406b5d4c819b4bf268d19853bf584ef4b64c2b735718`；Open Source Pack `f72daff2a67e29f4f5e3520514572a81bfd01689bc77f29b5edc1a4b6661e465`；Recommended Pack `27cead75203d3e8e62d665aa7900e498a82455a009ff1098c5b95d1ee3c9d0d4`。
