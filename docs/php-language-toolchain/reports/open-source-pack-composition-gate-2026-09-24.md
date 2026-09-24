# Open Source Pack 默认组合宿主门禁

日期：2026-09-24。此轮只在 SoPHP 仓库和临时独立项目中构建、安装与操作；未修改 Winstar 或其它业务项目。目标是检验 Pack 自身及其声明的成员在默认 `onDemand` 模式下能否共同完成日常 PHP 工作流。此次只为这项组合门禁构建 Core、Symfony、Open Source Pack 三份 VSIX，不生成 Recommended Pack。

## 冻结输入

隔离 VS Code 1.139.0 Linux 宿主使用[版本清单](../../../test/extension/open-source-profile.extensions.json)中的 TwigPlus 1.3.7、YAML 1.24.0、XML 0.29.3、PHP Debug 1.40.1、PHPUnit 扩展 3.9.40、PHP CS Fixer 扩展 0.3.21、EditorConfig 0.18.2 和 Apache Conf Snippets 1.4.0；后者自动安装 Apache 扩展 1.2.0。隔离目录经安装脚本逐项核对版本，不含 Intelephense 和被排除的 Symfony Language Tools。独立临时工具目录提供 PHP 8.5.9、PHP CS Fixer 3.95.27、PHPUnit 11.5.56；Composer 项目声明 PHP `>=8.5`，VS Code 内建 PHP 验证使用同一 PHP 可执行文件。

最终复测所用构建的 SHA-256：Core `4f46aa38faefc66aee0a1e814c08c7038bf13c5eabf7727496ff4c1dd272ee7e`、Symfony `b0ff463e0039341389dd7b68b52971774a805ceb6be46d7deacb5cb186de319b`、Open Source Pack `038a3c363f60da36b3e0bd81bb64b26b29af3c40672e4004bea8442001d10b85`。`pnpm verify:vsix` 核对了三份产物；同一文件随后复制到干净 Alpha 候选，摘要未变化。

## 实际执行

Open Source Profile 测试现把三份 VSIX 都解包到隔离 Extension Host，而不是只加载 Core、Symfony 和外部扩展。它核对 Pack 的完整 `extensionPack`、默认关闭 VS Code PHP 基础建议、默认 `onDemand`、唯一 PHP formatter，以及无第二个通用 PHP Language Server。接着在独立 Composer 工作区实际完成：Core 的 PHP Definition/References、Symfony YAML 服务 References、PHP CS Fixer 修改和单步撤销、TwigPlus 与 Red Hat YAML/XML 格式化、VS Code 内建 JSON 格式化、EditorConfig 缩进、PHP Debug 的 PHP 8.5 启动/退出、PHPUnit 单文件与整套运行、测试文件移动/撤销/重做后的重新发现。宿主退出码 **0**；Pack 清单单元测试 **4/4** 通过。

执行入口为 `PHP_COMPANION_TEST_EXTENSIONS_DIR`、`PHP_COMPANION_PHP_EXECUTABLE`、`PHP_COMPANION_PHP_CS_FIXER`、`PHP_COMPANION_PHPUNIT_EXECUTABLE` 指向独立目录后运行 `node scripts/run-extension-test.mjs ./dist-test/runPackagedTest.js`。`pnpm test:extension:open-source-profile` 会先重新构建相应产物；本轮已构建后直接调用相同的宿主入口，避免重复打包。

门禁暴露并修复三项事实：原夹具覆盖基础路由而破坏后续跳转，随后又把用于其他诊断的 Controller 文件一并导入静态路由；现保留原路由并仅导入 Profile Controller。`onDemand` 的首次 YAML 服务 References 原先在容器事实未加载时返回空结果，现先取得完整项目与权威容器事实；普通 PHP 方法引用经词法预检不会因此触发整项目索引，真实 stdio 正反例通过。PHPUnit 11 要求移动后的文件和类名一致，测试现一次编辑两者并在每次运行前保存缓冲区。另以独立 40 Controller 回归验证静态路由默认预算，默认上限从 64 提到 256，显式小预算的不完整性测试继续通过。

## 边界与下一步

干净源码提交 `c280d1c510d3246d73d52e24860d08197d40cba7` 已生成私有候选 `artifacts/php-companion-alpha-0.4.5-c280d1c5/`，仅含 Core、Symfony、Open Source Pack 三份 VSIX；`sha256sum -c SHA256SUMS` 三项均通过。`alpha:preflight` 在仓库的独立 Composer PHP 7.2 夹具与 WSL 中确认候选文件、提交、PHP 包装器和目标次版本，`deterministicPassed=true`、`errors=[]`；结果保存在候选目录的 `preflight-independent-php72.json`。此预检没有启用 `--check-editor`，不声称已验证用户 VS Code Profile。

这项门禁证明**本机隔离宿主中的默认组合操作**，不证明数小时真实编码、WSL Remote/SSH/Windows/macOS、用户项目的 PHP/Xdebug/PHPUnit 路径映射或 R4 完成。Pack 只声明扩展 ID，不会锁定 Marketplace 成员版本；升级后仍须复测。Core 的深度诊断、全部重构和跨版本矩阵由各自门禁负责；此轮发现 `onDemand` 在依赖图未被证明完整时保守地省略同文件 `never` 调用后的三处不可达诊断，继续列为 C2 类型与诊断一致性工作，不用组合冒烟代替这项验收。
