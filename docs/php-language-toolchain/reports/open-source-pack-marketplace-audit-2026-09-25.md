# Open Source Pack Marketplace 与源码清单核对

日期：2026-09-25。只读查询 VS Code Marketplace Gallery API，并下载公开 VSIX 检查其中的 `extension/package.json`；未发布、安装或重新打包扩展。

## 安装入口的实际状态

| 项目 | Marketplace 实际状态 | 当前源码决定 |
| --- | --- | --- |
| [SoPHP Open Source Pack](https://marketplace.visualstudio.com/items?itemName=sohophp.php-companion-open-source-pack) | 公开版为 0.4.5；VSIX 中仍有 PHPUnit 测试视图、CSS Peek、数据库客户端等旧成员，没有 Symfony、YAML、XML、Apache 片段与 PHPDoc | 源码 `extensionPack` 为 Core、Symfony 和 8 个外部扩展；公开版不能用于验收这套组合 |
| [SoPHP Symfony](https://marketplace.visualstudio.com/items?itemName=sohophp.php-companion-symfony) | Gallery API 按完整扩展 ID 查询无结果 | 当前仍须与 Core、Pack 同批私有 VSIX 安装；仅安装公开 Pack 不会得到当前 Symfony 能力 |
| [Apache Conf Snippets](https://marketplace.visualstudio.com/items?itemName=eiminsasete.apacheconf-snippets) | 公开 1.4.0 VSIX 的 `extensionDependencies` 确认为 `mrmlnc.vscode-apache` | Pack 保留片段扩展；Apache 语法扩展由依赖关系安装，不重复列为直接成员 |

公开 Pack VSIX SHA-256：`3297fb9f9c1be35d75cafe9a7b12c20a057b096477d7dc2f6d57b5821cd91b74`。Apache Conf Snippets VSIX SHA-256：`941d11edec5b07606b9be6fdbb945a6a363fd214bf484eac1f348dd3a95f397f`。摘要只标识本次下载的公开文件，不是新候选的摘要。

## 外部成员版本快照

以下是 Gallery API 于本日返回的最新稳定版本；它们是下一次候选冻结时的**待验证版本**，不是本仓库已有隔离 Profile 的测试结论。Pack 的 `extensionPack` 只列 ID，不固定安装版本。

| 直接成员 | 最新稳定版 | 现有 Profile 版本 |
| --- | ---: | ---: |
| [TwigPlus](https://marketplace.visualstudio.com/items?itemName=sohophp.twig-plus) | 1.3.7 | 1.3.7 |
| [Red Hat YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) | 1.24.0 | 1.24.0 |
| [Red Hat XML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml) | 0.29.3 | 0.29.3 |
| [PHP Debug](https://marketplace.visualstudio.com/items?itemName=xdebug.php-debug) | 1.40.2 | 1.40.1 |
| [PHP CS Fixer](https://marketplace.visualstudio.com/items?itemName=junstyle.php-cs-fixer) | 0.3.21 | 0.3.21 |
| [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) | 0.18.2 | 0.18.2 |
| [Apache Conf Snippets](https://marketplace.visualstudio.com/items?itemName=eiminsasete.apacheconf-snippets) | 1.4.0 | 1.4.0 |
| [PHP DocBlocker](https://marketplace.visualstudio.com/items?itemName=neilbrayfield.php-docblocker) | 2.7.0 | 2.7.0 |

Gallery API 的最新记录中，YAML `1.25.2026092308` 和 XML `0.29.2026091508` 标为预发布，因此本表取稳定版。PHP Debug `1.40.2` 比现有测试 Profile 的 `1.40.1` 更新；不修改已冻结 Profile，待下一次候选运行调试链后再升级并记录实际安装摘要。

## 下一步交付门槛

1. 保持源码 10 项清单与项目 PHPUnit/Pest CLI 测试入口；不通过公开旧 Pack 安装当前组合。
2. C1/C2 与 C3 当前阻断项收口后，只冻结**一次** Core、Symfony、Pack 三份同批 VSIX，并记录八个外部成员的实际版本和摘要。
3. 在干净 Profile 安装三份候选，核对扩展依赖、唯一 PHP Provider、PHP/Twig/YAML/XML/格式化/调试/测试链，再做 WSL Remote 和实际编辑器操作。
4. 公开 Marketplace 页面与当前源码保持区分；公开发布或下架旧入口需要另行决定。R4 最终验收仍以真实安装组合为准。
