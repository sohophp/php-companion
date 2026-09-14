# XML 扩展选型

日期：2026-09-14

## 结论

Open Source Pack 与 Recommended Pack 采用 `redhat.vscode-xml`，不加入 `DotJoshJohnson.xml`。

DotJoshJohnson XML Tools 的功能包括 XML 格式化、树视图、XPath 与 XQuery 工具，许可证为 MIT；但最新发布 `2.5.1` 停留在 2020-07-18，仓库最后代码提交也停留在 2020-07-18。其运行依赖固定为未加 scope 的 `xmldom@^0.1.27`；该包维护者已明确所有现存版本至少受一个安全漏洞影响、应视为废弃且无法再发布修复。因此它不满足默认开发环境对持续维护和依赖安全的要求。

Red Hat XML 当前版本为 `0.29.3`，2026-06-08 发布，仓库在 2026-09-13 仍有更新，采用 EPL-2.0。它基于 LemMinX，提供 XML 语法诊断、补全、格式化、Document Symbol、引用、重命名、DTD/XSD 校验与补全、XSL、XInclude、Catalog 和 Code Action。Windows、macOS 与 Linux x86_64 可直接使用二进制服务器，基础能力不要求 Java；扩展 LemMinX 本身时才需要 Java 11+。

能力归属如下：

- XML 文档编辑、Schema、导航和格式化：`redhat.vscode-xml`；
- PHP 中的 libxml、SimpleXML、XML Parser、XMLReader、XMLWriter、DOM 类型与调用语义：PHP Companion；
- Symfony 容器 XML 的 PHP 服务语义提取：`@php-companion/framework-symfony`。

两份扩展包显式把 `redhat.vscode-xml` 设为 `[xml]` 默认 formatter。组合 Extension Host 测试要求扩展存在，并通过真实 Format Document Provider 检查嵌套 XML 被格式化；不会用 PHP Language Server 重复实现 XML 文档能力。

## 验证

- 两份 Pack 的 manifest 单测通过；三份 VSIX 构建与内容校验通过，校验器要求九个批准成员及 XML formatter 所有权完全一致。
- 隔离目录实际安装 PHP Companion 0.4.5、TwigPlus 1.3.7、Symfony Language Tools 0.20.2、Red Hat YAML 1.24.0、Red Hat XML 0.29.3、PHP Debug 1.40.1、PHPUnit 3.9.40、PHP CS Fixer 0.3.21 与 EditorConfig 0.18.2。
- VS Code 1.137.0 的完整 Open Source Profile 以退出码 0 完成；真实 XML 与 YAML formatter、Twig、JSON、PHP 格式化、EditorConfig、Xdebug、PHPUnit、Symfony 静态能力和 PHP Companion 全套编辑场景均通过。
- Red Hat YAML/XML 的语言服务器首次启动使用统一 30 秒门限；原有 5 秒 YAML 门限在加入 XML 后连续两次于进程刚启动时超时，功能断言未放宽。最终运行日志位于 `/tmp/php-companion-redhat-xml-final-logs-*`。
- 两个 Red Hat 扩展共同贡献 `redhat.telemetry.enabled` 时，VS Code 记录一次重复配置注册 warning；两者仍成功激活并返回各自 formatter 编辑，未形成 provider 所有权冲突。后续版本升级继续观察该上游提示。

## 来源

- [DotJoshJohnson XML Tools 仓库](https://github.com/DotJoshJohnson/vscode-xml)
- [DotJoshJohnson XML Tools 2.5.1](https://github.com/DotJoshJohnson/vscode-xml/releases/tag/v2.5.1)
- [xmldom 安全策略](https://github.com/xmldom/xmldom/security)
- [Red Hat XML Marketplace 页面](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)
- [Red Hat XML 仓库](https://github.com/redhat-developer/vscode-xml)
- [Red Hat XML 0.29.3](https://github.com/redhat-developer/vscode-xml/releases/tag/0.29.3)
