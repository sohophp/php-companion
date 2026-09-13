# 现代 Dom 命名空间内建目录验收

日期：2026-09-13。范围：PHP 8.4–8.5 的 `Dom\` 命名空间 API；PHP 7.2–8.3 不暴露该目录。

## 已实现

- 覆盖 16 个命名空间常量、28 个类型、6 个 Node 位置常量与 `AdjacentPosition` 的 4 个 backed enum case，包括 ParentNode/ChildNode、Implementation、Node、Element、Attr、CharacterData、Document、HTMLDocument、XMLDocument、XPath、TokenList、NamespaceInfo 及四类集合。
- HTML5/XML 文档静态工厂、CSS selector、节点编辑与比较、属性、HTML/XML 序列化、XPath、SimpleXML 导入和经典 DOM 节点导入进入签名、返回传播、补全与内建导航。
- PHP 8.4 原始目录包含 168 个显式方法和 85 个显式属性；加上 backed enum 自动成员后与运行时 171 个声明方法、87 个属性和 10 个类型常量一致。
- PHP 8.5 原始目录包含 171 个显式方法和 89 个显式属性；新增 Element/Document/DocumentFragment 的 `children`、Element 的 `outerHTML`、`getElementsByClassName()` 与 `insertAdjacentHTML()`，加上 enum 自动成员后与运行时 174 个声明方法、91 个属性和 10 个类型常量一致。
- 修复命名空间内 `\Dom\import_simplexml()` 这类完全限定函数的 Signature Help；前导反斜线不再被词法边界丢失。断言驱动的签名推断对确定子问题按工作区状态缓存，并在源码、快照或外部语义事实变化时失效；保留四层精度边界，同时消除大型 fixture 中的指数重复。

## 核对依据

逐项核对 PHP 8.4 与 8.5 的 php-src `ext/dom/php_dom.stub.php`，并在本机 PHP 8.4.23、8.5.9 对全部 `Dom\` 类型执行 ReflectionClass 审计。生成目录与运行时的类型、方法、参数名、属性和常量身份逐项比较一致；手册和源码入口记录在 `packages/language-spec/SOURCES.md`。

## 精度边界

- 目录表达 DOM 扩展存在时的 API；项目级扩展发现和按运行时裁剪尚未完成。
- NodeList、NamedNodeMap、DtdNamedNodeMap 与 HTMLCollection 使用各自官方 `item()` 返回传播元素类型；按自定义 `registerNodeClass()` 映射集合与工厂返回的项目类型仍待后续增强。
- CSS selector 与 XPath 表达式内容不会改变静态返回类型；无效 selector/XPath 的运行时异常不在静态目录中模拟。
- php-src 中受 libxml schema/XPath 构建开关控制的成员按常规完整 DOM 构建提供，扩展能力发现完成后再按实际运行时裁剪。

## 验证

- `pnpm check` 通过：15 个组件 577 项、根扩展 33 项，共 610 项；目录身份自动核对覆盖 PHP 8.4/8.5，语义测试覆盖版本门、HTMLDocument 工厂、selector/集合、TokenList、XPath、SimpleXML 导入、Node 常量、PHP 8.5 新成员及命名空间内完全限定函数签名。
- `pnpm verify:packages` 通过；15 个组件 tarball 均在隔离消费者中完成真实安装与导入。
- 同一最终主 VSIX 在 VS Code 1.137.0 的纯净 Profile 与七插件 Open Source Profile 中均以退出码 0 完成。纯净宿主日志：`/tmp/php-companion-modern-dom-final-exact-pure-logs-20260913-1618`；组合宿主日志：`/tmp/php-companion-modern-dom-final-exact-open-source-logs-20260913-1622`。
- Open Source Profile 包含 TwigPlus、Symfony Language Tools、Red Hat YAML、PHP Debug、PHPUnit、PHP CS Fixer 与 EditorConfig；冻结第三方目录运行前后均为 1,370 个文件，聚合 SHA256 均为 `1f5c87b2dffb64ed8801e6b303d728772b7978d181447ea1bd2ab5dd97a97aad`。
- 最终制品 SHA256：主扩展 `231d1edfa2fee450a5e3ebeeb31171b05aaa6f9810c422e327d1f2b658b522a0`；Open Source Pack `b29bb009fa9e17d7c0a1cd34f98181a2e4527276c8849e18db10bac1aa26f987`；Recommended Pack `c8817f20abe4050574145b42396846b439000a29fb8fea6367cce4047e91933c`。
