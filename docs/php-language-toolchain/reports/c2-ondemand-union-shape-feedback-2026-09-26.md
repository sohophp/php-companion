# C2：按需模式的跨文件联合数组形状反馈

日期：2026-09-26。增量位于隔离分支 `feat/c1-interpolated-variable-completion`；已冻结的 0.4.6 VSIX 不包含它。只使用独立 Composer PSR-4 夹具，没有修改业务项目。

复现：`Factory::choose()` 的 PHPDoc 返回 `array{item: Alpha}|array{item: Beta}`，使用方将返回值赋给 `$row`，再赋值 `$item = $row['item']`。在默认 `onDemand` 下，只打开 Factory 和使用方时，`$item->com` 没有 `common` 候选；把 `Alpha.php`、`Beta.php` 也打开才恢复。原因是按需加载只追踪成员接收者的直接类或继承依赖，没有从这一层可证明的数组字段追到 PHPDoc 所指的两个类。

现在成员所有者查询在直接局部赋值链中识别“数组元素 ← 方法调用”的一层关系：仅当方法 PHPDoc 的每个返回分支都是数组形状，且该字段在每个分支必有、类型均是对象名时，将这些类名交给现有 PSR-4 按需加载。若字段可选、某分支缺失或混入标量类型，则不推断候选。类加载后仍由原有语义判断成员交集；未保存地将返回类型改为 `array{item: Alpha}` 后，使用方改为 Alpha 专属结果。

验证：语义正反例先失败后通过；`packages/semantic` 416/416、语义 TypeScript 检查、相关 ESLint 和 `git diff --check` 通过。独立 Composer 项目真实 LSP 定向测试通过，未打开 Alpha/Beta 时可得到共有成员、联合类型 Hover 与两个 Definition；未保存地修改 Factory 后补全、Hover 和 Definition 同步变为 Alpha。完整 10 项 Open Source Pack 的 VS Code 1.139.1 Linux x64 C2 源码宿主退出码 0，覆盖同一冷启动与未保存编辑操作链；日志 `/tmp/sophp-c2-union-shape-pack-20260926.log`。真实 WSL Remote、安装候选、跨平台和长会话仍待 C4 验收。
