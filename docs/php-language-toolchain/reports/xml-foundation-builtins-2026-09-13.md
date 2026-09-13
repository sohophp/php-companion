# XML 基础内建目录验收

日期：2026-09-13。范围：PHP 7.2–8.5 的 libxml 与 SimpleXML 基础函数、常量、类型、参数、返回结构和版本边界。

## 已实现

- 独立 `xml.ts` 组件生成版本化目录：PHP 7.2–8.1 含 7 个 libxml 函数，PHP 8.2 起增加 external entity loader getter；PHP 7.2–8.3 含 23 个只依赖 PHP 版本的常量；PHP 8.4 起增加 `LIBXML_RECOVER`，并安全启用在该版本源码中不再受旧 libxml 版本条件控制的三个 flags。
- `LibXMLError` 的六项属性进入成员补全和 Definition；PHP 8.1 起使用原生属性类型。`libxml_get_errors()` 保留 `list<LibXMLError>`，供赋值和 foreach 继续传播。
- `SimpleXMLElement` 与 `SimpleXMLIterator` 覆盖加载、DOM 导入、XPath、namespace、属性、子节点、序列化和迭代成员。PHP 7.2、7.3、8.0、8.1、8.3、8.4 的接口、tentative return、调试方法和 DOM 参数边界按目标版本生成。
- 语义层可从无类模板的命名类读取唯一的具体 `Iterator`、`IteratorAggregate` 或 `Traversable` 泛型父契约，因此 `SimpleXMLElement` 的 foreach 子节点稳定传播为 `SimpleXMLElement`。

## 核对依据

PHP 8.0–8.5 逐版本核对 php-src 的 `ext/libxml/libxml.stub.php` 与 `ext/simplexml/simplexml.stub.php`；PHP 7.2 和 7.4 核对对应 C 注册表。本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 的反射输出用于交叉验证，PHP 7.3/8.0 边界由官方源码和手册确认。逐项入口记录在 `packages/language-spec/SOURCES.md`。

## 精度边界

- `LIBXML_NO_XXE` 需要 PHP 8.4+ 和 libxml 2.13+，`LIBXML_SCHEMA_CREATE` 依赖 schema 编译能力；PHP 8.3 及以下的 `LIBXML_BIGLINES`、`LIBXML_HTML_NOIMPLIED` 与 `LIBXML_HTML_NODEFDTD` 也取决于 libxml 版本。当前规格只能按 PHP 版本选取，因此这些常量只在能够由 PHP 版本证明时声明。
- `simplexml_load_file()`、`simplexml_load_string()` 与 `simplexml_import_dom()` 接受自定义 `SimpleXMLElement` 子类名，但当前类型系统尚未从 class-string 实参把返回值专门化为该子类；它们保守返回 `SimpleXMLElement`。这不会产生错误成员提示。
- libxml、SimpleXML 都可能未在目标 PHP 中启用。项目级扩展发现和能力裁剪尚未完成，因此此目录表达扩展存在时的 API。

## 验证

- language-spec、semantic 和 language-server 的聚焦测试覆盖版本门槛、历史参数名、结构化错误列表、成员、固定迭代值、Signature Help 和内建 Definition。
- PHP 8.5 fixture lint、Extension Host TypeScript 与 ESLint 检查通过。`pnpm check` 通过：十五个组件 571 项、根扩展 33 项，共 604 项测试；三份 VSIX 内容验证通过。
- `pnpm verify:packages` 在隔离消费者中验证十五个组件 tarball。VS Code 1.137.0 的纯净 packaged Profile 与七插件 Open Source Profile 均以退出码 0 完成，真实验证 XML 函数、成员、属性和常量的 Definition 以及工厂/loader 的 Signature Help。日志分别位于 `/tmp/php-companion-xml-final2-pure-logs-20260913-0955` 与 `/tmp/php-companion-xml-final2-profile-logs-20260913-1000`。
- 冻结第三方目录 `/tmp/php-companion-security-profile-i7bBww` 含 1,370 个文件，运行前后 SHA-256 清单完全一致。最终 VSIX SHA-256：主扩展 `74e5abec09119182abe54ec0a89cbc0434f5e0db6400aaeb1122565c812e6fa6`，Open Source Pack `dad5841fa1aabf159ce0ce579c5e9c83bcdd9a53a3dc07bec7fd656c31d62ffc`，Recommended Pack `0650ab84fcf8859377809a4f09806b7b85a8d3d6019dfe4495dd9db3d742fc0b`。
