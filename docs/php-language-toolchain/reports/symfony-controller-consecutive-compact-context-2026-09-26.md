# Controller 连续赋值的 `compact()` 模板上下文

日期：2026-09-26。范围仅为 SoPHP 源码及隔离测试项目；没有修改业务项目。

## 场景与实现

此前 `render('template.html.twig', compact('user', 'title'))` 只识别紧邻调用的 `$title`，即使 `$user = new User()` 也在同一方法中紧邻 `$title = 'Profile'`。现在分析器从模板调用往前读取连续的同层直接赋值，并按原顺序计算变量类型及 RHS 来源位置。相同规则用于直接返回 `compact()` 的 `#[Template]` 方法。

反向追溯遇到分支、其它语句即停止；若较晚的赋值 RHS 是调用或其它可能影响先前值的表达式，该赋值仍可作为自己的来源，但不继续推断更早变量。例如 `$title = mutate($user)` 后不会把之前的 `$user` 作为已证明的局部模板上下文。未知来源继续标记 `complete: false`。

## 验证

- framework-symfony：67/67；覆盖连续赋值、两种模板入口、RHS 来源和可能改写先前变量的反例。
- controller-context Provider：8/8；覆盖未保存 Controller 快照和两个变量的来源版本。
- 根扩展 TypeScript 检查、上述改动文件的 ESLint 和 `git diff --check`：通过。
- 重新构建 Core、Symfony 与测试宿主后，以 TwigPlus 1.3.8 源码加载完整 10 项 Open Source Pack Profile，隔离 VS Code 1.139.1 Linux x64 Extension Host 退出码 0。宿主实际检查第二个 Twig 变量的补全与跳回 PHP Controller，并跑完组合的 PHP、Symfony、格式化、调试和项目 CLI 测试链。日志：`/tmp/sophp-pack-consecutive-context-20260926.log`。

这是当前源码证据。旧 `15a5254` 安装候选不包含该增量；真实 WSL Remote 和长期使用仍需在下一次候选冻结后验收。
