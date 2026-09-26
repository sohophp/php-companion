# Controller 局部变量通过 `compact()` 进入 Twig

日期：2026-09-26。仅修改 SoPHP 源码与独立测试夹具；未修改业务项目，未打包 VSIX。

## 输入与证明范围

前一阶段只识别 `compact('user')` 中的 Controller 方法参数。现在支持紧邻 `render()` / `renderView()` 或 `#[Template]` 返回语句之前、同一方法体顶层的直接赋值，例如：

```php
$user = new User();
return $this->render('user.html.twig', compact('user'));
```

分析器从赋值右侧提取初步类型，并把它的真实源码范围交给 Core 语义层继续细化。因此调用时变量已存在这一点可由语句顺序证明；即使右侧类型暂时未知，模板键仍可出现，类型保持未知而不编造结果。`#[Template]` 的两句式方法也使用相同规则。分支赋值、非紧邻赋值和中间可能改写变量的语句继续返回不完整上下文。

## 验证

- 框架分析先用红灯夹具复现局部变量缺失，再验证直接 `new User()`、待语义层推断的方法调用、分支赋值及中途调用反例。完整框架测试 66/66 通过。
- Controller Provider 对未保存快照的直接赋值用例通过；完整 Provider 测试 7/7 通过。
- VS Code 1.139.1 Linux x64 的 Core＋Symfony＋TwigPlus 1.3.8 隔离源码宿主，在默认 `onDemand` 下验证 `localUser` 的 Twig 补全与 Definition、`#[Template]` 局部 `selected` 的 Definition；现有命名 `render()`、`renderView()`、参数 `compact()`、属性编辑、Revert 和旧来源撤销一同通过。宿主退出码 0。
- 框架和 Provider 构建、Symfony 源码 bundle、Core 源码 bundle、宿主 TypeScript 编译、改动文件 ESLint 及 `git diff --check` 均通过。

后续[完整 10 项源码组合复核](open-source-pack-compact-local-composition-2026-09-26.md)也已通过，本段之前的定向宿主结论仍保留为独立证据。旧 `15a5254` VSIX 不含该功能，真实 WSL Remote 与长会话仍待 C4 验收。
