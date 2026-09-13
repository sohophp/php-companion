# R1 首发验收审计（Linux / WSL）

日期：2026-09-06。环境：Linux x64 / WSL，Node.js 22.14.0，pnpm 11.8.0，VS Code 1.136.1。

本报告只关闭已经有自动化或实际运行证据的门槛。Linux / WSL 的 S01–S08 已通过，当前构建形成 R1 首发候选；Windows/macOS 和 R4 不在本结论内。

## 验收结论

| 项目 | 状态 | 本轮证据 |
| --- | --- | --- |
| S01 | 通过 | `pnpm test:extension:packaged` 从本地 VSIX 解包，在 `--disable-extensions`、独立用户目录和独立扩展目录中运行完整 PHP 用例；没有 Intelephense 或其他第三方 PHP LS。Open Source Profile 也显式断言无 Intelephense。 |
| S02 | 通过 | 同一 Extension Host fixture 实际查询成员补全、Hover、Signature Help、Definition、Type Definition、Implementation 和 References，并验证声明与调用位置。semantic 的正反例覆盖未知/Union 不猜测、同名函数隔离、可见性、Trait、继承和调用链。 |
| S03 | 通过 | `project-index.test.ts` 覆盖 Composer 根、vendor 和内建定义；`stdio.test.ts` 覆盖未保存文档优先、监听变更、多根隔离、Remote URI、取消和版本保护；parser/semantic 测试覆盖增量树与全量重建等价。 |
| S04 | 通过 | 生成、Import、类型/函数/成员/局部 Rename 均有应用与 Undo；继承方法参数 Rename 会一次更新接口、实现与各自命名实参，并已验证 Undo/Redo。构造函数、Import、nullable Quick Fix 和类型 Rename 也有 Redo 往返。Safe Move 命令默认开启 Preview；测试从同一编辑计划验证目标 namespace 与引用内容，并验证文件、namespace、引用作为单个 WorkspaceEdit 提交后可用一次 Undo/Redo 完整往返。资源管理器入口另行验证双向移动、移动后协调和重复 import 收敛；原子 Undo/Redo 保证属于 Safe Move 命令。 |
| S05 | 通过 | Extension Host 冻结 corpus 对每个文件比较完整诊断代码集合：17 个已标注错误全部命中，FP=0、FN=0；4 个未知/不完整语义场景全部保守抑制。未知场景占 corpus 4/21（19.05%），其中误报率为 0。该比例只代表首发 corpus，不外推到任意项目。所有默认诊断另有对应单元、协议或 Extension Host 正反例。 |
| S06 | 通过 | [Open Source Profile 报告](open-source-profile-linux-wsl-2026-09-06.md)记录 PHP/Twig/YAML/JSON formatter、EditorConfig、Xdebug 和 PHPUnit 的实际运行闭环。 |
| S07 | 通过（Linux / WSL） | 1k/10k/50k 冷索引各 5 次均低于冻结预算；打包 VSIX 已在 VS Code 1.136.1 隔离 Profile 中通过。Windows 原生和 macOS 未纳入本次声明。 |
| S08 | 通过 | integrations、releases、pack README 和组合报告已记录插件版本、许可证、免费边界、安装方式、Provider 所有权、PHP CS Fixer 内置 PHAR 限制及回退原则。 |

十三个 `@php-companion/*` 组件另外通过 K01–K06：真实 tarball 在仓库外消费者安装，内部依赖转换为 caret semver，无 workspace 残留；parser 从任意工作目录加载 WASM；Language Server 通过 npm bin/stdio 完成初始化和 PHP 文档符号请求。

## 可复现命令

```bash
pnpm check
pnpm verify:packages
pnpm test:extension
pnpm test:extension:packaged
```

Open Source Profile 的完整命令和外部扩展目录见组合报告。Winstar 的 PHP 格式化、调试和 PHPUnit 均通过项目 runtime wrapper 执行。

## 后续范围

1. 在 Windows 原生和 macOS 重复 S01–S08 平台矩阵，不把本次 Linux / WSL 结果外推到其他平台。
2. 按 P0–P9 继续扩大精准语义、框架理解和安全重构，最终以 R4 F01–F14 验收目标体验。

## 诊断 corpus 口径

冻结样例位于 `test/extension/baseline`，断言位于 `test/extension/suite/index.ts`。正例覆盖语法、不可达、final 继承、方法覆盖、参数数量/名称/顺序/类型、返回类型、属性赋值、成员可见性/静态性/nullability/缺失、接口实现、未使用 import 和 PSR-4 namespace。未知反例覆盖 `mixed` 接收者、`__call`、无法解析的父类层级，以及 nullable 接收者上的不存在成员。

- TP：17
- FP：0
- FN：0
- 精确率：100%
- 召回率：100%
- 未知/不完整场景：4/21（19.05%），均正确抑制

这是一组有边界的首发回归门槛，不代表真实世界总体准确率。新增默认诊断必须同时增加正例、合法反例和 corpus 统计；未通过时默认关闭。
