# Open Source Pack 当前状态与 SoPHP 下一步

日期：2026-09-27。当前源码清单以 [Pack manifest](../../../packages/php-companion-extension-pack/package.json) 为准。只整理 SoPHP 仓库及独立夹具，不修改业务项目。

## 可用组合

Open Source Pack 的 10 个直接成员是 Core、Symfony、TwigPlus、Red Hat YAML、Red Hat XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets、PHP DocBlocker。Core 是通用 PHP 语言服务；Symfony 只补框架事实；Twig/YAML/XML、调试、格式化、编辑约定、Apache 片段和 PHPDoc 注释生成继续由各自成熟扩展负责。PHPUnit/Pest 默认走项目 CLI。旧 Recommended Pack 已停止维护；公开 Marketplace 上的 Open Source Pack 仍是旧清单，不能用它代替当前私有候选。

最新可安装的私有候选冻结于 [`248ee1f8`](open-source-pack-047-postfreeze-alpha-2026-09-27.md)，包含同批 Core、Symfony、Pack 三份 VSIX，并固定八个外部成员的版本。它已通过隔离 Linux 的完整组合宿主、PHP 7.2–8.5 九个目标设置的 C1 宿主，以及 WSL2 自动化规模基准。当前源码之后的修复没有进入该候选。真实 VS Code WSL Remote 安装、Extension Host 归属、实际 PHP/formatter/debugger 路径、人工编辑操作及其它平台尚无完成证据。

## 从哪里继续

1. **保持 Pack 清单稳定。** 不因 Core 的小修复换成员或重打三份 VSIX。外部成员升级须重新核对版本、职责冲突和组合操作链。测试视图扩展先保持可选：原版 PHPUnit/Pest Test Explorer 在完整组合的文件 Rename 后有旧路径异常。
2. **先收口 Core 的可复现错误。** 当前 F02 真实 CLI 对照发现 PHP 8.5 无操作数 `(void)` 转换漏报，已在源码修复并加入 PHP 7.2、7.4、8.1、8.2、8.4、8.5 对照；见[诊断记录](f02-void-cast-runtime-2026-09-27.md)。随后继续 C1/C2 的实际输入、补全、导航与未保存编辑反馈，按用户可见错误和等待时间排优先级。PHPDoc 注释生成继续交给 PHP DocBlocker，Core 只消费与反馈项目类型。
3. **C3 只追确定的阻断项。** 最终 `WorkspaceEdit.createFile` 兜底路径的 Redo 仍不能恢复文件；完整 C3 打包宿主曾偶发 VS Code `Canceled`，后续两次通过但根因未明。用独立复现和阶段日志定位，避免把偶发绿灯当稳定结论。
4. **下一交付点再做 C4。** 将以上源码修复合入一个干净提交后，同批冻结 Core、Symfony、Pack；核对摘要及八个外部成员版本，再在真实 WSL Remote Profile 完成安装位置、唯一 PHP Provider、PHP→Symfony/Twig/YAML/XML→格式化→调试→CLI 测试与编辑撤销链。Windows/macOS、持续会话和 R4 的其余门槛随后逐项验收。

这套组合已经能在**已验证的隔离 Linux 范围**开展 PHP 开发；真实 Remote 与 R4 最终完成仍按各自验收记录判断。人工使用反馈可随时进入上述顺序，不阻塞独立源码与自动化工作。
