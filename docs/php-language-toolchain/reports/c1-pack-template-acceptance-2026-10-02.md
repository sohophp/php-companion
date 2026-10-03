# Pack 组合中的模板接受核验

日期：2026-10-02。接续 Core-only 的模板接受门禁，以既有缓存目录 `/tmp/sophp-stable-pack-extensions-20260927` 加载源码 Core／Symfony／Pack 和外部扩展，未安装或下载扩展。隔离宿主及临时 user-data 与用户实际 Profile 分离。

## 结果与入口修正

首次入口仍强制 Core-only，套件的必需成员断言正确失败：缺少 `sohophp.php-companion-symfony`，退出码 1；该次不计作 Pack 验证。仅修正新建的 `check-extension-template-acceptance.mjs`：Pack 模式不再强制 Core-only。原产品和编译宿主文件未改动。

最终 PHP 7.2／8.5 两个独立宿主均退出码 0，五类模板 × Enter／Tab 共 20 项完整文本、首个和下一个占位符、一次 Undo／Redo 全通过。普通关键字排在模板前。套件检查所需 11 个成员存在，且无 Intelephense／Symfony Language Tools 竞争语言服务器。

缓存中还存在 `mrmlnc.vscode-apache@1.2.0`，所以本轮实际有 **12 个非内建扩展**，没有称为严格仅含 11 项的冻结组合。完整成员 ID／版本以及逐项结果见 [JSON](c1-pack-template-acceptance-2026-10-02.json)。本轮只验证这些模板，不宣称整套 Pack 的格式化、调试和 CLI 工作流重新验收通过。

相关 ESLint 通过，套件类型检查通过；完整 stdio 的 48 项冻结输入在结束后仍匹配。新增工具及 helper 的本轮终态记录为 `/tmp/sophp-pack-template-tool-inputs.sha256`。前轮 Core-only 工具散列保留原样，不冒充本轮修改后的记录。

原始日志：失败的 `/tmp/sophp-template-pack-85-host.log`、最终 `/tmp/sophp-template-pack-85-host-final.log` 与 `/tmp/sophp-template-pack-72-host.log`。

复现：

```sh
PHP_COMPANION_TEST_C1_PHP_VERSION=7.2 PHP_COMPANION_TEST_C1_OPEN_SOURCE_PROFILE=1 PHP_COMPANION_TEST_EXTENSIONS_DIR=/tmp/sophp-stable-pack-extensions-20260927 node scripts/check-extension-template-acceptance.mjs /tmp/sophp-template-pack-72.json
```

这是本机隔离 VS Code 的可见建议和实际按键检查，不等于真实 WSL 使用。没有打包、提交、推送或更新用户 Profile。完整 stdio 门禁仍运行，未重启或用定向结果代替其终态。
