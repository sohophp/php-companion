# 当前 10 项 Open Source Pack 的 PHPDoc 组合验证

日期：2026-09-25。使用 VS Code 1.139.0、当前源码 Core/Symfony/Pack、隔离目录中的 8 个外部成员，以及独立 Composer 夹具。PHP DocBlocker 版本为 2.7.0。未安装或改动用户正在使用的扩展，也未打包 VSIX。

将宿主门禁从历史 11 项清单改为当前 10 项：明确要求 Core、Symfony、Pack 和 8 个外部成员存在，并断言已移出默认 Pack 的 `recca0120.vscode-phpunit` 不在隔离 Profile 中。

分别将 SoPHP 的目标 PHP 版本设为 7.2 和 8.5 后，两次宿主运行均以退出码 0 结束。实际编辑器输入 `/**` 后，补全中只有一个 PHP DocBlocker 生成器；应用后生成与原生参数、返回值相符的 `@param`/`@return`，没有重复注释起始标记。`@p` 只有一个 `@param` 候选。8.5 路径还覆盖可空参数、联合返回值和属性 `@var`。

SoPHP 对生成的兼容 PHPDoc 未报类型冲突；未保存地将参数类型改为冲突类型时出现一条诊断，改回后撤销。将生成后填写的 `list<AlphaDocItem>` 改为 `list<BetaDocItem>` 时，补全、Hover 和定义随当前未保存 PHPDoc 更新。日志：`/tmp/sophp-docblocker-pack10-php72-20260925.log`、`/tmp/sophp-docblocker-pack10-php85-20260925.log`。

这证明当前 Linux 源码 Profile 中 PHPDoc 生成由 DocBlocker 拥有、类型消费由 SoPHP 拥有。当前公开 Marketplace Pack、已安装的旧 0.4.5、WSL Remote、其它平台和长期使用仍须在后续候选门禁分别核对。
