# 正式安装模式的响应延迟回归

这个入口复用原完整 Open Source Profile 套件，专门验证真实响应已生成、传输尚未完成时发生文档编辑的情况。它不打开产品的 Test 模式，也不修改候选 VSIX。当前编辑器入口只支持 Linux；真实协议测试随根单元执行，其它平台资格以实际 CI 结果为准。

## 两个入口

构建后执行真实服务器回归：

```bash
pnpm build
pnpm exec vitest run test/unit/production-response-gate.test.ts
```

正式安装的完整编辑器流程使用既有入口：

```bash
pnpm exec tsc -p test/extension/tsconfig.json
PHP_COMPANION_TEST_INSTALLED_PROFILE=1 \
PHP_COMPANION_TEST_INSTALLED_CANDIDATE=/absolute/path/to/frozen-alpha-candidate \
PHP_COMPANION_TEST_EXTENSIONS_DIR=/absolute/path/to/isolated-installed-extensions \
PHP_COMPANION_TEST_INSTALLED_MANIFEST=/absolute/path/to/external-versions.json \
PHP_COMPANION_TEST_INSTALLED_PROOF=/absolute/path/to/result.json \
PHP_COMPANION_TEST_PROFILE_REAL_VENDOR=1 \
PHP_COMPANION_TEST_PROFILE_REAL_VENDOR_NOISE=9100 \
PHP_COMPANION_TEST_PROFILE_REAL_VENDOR_ROUNDS=50 \
PHP_COMPANION_TEST_PROFILE_REAL_DEBUG=1 \
PHP_COMPANION_PHP_EXECUTABLE=/absolute/path/to/php \
PHP_COMPANION_FORMATTER_EXECUTABLE=/absolute/path/to/php-cs-fixer \
PHP_COMPANION_PHPUNIT_EXECUTABLE=/absolute/path/to/phpunit \
SOPHP_DEBUG_PHP=/absolute/path/to/php-with-xdebug \
SOPHP_DEBUG_PORT=9123 \
node scripts/run-extension-test.mjs ./dist-test/runPackagedTest.js
```

开始前准备好 `test/extension/real-vendor/vendor`，并确保调试端口可用。可选的 `PHP_COMPANION_TEST_VSCODE_EXECUTABLE` 选择已安装编辑器，`PHP_COMPANION_TEST_LOG_DIR` 保存宿主日志。格式化器、PHPUnit 和 Xdebug 的依赖条件与原完整套件相同。

## 输入与版本

候选目录必须包含现有 `prepare-alpha-candidate.mjs` 生成的清单和三包。先用 VS Code CLI 将三包和外部成员正式安装到独立扩展目录。测试会复用既有候选/安装内容校验器，并核对三包文件；只有 VS Code 的安装元数据允许规范化。

外部版本清单是显式 JSON 数组，格式为 `[{"id":"sohophp.twig-plus","version":"1.3.8"}, ...]`，只列外部成员。它必须完整对应隔离目录中三包以外的扩展，包括平台目录后缀不同的成员；缺失、额外成员、重复身份和版本不一致均拒绝。该清单选择本次实际组合，不修改全平台支持表。

PHP Debug 的版本断言来自这份已核对的清单。原有入口仍默认要求 `1.40.1`；只有正式安装入口向子进程传入其实际固定版本。不得通过省略版本检查适配差异。

该模式要求原 9100 个背景文件、50 轮标量/30 轮联合类型反馈以及真实调试，拒绝子集入口和缩小轮数的配置。原套件的断言、执行顺序、超时及 150ms P95 门槛保持。

## 响应控制与证据

启动时短暂隐藏测试项目的 Composer 文件，在 PHP 扩展激活前安装测试专用传输观察器，随后原字节恢复。开发路径只用于中性测试入口，产品从正式安装目录加载。

适配器先把暂停请求交给真实服务器，要求服务器返回 `false`，证明 Test 模式未启用。然后由适配器接受套件控制，暂存真实 Hover 响应，等待服务器发布消费文件的新版本诊断，再原样释放响应。语义响应的原始字节摘要必须一致；状态版本来自实际服务器，业务结果仍由服务器计算。

成功报告记录候选提交、完整版本组合、安装文件数量、实际文档版本、响应摘要和原套件完成状态。安装载荷在整个流程中必须保持不变。报告不代表真人 WSL、多小时使用、其它平台、复杂 Controller 性能或全部稳定版验收通过。
