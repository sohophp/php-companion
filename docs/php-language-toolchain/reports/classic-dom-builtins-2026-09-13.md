# 经典 DOM 内建目录验收

日期：2026-09-13。范围：PHP 7.2–8.5 的经典全局 DOM API；PHP 8.4 起 `Dom\` 命名空间的现代 HTML5/XML API 留给紧接着的独立批次。

## 已实现

- 覆盖 45 个 DOM/XML 节点与异常全局常量、`dom_import_simplexml()`，以及 DOMDocument、DOMNode、DOMElement、DOMAttr、DOMXPath、集合、字符节点、DTD 节点和异常在内的完整经典类型目录。
- PHP 7.2/7.3 保留 20 个运行时类型、111 个方法、旧方法和历史参数名；PHP 7.4 只把 `createProcessingInstruction()`、`importNode()`、`DOMImplementation::createDocument()` 的末端参数按真实 arginfo 改为可选。长期存在但旧生成 stub 未声明的 87 个虚拟属性以无原生类型的 PHPDoc 声明提供准确编辑体验。
- PHP 8.0 引入 DOMParentNode/DOMChildNode 和相关成员；PHP 8.1 使用 22 个类型、126 个方法与 87 个类型属性，并加入 tentative returns；PHP 8.2 将 SimpleXML 导入返回精化为 `DOMAttr|DOMElement`。
- PHP 8.3 增加 parentElement/isConnected、节点比较与根节点、attribute/class/id、replaceChildren 和 adjacent insertion API，达到 137 个方法与 93 个属性；PHP 8.4 增加 DOMNode 六个位置常量、`compareDocumentPosition()`、`DOMXPath::quote()`、`registerPhpFunctionNS()`，并移除 `DOMImplementation::getFeature()`，达到 139 个方法。
- `DOMXPath::query()` 在原生 tentative `mixed` 边界内使用官方运行时结果精化为 `DOMNodeList|false`，使查询结果可继续导航；XMLReader `expand()` 返回的 DOMNode 现在可以进入经典 DOM 成员链。

## 核对依据

PHP 8.0–8.5 逐版本核对 php-src `ext/dom/php_dom.stub.php`；PHP 7.2–7.4 核对 `ext/dom` 的 C arginfo 和注册表。本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 对所有目标类执行 ReflectionClass 审计，并逐项比较类型、方法、参数与属性身份；PHP 7.3、8.0、8.3 由官方源码和相邻运行时交叉确认。来源入口记录在 `packages/language-spec/SOURCES.md`。

## 精度边界

- 目录表达 DOM 扩展存在时的 API；项目级扩展发现和按运行时裁剪尚未完成。
- PHP 7/8.0 的 DOM 属性由扩展 property handler 提供；PHPDoc 声明用于补全、类型传播和导航，不表示普通用户属性存储。
- 经典 DOM 的集合元素目前使用官方基类/联合返回。按自定义 `registerNodeClass()` 映射集合元素类型、XPath 表达式相关返回，以及 PHP 8.4+ 现代 `Dom\` 类型仍待后续批次。
- 断言驱动的签名递归最多继续四层；更深的人工包装链保持 unknown，避免大型方法中的签名、变量类型与 PHPDoc assertion 相互递归产生组合爆炸。普通继承与泛型语义图仍保留 64 层边界。

## 验证

- 自动目录计数覆盖九个目标版本：PHP 7.2–7.4 为 20 类型/111 方法/87 属性；PHP 8.0 为 22/122/87，8.1–8.2 为 22/126/87，8.3 为 22/137/93，8.4–8.5 为 22/139/93；每版均包含 45 个全局常量。
- language-spec 49 项和 language-server 145 项测试通过；语义测试覆盖 PHP 7 必填/可选参数、PHP 8 属性、SimpleXML 导入、DOMDocument/DOMNodeList/DOMXPath 返回、8.3 成员、8.4 静态 API 与 XMLReader 展开节点。
- PHP 8.5 fixture lint、Extension Host TypeScript 与 ESLint 检查均通过。十五个组件 575 项、根扩展 33 项，共 608 项测试通过；十五个 tarball 已从隔离消费者完成安装和导入验证。
- 最终 `php-companion-0.4.5.vsix` 在纯净 VS Code 1.137.0 Profile 中约 5 分钟完成全部真实编辑器场景；同一 VSIX 在包含 TwigPlus、Symfony Language Tools、Red Hat YAML、PHP Debug、PHPUnit、PHP CS Fixer 和 EditorConfig 的 Open Source Profile 中约 9.5 分钟完成组合验收。日志分别保存在 `/tmp/php-companion-classic-dom-final-exact-pure-logs-20260913-1333` 与 `/tmp/php-companion-classic-dom-final-exact-open-source-logs-20260913-1339`。
- 冻结第三方扩展目录验收前后均为 1,370 个文件，聚合 SHA-256 均为 `1f5c87b2dffb64ed8801e6b303d728772b7978d181447ea1bd2ab5dd97a97aad`。
- 最终制品 SHA-256：主扩展 `ba74323488ad7623e108aa240dd7b4ee1d7d5b4eec38f63bc567007efd3efbb8`；Open Source Pack `b283d46dd6c1de639dc61f7ccf8b3bc8f1c3a7cc59258867acfecae6d8ac8a8e`；Recommended Pack `f184d9de598034f0e9db0679e784e7dc9d5c8ea4e83562de5e9dd64db0906456`。
