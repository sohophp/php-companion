# R48：跨文件契约与当前集成核验

日期：2026-10-02。R47 补齐中间数组创建恢复后，核对原计划中的项目／缓存类型事实来源。产品源码保持 R47 终态；不增加补全功能范围。

## 已通过的检查

复用实际 `SemanticWorkspace`，先建立独立契约文件的 eager 快照，销毁原 workspace 后，再通过四种方式加载：完整解析、完整快照、声明快照、仅声明源码。每种方式分别在另一文件进行函数实参与方法实参的中间数组键／值查询，共 16 个组合。

正式脚本的全部 16 项返回精确 `mode` 或 `'create'`；替换范围结束于原光标，不消费已有 `]` 或后续语句。消费文件源码、消费快照和契约文件源码保持不变。允许正常延迟加载声明体，不声称所有内部缓存或 revision 永远不变。脚本 ESLint 退出码 0。

```sh
node scripts/check-cached-array-literal-completion.mjs /tmp/sophp-r48-cached-creation-final.json
pnpm exec eslint scripts/check-cached-array-literal-completion.mjs
```

原始日志：`/tmp/sophp-r48-cached-creation-final.log`、`/tmp/sophp-r48-cached-creation-lint.log`；正式结构化结果另存同名报告 JSON。这里使用独立 vendor 路径的契约夹具，不将它冒充真实第三方 Composer 包验收。

## 完整协议门禁（已完成）

启动前 42 项 R47 冻结输入全部一致。当前源码的完整 429 项 stdio 使用明确的 reference bundle 环境变量，避免条件测试因缺少环境变量而跳过：

```sh
PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js pnpm --dir packages/language-server exec vitest run test/stdio.test.ts
```

运行会话 `16325` 已退出码 0：429/429、零跳过，1348.45 秒。原始输出 `/tmp/sophp-r48-full-stdio.log`，42 项产品输入与 R48 正式工具终态校验全部通过（`/tmp/sophp-r48-final-inputs.log`、`/tmp/sophp-r48-final-tool-input.log`）。完整运行期间产品源码与构建输出保持 R47 状态不变；清单为 `/tmp/sophp-r47-inputs.sha256`。终态取得后才应用 R49，因此此完整结果证明 R47／R48 终态，不冒充 R49 修正后的当前完整协议结果。

这项检查不替代真实 WSL、跨平台或长会话。没有打包、提交、推送或更新 Profile。
