# 常用补全当前源码的完整协议集成

日期：2026-10-02。R49／R50 已应用后的当前源码完整 stdio 回归终态：**431/431 通过，零跳过，退出码 0**。开始 12:50:30，总耗时 1355.37 秒。测试采用当前源码服务器及当前重建 bundle，包含条件启用的真实 bundle References 用例。

```sh
PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js pnpm --dir packages/language-server exec vitest run test/stdio.test.ts
```

## 输入与原始证据

运行前比对 R50 的 48 项记录，唯一差异是本轮重新构建的 `dist/language-server.js`。该 bundle 在启动测试前已构建；测试启动后立即记录当前 48 项散列。之后没有修改这批输入，终态检查 48/48 一致。新增独立模板验证工具不在该 48 项集合中，其执行结果和工具修改另有报告，不能以本门禁替代其检查。

原始日志 `/tmp/sophp-current-full-stdio.log`、当前输入 `/tmp/sophp-current-full-stdio-inputs.sha256`、终态 `/tmp/sophp-current-full-stdio-final-inputs.log`。完整日志与散列结果持久保存在 [JSON](completion-current-integration-2026-10-02.json)。先前 R48 的 429 项是修复前证据，本次取得自己的完整 431 项终态。

## 本批已有的独立证据

- [R50](c2-word-middle-array-literals-2026-10-02.md)：完整语义 1115 项；最终定向协议、完整 C2、两版 C1 和 10k 性能。语义运行后的等价正则转义清理已单列，不宣称本次又重跑全部语义。
- [实际 vendor 宿主序列](c1-current-vendor-chain-session-2026-10-02.md)：1,000 轮、6,000 次编辑器查询正确；补全命令 P95 27 ms，References 178 ms，内存回收后末段基本持平。
- [Core 模板接受](c1-template-acceptance-2026-10-02.md)与 [Pack 组合模板接受](c1-pack-template-acceptance-2026-10-02.md)：两种组合各 20 项 Enter／Tab、完整文本、占位符及 Undo／Redo 通过；Pack 实际组合含额外 Apache 扩展，不称为严格仅 11 项。
- [版本与模式序列](c2-session-version-index-matrix-2026-10-02.md)：PHP 7.2／8.5 × 三种模式共 600 轮、3,000 次结果检查正确。

## 尚需完成

原计划的真实 WSL 使用反馈、数小时真实会话、跨平台／Remote 及完整冻结 Pack 工作流按各自门槛保留；本次不自动形成安装候选。References 等导航等待继续独立记录，不能套用补全热查询预算判定。之后按原路线图推进独立剩余项，不再为已通过的数组输入组合或相同模板反复扩充测试。

没有打包、提交、推送或更新用户 Profile，目标保持执行中。
