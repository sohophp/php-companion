# PHPUnit 测试文件旧路径异常的组合隔离

日期：2026-09-25。目标是区分完整 Open Source Pack 中的间歇性旧路径 ENOENT 是否由 PHPUnit 扩展单独触发。使用隔离 VS Code 1.139.0 Linux x64 Extension Host、独立临时 Composer/PHPUnit 夹具和冻结 `recca0120.vscode-phpunit` 3.9.40；未改业务项目。

| 组合与操作 | 本轮结果 | 证据 |
| --- | --- | --- |
| 仅 PHPUnit 扩展，20 轮创建/删除测试文件及资源 Rename | 未观察到未处理异常 | `/tmp/sophp-phpunit-isolated-repro/run-1.log` |
| 仅 PHPUnit 扩展，20 轮测试文件内容编辑、创建/删除及资源 Rename | 未观察到未处理异常 | `/tmp/sophp-phpunit-isolated-repro/run-2.log` |
| SoPHP Core + PHPUnit 扩展，复制 C3 基线 Composer 夹具，30 轮 SoPHP 类与文件双向 Rename，且每轮创建/删除测试文件 | 未观察到未处理异常 | `/tmp/sophp-phpunit-isolated-repro/run-core-4.log` |
| SoPHP Core + Symfony + PHPUnit 扩展，完整 C3 源码宿主序列 | 退出码 0 | `/tmp/sophp-c3-phpunit-three-full-sequence-20260925.log` |
| 同一三项组合，另加测试文件创建后立即删除 | 退出码 0 | `/tmp/sophp-c3-phpunit-three-churn-20260925.log` |
| Core + Symfony + 全部外部成员，不加载 Pack 元数据，同一 C3 序列加测试文件创建/删除 | PHPUnit 扩展两次未处理旧路径 ENOENT，宿主失败 | `/tmp/sophp-c3-all-external-no-pack-meta-20260925.log` |
| Core + Symfony + PHPUnit + PHP Debug / PHP CS Fixer / PHP DocBlocker / EditorConfig，同一序列 | 单次退出码 0 | `/tmp/sophp-c3-php-tools-20260925.log` |
| Core + Symfony + PHPUnit + TwigPlus / YAML / XML / Apache 扩展，同一序列 | 单次退出码 0 | `/tmp/sophp-c3-other-tools-20260925.log` |

为复核相同的 C3 操作顺序，测试入口增加 `PHP_COMPANION_TEST_C3_PHPUNIT_PAIR_PROFILE=1`：它保留 Core、Symfony 和 PHPUnit，排除其它 Pack 成员；`PHP_COMPANION_TEST_C3_PHPUNIT_CHURN=1` 增加测试文件创建/删除。启动时需将 `PHP_COMPANION_TEST_EXTENSIONS_DIR` 指向只含 PHPUnit 扩展的隔离目录。最初仅加载 Core 的配置在套件需要 Symfony Rename 时停止，未计入组合结论。

完整 11 项 Pack 此前两次在配置了 `phpunit.xml` 的同一类 C3 序列中，记录到 PHPUnit 扩展 `parseFile` 读取旧路径的未处理 ENOENT；见[生成映射快照报告](c3-generation-composer-snapshot-2026-09-25.md)及[测试类目录报告](c3-test-generation-target-2026-09-25.md)。全部外部成员但没有 Pack 元数据时也复现，说明 Pack 默认设置不是复现的必要条件。两组各自单次通过**不证明**其中成员无关，故障可能取决于组合负载与事件时序。现有证据不足以选择替代提供者或宣称完整 Pack 稳定；完整组合失败继续作为门禁，下一步检查可重复触发条件并对候选测试 Provider 做同一序列对照。

随后定位到 PHPUnit 3.9.40 的 `TestParser.parseFile()` 在文件被 Rename 或删除后仍读取旧路径。[隔离补丁评估](phpunit-enoent-patch-evaluation-2026-09-25.md)记录了可审查补丁及对照运行；补丁尚未进入当前 Pack 或 Marketplace，原版组合风险仍在。
