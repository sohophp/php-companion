# XML Parser 内建目录验收

日期：2026-09-13。范围：PHP 7.2–8.5 的 XML Parser 22 个函数、错误与 option 常量、资源/对象迁移、参数和返回边界。

## 已实现

- `xml_parser_create()`、namespace 工厂、十类 handler 注册、分段/结构化解析、错误位置、option 读写与释放 API 全部进入共享版本化内建文档。
- 22 个 `XML_ERROR_*`、四个稳定 `XML_OPTION_*` 及 `XML_SAX_IMPL` 覆盖全部目标版本；PHP 8.4 起增加 `XML_OPTION_PARSE_HUGE`。
- PHP 7 工厂保留 `resource|false`，其余函数使用历史参数名；PHP 8.0 起改为不透明 final `XMLParser` 对象并使用现代参数名。
- PHP 8.1 起 `xml_parse_into_struct()` 使用原生 `int|false`，PHP 8.2 起 handler 注册返回 literal `true`，PHP 8.3 起 option 值包含 bool，PHP 8.4 起 handler 使用 `callable|string|null` 原生类型；8.4/8.5 的弃用边界保留在声明元数据中。
- 结构化解析输出以 list entry shape 和 tag-to-position-list 表达，避免把输出误写成无结构数组。

## 核对依据

PHP 8.0–8.5 逐版本核对 php-src `ext/xml/xml.stub.php`；PHP 7.2–7.4 核对 C 注册表。本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 的反射函数、参数、返回与常量清单逐项对照；本机缺少 PHP 7.3/8.0，其边界由官方源码、手册及相邻版本确认。来源入口记录在 `packages/language-spec/SOURCES.md`。

## 精度边界

- handler 的具体 callback 参数随事件种类变化，并且旧版还支持与 `xml_set_object()` 配合的字符串方法名。当前声明精确保留可接受的 callable/string/null 边界，不虚构单一 callback shape。
- 当前语义层尚未实现通用 `@param-out`，因此 `xml_parse_into_struct()` 的两个引用输出展示结构化参数类型，但调用后的空局部数组不会被重写为输出 shape。
- XML 扩展可能未在目标运行时启用。项目级扩展发现和能力裁剪尚未完成，目录表达扩展存在时的 API。

## 验证

- language-spec 与 language-server 聚焦测试已覆盖 PHP 7 历史参数、resource/object 边界、8.1/8.2/8.3/8.4 版本变化、常量 Definition 和 Signature Help。
- PHP 8.5 fixture lint、Extension Host TypeScript 与 ESLint 检查通过。`pnpm check` 通过：十五个组件 571 项、根扩展 33 项，共 604 项测试；三份 VSIX 内容验证通过。
- `pnpm verify:packages` 在隔离消费者中验证十五个组件 tarball。VS Code 1.137.0 的纯净 packaged Profile 与七插件 Open Source Profile 均以退出码 0 完成，真实验证 XML Parser 函数、常量、handler 联合类型和结构解析返回的 Definition/Signature Help。日志分别位于 `/tmp/php-companion-xml-parser-final-pure-logs-20260913-1020` 与 `/tmp/php-companion-xml-parser-final-profile-logs-20260913-1026`。
- 冻结第三方目录 `/tmp/php-companion-security-profile-i7bBww` 含 1,370 个文件，运行前后 SHA-256 清单一致。最终 VSIX SHA-256：主扩展 `d5e742cd7828e458fceb50e3d22fb0e7146b0de2c2eb454529e022d9950076dd`，Open Source Pack `62c319903d63fb8ecd40fe64e2b9e19e65fce352670e400ca007455f0a784ad7`，Recommended Pack `268b9768bcb46eecdf50f9df537a91cbb0f0330e66c94c5ff95646a3508540ee`。
