# Symfony Controller 紧邻赋值的模板上下文

日期：2026-09-27。仅修改 SoPHP 源码与独立 Composer 测试夹具；未修改业务项目，也未生成 VSIX。

此前 `$params = ['user' => $user]; $this->render('page.html.twig', $params);` 和 `#[Template]` 方法中 `$params = compact('user'); return $params;` 都没有 Controller→Twig 变量上下文。Symfony 分析器现在只在使用点前一条同层语句直接给同一变量赋值，且右值是字面量数组或可识别的 `compact()` 时，读取该右值。数组键、值类型及 PHP 来源范围沿用原有直接传参规则；中途写入数组字段、分支或其它语句会阻断这条证明。

新增框架测试先复现两个空结果，修复后检查 `render()` 与 `#[Template]` 的变量类型和来源，并确认修改过的数组不产生模板上下文。Framework Symfony **68/68**、Controller Provider **9/9** 通过；相关 TypeScript、ESLint 与差异检查通过。

完整 10 项 Open Source Pack 的 PHP 8.5 按需源码 Profile 使用 SoPHP Core、SoPHP Symfony 与 TwigPlus，实际核对两个模板的上下文以及 TwigPlus Definition 返回 PHP Controller，Extension Host 退出码 **0**；日志 `/tmp/sophp-symfony-assigned-context-pack10-20260927.log`。同轮的 PHP 编辑、Symfony、格式化、调试与项目 CLI 测试组合链继续通过。

较远的赋值、变量间转发和复杂控制流仍不据此推断模板变量。本源码增量不在 0.4.7 冻结 VSIX 中；真实 WSL Remote、跨平台和持续使用仍属 R4 验收。
