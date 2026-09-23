# Alpha 候选试用

本流程用于把已经通过自动门禁的源码提交交给真实项目试用。它不改变公开发布状态。

## 生成与核验

确保当前分支已经提交且工作树干净，然后运行：

```bash
pnpm candidate:alpha
```

命令输出实际候选目录。进入该目录后验证：

```bash
sha256sum -c SHA256SUMS
```

`candidate.json` 是本次试用的权威清单。试用记录必须保存其中的完整提交号、四个 VSIX 摘要和外部插件版本，不能只记录显示版本 `0.4.5`。

从 SoPHP 源码根目录执行只读预检，先验证候选完整性、WSL 环境、Composer 根与项目 PHP 包装器：

```bash
pnpm alpha:preflight -- \
  --candidate artifacts/php-companion-alpha-0.4.5-<commit> \
  --workspace /var/www/php/8.5/winstar2024 \
  --php bin/php-runtime --expected-php 8.5 --require-wsl \
  --output docs/php-language-toolchain/reports/alpha-preflight-winstar.json

pnpm alpha:preflight -- \
  --candidate artifacts/php-companion-alpha-0.4.5-<commit> \
  --workspace /var/www/php/7.2/CoreRepo \
  --php phpbin --expected-php 7.2 --require-wsl \
  --output docs/php-language-toolchain/reports/alpha-preflight-corerepo.json
```

安装扩展后，从实际 VS Code WSL Remote 窗口的集成终端对任一项目追加 `--check-editor`。严格检查要求核心、Symfony 扩展和八个冻结外部扩展版本准确，并且 Open Source Pack 与 Recommended Pack 恰好安装一个。`code --list-extensions` 无法证明扩展运行于哪个 Extension Host，也无法判断已安装的竞争 PHP Provider 是否已禁用；这两项必须在 VS Code Profile 的扩展面板人工确认。

## 安装边界

为试用建立干净 VS Code Profile。依次安装核心、`php-companion-symfony` 和 `php-companion-open-source-pack`；Recommended Pack 是同一已批准组合的独立产品入口，单次 Profile 无需同时安装两个 Pack。两个 Pack 均声明核心和 Symfony 扩展；Symfony 扩展尚未公开发布，试用时须先从同一 Alpha 候选安装其 VSIX。禁用或卸载其他通用 PHP Language Server，避免多个 Provider 共同响应 PHP 请求。

Open Source Pack 当前使用 TwigPlus、Red Hat YAML、Red Hat XML、PHP Debug、PHPUnit、PHP CS Fixer、EditorConfig 和 Apache Conf Snippets（自动依赖 Apache Conf 语法扩展）。JSON/JSONC 使用 VS Code 内建服务。Symfony Language Tools 和 DotJoshJohnson XML Tools 均不进入受支持 Profile，原因与重新准入条件见 [外部插件集成](integrations.md)。

References 渐进索引的 Alpha 验收只在此 Profile 的用户设置中启用，不写入项目的 `.vscode/settings.json`：

```json
{
  "phpCompanion.indexing.mode": "progressive",
  "phpCompanion.indexing.referenceMemoryBudgetMiB": 1536
}
```

该预算是后台准备的软上限，不限制用户主动执行的 References。后台超过预算或输入证明不完整时会停止推测性准备，并由完整按需扫描处理查询。内存较紧张时可改为 768 MiB；允许范围为 768–4096 MiB。若渐进模式引起不适，可将 `indexing.mode` 改回 `onDemand` 并 Reload Window。只在安装包含渐进模式的新候选后启用此设置；旧版 VSIX 不认识它。

## 真实项目检查

分别在 Winstar PHP 8.5 与 CoreRepo PHP 7.2 中完成以下操作，并记录成功、失败、等待时间及可重复步骤：

1. 首次打开项目，分别记录立即执行 References、后台源码事实就绪后首次执行、选中符号预热后首次执行、重载后首次执行的时间；确认索引进度结束，不能把预热后的点击时间当成空缓存冷查询。
2. 在已有类型声明的业务代码中连续使用成员补全、Hover、Signature Help、Definition、Implementation 和 References。
3. 对测试文件执行 Rename、Preview Safe Move、Extract Variable、可证明场景的 Extract Method，以及 PSR-4 类声明上的 Extract Interface；确认预览、应用、Undo 与 Redo。Extract Interface 会复制同一 namespace 的 `use` import；公开方法签名含 `self`/`parent`/`static` 或参数属性、import 别名与新接口名冲突时不提供该操作。
4. 制造一个已支持的参数、返回或 readonly 错误，确认诊断范围与消息；恢复源码后确认诊断消失。
5. 使用项目包装器执行 PHP CS Fixer、PHPUnit 和 Xdebug 入口；不得回退到系统默认 PHP。
6. 在 Twig 模板中验证 TwigPlus；在 YAML、XML、JSON/JSONC 中确认对应外部或内建服务接管；在 `.htaccess` 中确认 Apache Conf 语法和片段可用。
7. 连续编辑至少两小时，记录补全陈旧、CPU、内存、Language Server 重启和任何工作区编辑失败。

F2 Rename 的预览只列出当前工作区与已索引依赖中能证明的引用。对公开 API，工作区外的下游仓库和客户端调用无法验证；应用前还须检查这些使用方。动态调用与未证明的字符串引用也可能不在预览中，不能把工作区内预览视为跨仓库完整性证明。Alpha 试用优先在可撤销的测试文件上操作。

Windows 客户端连接 WSL Remote 时，应在 Remote 窗口确认 SoPHP 和工作区扩展运行于 WSL Extension Host，并让 PHP CLI、Composer 根、formatter 与 PHPUnit 路径都解析到 WSL 项目。保存严格预检 JSON 后再开始两小时会话；Windows 本地安装成功不能代替这项检查。

任何错误结果必须保留最小源码、目标 PHP 版本、索引完整性状态、操作位置和重现步骤。未知场景返回空结果可以记录为能力缺口；错误补全、错误诊断、错误跳转或不完整工作区编辑属于 Alpha 阻断缺陷。
