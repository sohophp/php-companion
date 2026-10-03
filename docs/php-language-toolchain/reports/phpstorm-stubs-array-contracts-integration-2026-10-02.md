# 数组与标准返回合同：集中集成回归

## 固定输入与范围

本次集合包含 get_headers、array_combine、十一项数组模板消费、未知元素容器保留，以及局部范围性能修复。根产品 bundle 和包构建已经完成；扩展测试重新编译后记录 2905 项源码、构建、脚本、测试和夹具哈希，文件清单位于 `/tmp/sophp-array-contracts-integration-inputs.json`。

本批完整语义已经通过 1213/1213。完整协议选取 `test/*stdio.test.ts` 的全部十五个文件，明确 `PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js`，避免引用缓存用例因没有当前根构建被环境条件跳过。

## 当前已验证

- 完整 Core Linux C2：原会话 2217 已退出 0；日志 `/tmp/sophp-array-contracts-full-c2.log` 有 65 条 C2 证明，最后包含 HTML 聚合、数组箭头／词中输入及未保存键撤回。PHP 8.5、onDemand、Core 独立宿主，无 C2 子集开关。
- 最后一次输入复核：2905 项、零变化。测试期间没有更新根产品、VSIX 或 Profile。

## 集中回归终态

完整实际 stdio 原会话 **37089** 已退出 0：15/15 文件、472/472 项、零跳过，1388.33 秒。日志 `/tmp/sophp-array-contracts-full-stdio.log` 已有终态摘要。最终 2905 项哈希复核零变化，测试期间未修改任何冻结输入。

本批集中集成完成。完整 Core Linux C2 的 65 条证明与这份源码一致；隔离宿主不替代真人 WSL UI。本批未打包、提交、推送或更新 Profile。后续 iterator_apply 修正单独接入并单独验证，不能冒用本次完整协议终态。
