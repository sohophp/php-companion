# Open Source Pack 清单核对与 Symfony `compact()` 来源

日期：2026-09-27。改动只在 SoPHP 隔离工作树，未修改业务项目，也未重新打包 VSIX。

## Pack 整理结果

`extensionPack` 与 `test/extension/open-source-profile.extensions.json` 顺序、ID 一致：Core、Symfony 和八个外部成员，共 10 项。manifest 定向测试 4/4 通过。当前私有候选 `248ee1f8` 的 `candidate.json` 固定了三份 0.4.7 VSIX 及八个外部成员版本；现有 `SHA256SUMS` 三项复核通过。Pack 的扩展 ID 不锁定 Marketplace 后续安装的外部版本。

能力所有者保持为：Core 负责通用 PHP，Symfony 负责可证明的框架事实，TwigPlus 负责 Twig，Red Hat YAML/XML 负责配置语言，PHP Debug 负责 Xdebug，PHP CS Fixer 负责 PHP 格式化，DocBlocker 负责生成 PHPDoc，EditorConfig 和 Apache Conf Snippets 负责各自的编辑辅助。PHPUnit/Pest 默认使用项目 CLI；测试视图留作独立可选项。Recommended Pack 不再维护。公开 Marketplace 的 Open Source Pack 页面仍显示旧版说明，试用当前组合须使用同一私有候选的 Core、Symfony、Pack 三份 VSIX。

## 接着修复的可见错误

Symfony Controller 调用 `compact('user')` 时，先前只按函数文本判断，会把 `use function Vendor\compact` 或当前命名空间内的同名函数当成 PHP 内建 `compact()`，从而向 TwigPlus 传入虚假的 `user` 上下文。现在框架分析先核对当前文件的函数导入和声明；已知同名覆盖时不发布该上下文，显式 `\compact()` 仍发布正确变量。Provider 的未保存缓冲区测试覆盖自定义函数与全局函数之间的切换。

框架测试 69/69、Controller Context Provider 10/10、定向 ESLint、TypeScript 构建及 `git diff --check` 通过。VS Code 1.139.1 的 Core＋Symfony 源码宿主在默认 `onDemand` 模式下检查了 Twig 互操作上下文：自定义导入函数不产生上下文，显式全局函数产生 `user` 来源；宿主退出码 0。跨文件、同命名空间内未导入的函数声明尚无独立解析证明；在这种未知情况下保留原有裸 `compact()` 行为。本次源码修复不在现有 `248ee1f8` VSIX 中，真实 WSL Remote 和安装候选的 TwigPlus 可见交互仍属于后续验收。

## SoPHP 下一步

下一项先在独立 Composer 项目复现**同命名空间、不同文件声明的 `compact()`**：核对 PHP 实际解析目标与 Symfony→Twig 上下文，证明能识别时再扩展索引事实；同时验证未保存 Controller 编辑后，错误 Twig 变量能撤销。之后回到普通 PHP 的 C1 候选可见性和 C2 补全、Hover、定义、诊断同版本反馈，按可复现的用户影响排序。每项修复先做框架/语义及真实 LSP 或 Provider 回归，再运行受影响的 VS Code 源码宿主；仅到下一交付点才同批冻结三份 VSIX。C3 的 `WorkspaceEdit.createFile` 兜底 Redo 与偶发 `Canceled` 仍单列，C4 的真实 Remote、跨平台和长会话验收保持开放，R4 的 PhpStorm 式日常体验是最终目标。
