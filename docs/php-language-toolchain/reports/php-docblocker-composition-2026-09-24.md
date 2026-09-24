# PHP DocBlocker 与 SoPHP 首轮组合验证

日期：2026-09-24。候选为 Marketplace 的 `neilbrayfield.php-docblocker` 2.7.0，安装于 `/tmp/sophp-docblocker-profile` 的隔离 VS Code 1.139.0 Profile。该 Profile 同时安装冻结清单中的 TwigPlus、YAML、XML、PHP Debug、PHPUnit & Pest Test Explorer、PHP CS Fixer、EditorConfig 和 Apache Conf Snippets；SoPHP Core、SoPHP Symfony 与 Open Source Pack 使用仓库源码扩展。项目为宿主创建的独立 Composer 夹具；未修改业务项目，未构建 VSIX。

在 PHP 7.2 和 8.5 配置下，完整成员 Profile 的宿主使用 VS Code `type` 命令输入 `/**`，编辑器形成 `/** */`。补全列表中只有一项 `PHP DocBlocker` 的 `/**` 生成器，应用后 `@param` 与 `@return` 与原生函数签名相符，也没有第二个 DocBlock 开头；输入 `@p` 时仅有一个 `@param` 候选。PHP 8.5 的 `?string` 与 `int|false` 由该扩展写成等价的 `string|null` 与 `integer|false`；原生 `string` 属性也生成 `@var string`。已观察到的 SoPHP 诊断没有对生成的原生兼容注释报类型冲突；PHP 7.2、8.5 两次完整成员宿主均以退出码 0 结束，日志为 `/tmp/sophp-docblocker-pack-current-php72-20260924.log` 和 `/tmp/sophp-docblocker-pack-property-php85-20260924.log`。可重复的宿主入口为 `PHP_COMPANION_TEST_DOCBLOCKER_ONLY=1`，须显式指定隔离扩展及用户数据目录。

单独把裸 `/**` 写进文件后调用补全，与真实 `type` 输入不同：编辑器没有生成关闭标记，扩展返回的补全范围为空，直接应用会得到 `/**/**`。因此门禁使用实际编辑器输入，并保留裸标记行为作为限制。此轮验证了基本函数、一组现代类型、PHP 8.5 属性和标签候选，没有覆盖类注释、复杂属性、泛型注释、所有 PHP 次版本、WSL Remote 或持续使用；也没有证明每次无冲突诊断都等到 SoPHP 对最新版本完成发布。基于完整成员 Profile 的首轮证据，候选已加入**当前源码 Pack**；现有 VSIX 和公开 Marketplace 页面尚未同步，冻结下一次可安装候选时须重做三份 VSIX 的组合与摘要门禁。
