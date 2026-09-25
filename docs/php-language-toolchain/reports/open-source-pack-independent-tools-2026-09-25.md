# Open Source Pack 独立 PHP 工具组合验证

日期：2026-09-25。使用当前工作树源码及独立临时 Composer 工具项目；未修改 Winstar，也未重新打包 VSIX。

## 输入与结果

- 在 `/tmp/sophp-tools-IcYaOb` 用 PHP 8.5.9 和 Composer 安装 PHPUnit 12.5.36、PHP CS Fixer 3.95.27。该临时工具项目的 `composer.lock` SHA-256 为 `d81f040bdc80b06e2d2bd70cbdc1e3a4e7c9f8030259dc002c7d9d8d22e240cf`；版本只代表本次解析结果，并非 Pack 锁定的版本。
- `pnpm build`、Symfony 扩展构建和宿主测试 TypeScript 编译退出码均为 0。
- VS Code 1.139.0 Linux x64 隔离宿主加载当前 Core、Symfony、Pack 源码及冻结的 8 个外部成员。`PHP_COMPANION_PHP_EXECUTABLE` 指向独立 PHP 8.5.9，`PHP_COMPANION_PHP_CS_FIXER` 与 `PHP_COMPANION_PHPUNIT_EXECUTABLE` 指向上述临时工具项目，未取用业务仓库 `vendor/bin`。完整宿主退出码 0，日志为 `/tmp/sophp-pack-independent-tools-20260925.log`。
- 宿主断言实际获取并应用 PHP CS Fixer 的 PSR-12 格式化编辑，Undo 恢复原文；通过项目测试配置执行 PHPUnit，测试文件写出 `passed` 后核对内容。同一流程也检查 SoPHP 的 PHP 编辑、Symfony 服务引用、Twig/YAML/XML、EditorConfig、调试会话入口和 PHPDoc 联合类型反馈。
- 同一套独立工具再次运行完整 Pack 流程，随后在真实 Composer vendor 加 9,100 个噪声文件的独立项目做 5 轮未保存跨文件返回类型切换；宿主退出码 0，日志为 `/tmp/sophp-pack-full-realvendor-independent-tools-20260925.log`。5 轮结果与诊断逐轮一致，等待中位 109 ms、最大 575 ms。唯一超过 500 ms 的首轮在诊断就绪前已等待 555 ms；之后合成 Hover 调用仅 20 ms，服务端 Hover 约 1 ms，首轮记录 4 次诊断计算（最大 105 ms）。这次慢点落在诊断阶段，不能把先前其他样本的首次等待固定归因于 Hover Provider。
- 对跨文件诊断的调度做过一次受控尝试：让按符号优先排序的打开文件逐个完成，再刷新下一文件。定向真实 stdio 的 5 项跨文件诊断测试、构建和 ESLint 通过；同样的完整 Pack 大项目宿主也退出 0（`/tmp/sophp-pack-serial-related-diagnostics-20260925.log`）。首轮诊断就绪从本次对照的 555 ms 变为 105 ms，但合成 Hover 等待变为 461 ms，总反馈仍为 566 ms（对照 575 ms）。先前样本也显示慢点会在诊断与 Hover 间变化，因此这不足以证明调度改动带来用户可见提速。已撤回该调度改动并重建语言服务及扩展 bundle；当前源码仍使用原来的分批刷新。没有把这次单样本差值写成性能改进。

## 边界与下一步

这补齐了“组合必须依赖 Winstar 工具脚本”的证据缺口，并证明独立安装的新版 PHPUnit/fixer 可在当前隔离源码 Profile 中完成相同任务。工具仍是宿主外的临时 Composer 安装；此项没有验证用户 WSL Remote 的扩展安装位置、项目自己的 `vendor/bin`、Xdebug 断点交互、Windows/macOS 或持续数小时使用。下一步对首轮可见等待只追踪可重复的具体阶段，同时继续检查取消、关闭和文件事件交错时的结果一致性；到候选交付点再核对实际安装与工具路径。
