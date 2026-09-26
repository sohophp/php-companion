# Symfony Controller 的 `compact()` 模板变量上下文

日期：2026-09-26。仅修改 SoPHP 源码与独立 Composer 测试夹具；未修改业务项目，未打包 VSIX。

后续[同层直接赋值的局部变量](symfony-controller-compact-local-context-2026-09-26.md)已通过定向 TwigPlus 宿主；下文“局部变量尚无证明”仅描述本阶段边界。

## 用户可见缺口

`$this->render('page.html.twig', compact('user'))` 原先没有 Controller→Twig 变量上下文，导致模板中的 `user` 缺少来自 PHP 的补全和跳转。`#[Template]` 方法直接 `return compact('user')` 也有相同缺口。框架分析器只接受直接写出的关联数组，定向测试先确认前一种输入返回空上下文。

## 改动

框架分析器现在识别 `render()`、`renderView()` 参数及 `#[Template]` 直接返回的 `compact()` 或 `\compact()` 中的字面量变量名。仅当名字对应当前 Controller 方法已知的参数时，才发布确定的模板变量、类型和 PHP 来源位置。动态参数、无法确认存在的变量名仍标记上下文不完整；带命名空间的其它 `compact` 函数不按内建函数处理。Symfony Controller Context Provider 沿用未保存 PHP 快照传递这些事实，TwigPlus 负责 Twig 编辑体验。

## 验证与边界

- 框架分析的红绿用例覆盖已知参数、动态参数和未知变量名；另有 `#[Template]` 直接返回 `compact()` 的回归。框架完整包级测试 65/65，通过。
- Symfony Provider 的未保存 Controller 用例通过；Provider 完整包级测试 6/6，通过。
- VS Code 1.139.1 Linux x64 的 Core＋Symfony＋TwigPlus 1.3.8 隔离源码宿主，在默认 `onDemand` 下检查 `render(..., compact('user'))`：Controller 上下文包含 `user`，Twig 补全出现 `user`，Definition 回到 PHP 源文件。`#[Template]` 直接返回 `compact('user')` 的 Twig Definition 也通过；原有命名 `render()`、`renderView()` 和 `#[Template]` 用例一同通过，最终宿主退出码 0。
- `pnpm build`、`pnpm --dir packages/php-companion-symfony build`、测试宿主 TypeScript 编译、改动文件 ESLint、`git diff --check` 均退出码 0。

当前只对可证明的参数名发布完整上下文；方法局部变量、数组形式或动态生成的 `compact` 名称尚无完整类型与来源证明。隔离源码宿主不等于已安装 VSIX 或 WSL Remote 验收，旧 `15a5254` 候选也不含本次增量。
