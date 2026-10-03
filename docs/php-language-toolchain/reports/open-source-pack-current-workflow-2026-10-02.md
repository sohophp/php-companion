# 当前源码 Pack 的完整默认工作流

日期：2026-10-02。在完整 stdio 431/431 结束后，使用当前源码 Core／Symfony／Pack、已有固定外部扩展缓存和临时独立 Composer 项目，执行 `runPackagedTest` 的 `PHP_COMPANION_TEST_PROFILE_SOURCE=1` 分支。没有生成或安装 VSIX，没有更新用户 Profile。

## 终态

隔离 Linux VS Code 宿主退出码 **0**，日志确认 `Verified source SoPHP extensions in the isolated Open Source Profile`。既有 `verifyOpenSourceProfile` 完整流程执行并通过：

- Pack 成员清单与默认 onDemand、Core 默认启用、内建 PHP 建议关闭、唯一 PHP formatter、无竞争 PHP Language Server。
- PHP Definition／References、Symfony YAML 服务 References。
- 未保存命名实参和字面量 unpack 的补全及签名；10 轮局部标量类型的 Hover／诊断一致，P95 136 ms；联合形状及危险来源撤回的既有检查。
- PHP CS Fixer 的 PSR-12 编辑及一次 Undo；Twig、YAML、XML、JSON 格式化 Provider；EditorConfig 三空格缩进。
- PHP Debug 会话启动和退出，结束后无活动调试会话；不把它扩大为断点、变量检查或远程映射验收。
- 项目 PHPUnit CLI 执行实际测试并写出预期结果标志；没有称为 VS Code PHPUnit Test Explorer 验收。

八项源码 bundle、已编译入口／suite、清单与工具 Composer lock 执行前后 SHA-256 一致。记录为 `/tmp/sophp-current-pack-workflow-inputs.sha256`。本次使用 PHP 8.5.9、PHP CS Fixer 3.95.27、PHPUnit 11.5.56；版本在运行前以实际命令核对。

执行后另外核对缓存中的八个必需外部成员都符合 `open-source-profile.extensions.json` 固定版本；缓存另有 `mrmlnc.vscode-apache@1.2.0`，实际外部成员九个，与源码三成员合计十二个。本次不称为严格仅十一项组合，完整外部 ID／版本、八项散列与日志保存在 [JSON](open-source-pack-current-workflow-2026-10-02.json)。外部包内容没有列入八项前后散列，不扩大为其全部文件不可变证明。

## 命令与边界

```sh
PHP_COMPANION_TEST_PROFILE_SOURCE=1 PHP_COMPANION_TEST_EXTENSIONS_DIR=/tmp/sophp-stable-pack-extensions-20260927 PHP_COMPANION_PHP_EXECUTABLE=/usr/bin/php85 PHP_COMPANION_PHP_CS_FIXER=/tmp/sophp-gate-tools-99420b4/vendor/bin/php-cs-fixer PHP_COMPANION_PHPUNIT_EXECUTABLE=/tmp/sophp-gate-tools-99420b4/vendor/bin/phpunit node scripts/run-extension-test.mjs ./dist-test/runPackagedTest.js
```

本轮关闭当前源码的默认组合工作流复验缺口；此前 [模板组合](c1-pack-template-acceptance-2026-10-02.md)只覆盖模板，不能替代本轮工作流。真实 WSL 使用、Windows/macOS、数小时真实编码及安装候选依旧独立验收。当前工作区所有未提交改动保留，没有产品补丁、打包、提交、推送或 Profile 更新。
