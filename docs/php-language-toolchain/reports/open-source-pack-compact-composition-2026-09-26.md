# Open Source Pack 完整组合复核：Controller `compact()`

日期：2026-09-26。Core、Symfony、Pack 从当前 SoPHP 源码加载，TwigPlus 从 `/var/www/node/twig-plus/packages/vscode` 1.3.8 源码加载；其余七个直接外部成员使用隔离目录 `/tmp/sophp-pack-source-context-20260926` 中的固定版本。测试项目由宿主在临时目录创建，未修改 Winstar 或其它业务项目，未生成 VSIX。

后续[局部变量增量](symfony-controller-compact-local-context-2026-09-26.md)已通过 Core＋Symfony＋TwigPlus 定向宿主，但尚未重新运行此完整 Pack 门禁；以下结论只覆盖当时的源码快照。

该增量随后已通过[新一轮完整 10 项组合](open-source-pack-compact-local-composition-2026-09-26.md)。

前一轮 Core＋Symfony＋TwigPlus 宿主已验证 `render(..., compact('user'))` 的 Twig 补全、Definition 和 `#[Template]` 直接返回 `compact('user')` 的 Definition。本轮在完整 10 项 Profile 下重新运行现有 PHP Definition/References、C2 未保存参数与联合数组形状反馈、Symfony YAML 服务、Twig/YAML/XML、PHP CS Fixer、EditorConfig、PHP Debug 与 PHPUnit CLI 链，并在同一宿主执行上述 Symfony→Twig 操作以及未保存模板名变更、属性移除、Revert 和旧来源撤销。VS Code 1.139.1 Linux x64 Extension Host 退出码 **0**。

入口：

```bash
PHP_COMPANION_TEST_PROFILE_SOURCE=1 \
PHP_COMPANION_TEST_PROFILE_SYMFONY_CONTEXTS=1 \
PHP_COMPANION_TEST_EXTENSIONS_DIR=/tmp/sophp-pack-source-context-20260926 \
PHP_COMPANION_TEST_TWIG_PLUS_PATH=/var/www/node/twig-plus/packages/vscode \
PHP_COMPANION_PHP_EXECUTABLE=/opt/remi/php85/root/usr/bin/php \
PHP_COMPANION_PHP_CS_FIXER=/tmp/sophp-gate-tools-99420b4/vendor/bin/php-cs-fixer \
PHP_COMPANION_PHPUNIT_EXECUTABLE=/tmp/sophp-gate-tools-99420b4/vendor/bin/phpunit \
node scripts/run-extension-test.mjs ./dist-test/runPackagedTest.js
```

这些路径是本机隔离验证输入，不是产品默认设置。PHP 8.5、fixer 和 PHPUnit 均从独立工具目录读取。`compact('local')` 这类仅在方法体中赋值的局部变量尚无可复用的精确表达式位置证明，因此当前继续标记为不完整上下文；完整组合通过不代表这类输入已支持。当前源码增量尚未进入 `15a5254` 私有 VSIX，实际安装、WSL Remote 与长会话仍属 C4 门槛。
