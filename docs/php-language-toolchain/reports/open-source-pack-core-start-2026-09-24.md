# Open Source Pack 整理与 Core 下一步

日期：2026-09-24。

## Pack 当前范围

唯一维护的组合入口是 Open Source Pack。其 10 个成员为 SoPHP Core、SoPHP Symfony、TwigPlus、Red Hat YAML、Red Hat XML、PHP Debug、PHPUnit & Pest Test Explorer、PHP CS Fixer、EditorConfig、Apache Conf Snippets。Apache 扩展自身声明语法扩展依赖；Pack 不重复列入。Recommended Pack 不参与新候选。

Pack 不安装其它通用 PHP Language Server。PHP、Symfony、Twig、YAML/XML、格式化、测试和调试各有单一主要所有者。清单与冻结 Profile 的机器可读清单一致；Pack 只写扩展 ID，不能固定 Marketplace 成员版本。SoPHP Symfony 当前仍需和 Core 从同一私有候选安装。安装成功不等于完整组合通过。

本轮清除 Pack 中 `symfonyLsp.*` 两项旧默认设置，以及打包校验与组合测试中相应的旧设置。该第三方 Symfony 扩展已退出受支持组合；保留其设置会让当前 Pack 继续配置不存在的能力。PHP DocBlocker 和 PHPStan 仍为独立试用项：前者只负责注释生成，后者需要项目自己的分析配置和兼容运行时，均待同一 Profile 的冲突与响应检查后再决定是否加入默认组合。

## Core 从哪里开始

1. **完成 C1 的实际键入体验。** 在独立 Composer fixture 的隔离 VS Code 宿主中测量从输入成员字符到建议列表可见的时间，核对候选顺序、重复项、旧内容和取消后的恢复。服务器处理时间不能代替列表显示时间。
2. **补 C1 的项目边界。** 用 path repository、符号链接、多个 PHP 目标版本及 auto 运行时探测的正反例，核对项目归属、六项编辑查询、诊断和内建符号；再扩大 vendor 树和未完成输入。
3. **冻结一次组合候选。** 以上问题修复并通过定向回归后，固定 Core、Symfony、Pack 与外部扩展版本；在隔离 Profile 核对唯一 Provider、格式化、测试、调试、Twig/YAML/XML 和失败回退。只有这一步需要生成相应 VSIX 并进行完整组合门禁。
4. **进入 C2。** 以 C1 日常操作暴露的类型和诊断缺口为序，先强化 PHPDoc 类型消费、跨文件类型传播和未保存诊断一致性。注释生成优先验证可选扩展，不预设在 Core 中重做。

R3 的安全重构、框架体验与 R4 的跨版本、跨平台、Remote 和长期使用目标保持不变。自动化与独立 fixture 工作不等待人工使用反馈；真实可见体验和长期稳定性仍需实际操作证据。业务项目仅用于只读对照，不修改其代码。
