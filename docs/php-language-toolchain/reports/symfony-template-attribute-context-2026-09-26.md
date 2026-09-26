# Symfony Template 属性的 Controller→Twig 上下文

日期：2026-09-26。范围为独立 SoPHP Symfony Provider 与 TwigPlus 源码组合；未修改业务项目，未打包 VSIX。

[Symfony 模板文档](https://symfony.com/doc/current/templates.html)支持在控制器方法标注 `#[Template('...')]`，并直接返回传给模板的参数数组。此前 Controller 上下文分析只识别 `render()`/`renderView()`，这种写法在 Twig 中没有变量来源。新增框架回归先得到空结果。

现在只识别解析后唯一指向 `Symfony\Bridge\Twig\Attribute\Template` 的属性、字面量模板名、公开方法中直接返回的数组；数组键沿用现有 Controller context 精确来源范围，参数类型沿用原生方法签名。动态返回、同名自定义属性、未知模板名和多条方法体语句不会被猜成完整上下文。独立 Provider 的源码预筛也已包含 `Template`，所以没有 `render` 调用的 Controller 仍会被处理。

框架分析器 62/62、Controller Provider 5/5 通过，两个包的 TypeScript 与相关 ESLint 通过。VS Code 1.139.1 Linux x64 隔离源码宿主同时加载 SoPHP Core、Symfony 和 TwigPlus：属性模板的 `user` 变量经 PHP→Twig 桥发布，Twig Definition 返回 PHP 来源；原有命名 `render()`、`renderView()` 和未保存模板切换/恢复链同轮通过，Extension Host 退出码 0。

冻结的 `15a5254` 候选未包含这项源码增量，已安装 VSIX、真实 WSL Remote、动态或复杂返回路径仍待后续组合验收。

## 默认 onDemand 模式补验

最初的宿主样例把 `#[Template]` 和 `render()` 放在同一文件，会让旧候选扫描因 `render` 命中，不能证明属性独立可用。改用完全没有 `render` 调用的 `AttributeOnlyController.php` 后，默认 `onDemand` 三扩展宿主在 30 秒内得不到它的上下文，退出码 1。语言服务器当时只为符号 `render` 建立候选摘要，还会在调用独立 Provider 前排除不含 `render` 的编辑快照。

现将 `template` 加入按需源码摘要筛选，并让编辑快照预筛与 Symfony Provider 的 `render|template` 规则一致；进度文字改为扫描 Controller 模板上下文。相同独立控制器在 VS Code 1.139.1 Linux x64 的 `onDemand` 宿主通过：Symfony 提供完整变量来源，TwigPlus Definition 指向该 PHP 文件，原有命名 `render()`、`renderView()`、未保存模板切换和撤销后的磁盘恢复同轮通过，Extension Host 退出码 0。现有 controller-context stdio 回归通过；语言服务器类型检查、相关 ESLint 和差异检查通过。

随后同一默认 `onDemand` 宿主对这个独立属性控制器执行未保存模板名修改、删除属性、编辑器 Revert 和关闭标签页。每一步均核对 SoPHP 桥中的上下文，并从 TwigPlus Definition 核对新模板来源出现、旧模板来源撤销、删除属性后来源消失及恢复磁盘版本后来源重现；Extension Host 退出码 0。这个流程没有修改独立测试项目以外的 PHP 代码。
