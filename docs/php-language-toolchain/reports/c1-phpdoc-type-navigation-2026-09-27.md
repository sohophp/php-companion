# C1 PHPDoc 类型跳转

日期：2026-09-27。SoPHP Core 负责 PHPDoc 类型的 Definition；Open Source Pack 中的 PHP DocBlocker 继续负责注释生成。改动只在 SoPHP 隔离源码分支，未进入冻结于 `248ee1f8` 的 0.4.7 VSIX。

## 复现与修复

原来的 Definition 会在 PHPDoc 说明文字中把大写单词按命名空间类名解析。如果项目恰有同名类，Ctrl+点击说明文字会误跳转。Core 现在复用 PHPDoc 类型位置判断：仅对类型 token 执行 Definition 和按需加载；普通注释、说明文字及数组形状键不进入类型跳转。

定向语义用例使用独立的项目与 vendor URI，覆盖 `@param`、`@return` 泛型与联合类型、绝对限定类名、`@var` 数组形状值、`@method` 返回及参数类型；同名类出现在说明文字与形状键时要求没有 Definition。修复前该用例在 `description Widget` 上误跳到同文件 `App\\Widget`，修复后通过。

验证：语义 `semantic.test.ts` **366/366**，语义包 TypeScript、修改文件 ESLint、`pnpm build` 均通过。VS Code 1.139.1 Linux x64 的完整 10 项 Open Source Pack 源码 Profile 使用 PHP 8.5、按需索引，创建未打开的 `C1DocNavigationTarget.php`，从 PHPDoc 类型执行实际 Definition 命令并检查反例；完整 C1 宿主退出码 **0**，日志 `/tmp/sophp-c1-phpdoc-navigation-pack10-20260927.log`。

此宿主是隔离 Linux 源码组合，不能证明已安装 0.4.7 候选、真实 WSL Remote、其它平台或长期会话。复杂跨行 PHPDoc 类型仍按现有补全边界处理；Core 下一步继续在独立 Composer 项目验证 C1/C2 真实编辑链。
