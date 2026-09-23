# Open Source Pack 整理与 Core 下一步

日期：2026-09-24。

## Pack 当前范围

唯一维护的组合入口是 Open Source Pack。其 10 个成员为 SoPHP Core、SoPHP Symfony、TwigPlus、Red Hat YAML、Red Hat XML、PHP Debug、PHPUnit & Pest Test Explorer、PHP CS Fixer、EditorConfig、Apache Conf Snippets。Apache 扩展自身声明语法扩展依赖；Pack 不重复列入。Recommended Pack 不参与新候选。

Pack 不安装其它通用 PHP Language Server。PHP、Symfony、Twig、YAML/XML、格式化、测试和调试各有单一主要所有者。清单与冻结 Profile 的机器可读清单一致；Pack 只写扩展 ID，不能固定 Marketplace 成员版本。SoPHP Symfony 当前仍需和 Core 从同一私有候选安装。安装成功不等于完整组合通过。

本次复核 `extensionPack` 与冻结 Profile 的 8 个默认外部成员一致，`test/unit/extension-pack.test.ts` 的 4 项 manifest 检查通过。[Apache Conf Snippets 1.4.0 的上游 manifest](https://github.com/hrdtbs/vscode-apacheconf-snippets/blob/master/package.json)明确声明 `mrmlnc.vscode-apache` 为扩展依赖，Pack 无须重复列出。[公开 Marketplace 的 Open Source Pack 页面](https://marketplace.visualstudio.com/items?itemName=sohophp.php-companion-open-source-pack)仍显示旧版说明，不能据此判定当前仓库候选已经公开或具备本地 manifest 的成员；本地 0.4.5 组合以同次冻结的三个 VSIX 和摘要为准。外部扩展的冻结版本仅用于隔离 Profile 验收，不由 Pack 安装时锁定。

本轮清除 Pack 中 `symfonyLsp.*` 两项旧默认设置，以及打包校验与组合测试中相应的旧设置。该第三方 Symfony 扩展已退出受支持组合；保留其设置会让当前 Pack 继续配置不存在的能力。PHP DocBlocker 和 PHPStan 仍为独立试用项：前者只负责注释生成，后者需要项目自己的分析配置和兼容运行时，均待同一 Profile 的冲突与响应检查后再决定是否加入默认组合。

## Core 从哪里开始

2026-09-24 的独立 Composer 实测给出第一个具体阻塞：锁定的真实 vendor fixture 有 1,029 个 PHP 文件；加入 9,100 个无关项目文件和 1 个 Consumer 后，总量 10,130。`ResponseInterface::getStatusCode()` 的 Definition 仍找到 vendor 接口，但默认 10,000 文件预算下 Implementation 在单次 1,697 ms 请求后返回“搜索不完整”，找不到位于已安装 Guzzle 依赖中的实现。相同 fixture 不加噪声文件时 Implementation 在单次 765 ms 请求中正确找到实现。这是一次本机基线，不是延迟分布或跨平台结论；可用 `node scripts/benchmark-implementation-boundary.mjs 0` 和 `node scripts/benchmark-implementation-boundary.mjs 9100` 复现。

1. **先修复 C1 的预算边界。** 对 Implementation 的有界名称候选扫描保留搜索完整性证明，使无关项目文件占满预算时仍能检查已安装依赖；`rg` 失败、超时、文件变化或超过实际候选读取预算时继续明确返回不完整。增加超过 10,000 文件的真实 stdio 正反例，并复测结果、等待和取消。
2. **继续核对 C1 的实际键入体验。** 已有独立宿主的可见补全基线；下一轮在更大依赖树和持续未保存编辑中记录候选顺序、重复项、旧内容与等待分布。服务器处理时间不能代替列表显示时间。
3. **补 C1 的其余项目边界。** path repository、符号链接、显式 PHP 版本和 auto 运行时探测已有首批正反例；继续核查更多环境、跨根、较大 vendor 和未完成输入。
4. **冻结一次组合候选。** 以上问题修复并通过定向回归后，固定 Core、Symfony、Pack 与外部扩展版本；在隔离 Profile 核对唯一 Provider、格式化、测试、调试、Twig/YAML/XML 和失败回退。只有这一步需要生成相应 VSIX 并进行完整组合门禁。
5. **进入 C2。** 以 C1 日常操作暴露的类型和诊断缺口为序，先强化 PHPDoc 类型消费、跨文件类型传播和未保存诊断一致性。注释生成优先验证可选扩展，不预设在 Core 中重做。

R3 的安全重构、框架体验与 R4 的跨版本、跨平台、Remote 和长期使用目标保持不变。自动化与独立 fixture 工作不等待人工使用反馈；真实可见体验和长期稳定性仍需实际操作证据。业务项目仅用于只读对照，不修改其代码。
