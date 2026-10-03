# 高频模板的真实 Enter／Tab 接受

日期：2026-10-02。原协议已有 if／foreach／try／函数和方法模板的插入文本断言，原可见宿主主要覆盖 if 模板。本轮补齐这五类模板的独立实际 Workbench 接受检查。

## 实现与结果

新增 `test/extension/suite/templateAcceptance.ts`，复用既有 CDP 按键与可见建议读取。每个模板分别以实际 Enter 和 Tab 接受，断言：普通关键字仍排在模板前；模板在可见列表出现；完整接受文本和四空格缩进准确；首个及下一个占位符正确；一次 Undo 恢复原始输入、Redo 恢复完整模板。函数／方法默认参数占位符仍待用户填写，没有把默认模板文本当成已完成的 PHP 程序。

新增 `scripts/check-extension-template-acceptance.mjs`，沿用编译好的隔离宿主入口，以临时 bundle 替换本轮 suite，不改动正在完整 stdio 门禁中冻结的产品或宿主文件。PHP 7.2／8.5 分别 10/10 通过，两个独立宿主均退出码 0；没有发现需要修改产品模板的失败。

脚本与测试 ESLint、宿主 TypeScript `--noEmit` 通过。完整 stdio 的当前 48 项输入在本轮结束后仍全部匹配；新脚本、suite 和既有 CDP helper 的终态散列保存在 `/tmp/sophp-template-acceptance-inputs.sha256`。这份新增工具散列在两次运行后记录，不声称是运行前冻结记录。

原始日志 `/tmp/sophp-template-72-host.log`、`/tmp/sophp-template-85-host.log`；结构化接受证明见 [JSON](c1-template-acceptance-2026-10-02.json)。

复现：

```sh
PHP_COMPANION_TEST_C1_PHP_VERSION=7.2 node scripts/check-extension-template-acceptance.mjs /tmp/sophp-template-72.json
PHP_COMPANION_TEST_C1_PHP_VERSION=8.5 node scripts/check-extension-template-acceptance.mjs /tmp/sophp-template-85.json
```

## 边界

本轮是隔离 Linux VS Code Workbench 的按键、可见列表与文档验证，不替代真实 WSL Profile、其它平台或用户自定义按键／缩进配置。未增加模板种类或设置，没有打包、提交、推送或更新 Profile。完整 stdio 门禁继续运行，不把本轮宿主通过冒充其终态。
