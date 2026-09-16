# Alpha 移动与引用回归（2026-09-16）

真实日志显示 Winstar 的 App 与 SohoPHP 共用 src/，旧版以目标 namespace 候选必须唯一为门禁，拒绝了合法移动。默认 onDemand 的 References 又未触发项目索引，导致未打开文件的引用缺失。全局 PHP 文件监视会因非自动加载目录文件变化重新扫描并取消前一任务。

本次按源声明的 Composer 映射选择移动目的 namespace；will-rename 的文本编辑使用尚存在的旧 URI；References 等待项目索引；非自动加载路径的 PHP 监视事件被忽略，已有索引任务由并发请求共享。

回归入口：

```bash
pnpm exec tsc -p test/extension/tsconfig.json
node scripts/run-extension-test.mjs ./dist-test/runRegression.js
PHP_COMPANION_COLD_MOVE=1 node scripts/run-extension-test.mjs ./dist-test/runRegression.js
```

隔离 VS Code Extension Host 使用默认 onDemand、App/SohoPHP 双映射、未打开的调用方和未保存的源文件，验证查询引用、正向与反向移动以及 import 更新。第二个入口直接执行冷启动移动。测试不修改真实 Winstar 文件。

限制：首次全项目引用查询仍需要建立项目索引；这次没有证明 Winstar 冷索引能瞬间完成，也没有证明 Windows WSL Remote 的人工验收完成。vendor 不在默认全项目扫描内，依赖引用覆盖仍受已加载依赖范围限制。
