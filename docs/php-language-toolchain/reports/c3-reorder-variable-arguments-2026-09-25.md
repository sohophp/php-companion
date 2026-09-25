# C3 方法家族参数重排：裸变量实参

日期：2026-09-25。工作范围仅为 SoPHP 仓库和独立临时 Composer 夹具，没有修改业务项目或生成 VSIX。

`Reorder Method Parameters` 原先只允许位置调用使用标量字面量；普通的 `$contract->send($value, $context, $count)` 因此使整个方法家族重排被拒绝。现在把**已证明属于所在函数参数，或在同一函数体中于调用前直接赋值的裸变量读取**纳入可重排的位置实参：接口、实现、PHPDoc 和调用点仍在同一预览与工作区编辑中更新。变量调用可变为 `send($count, $value, $context)`，局部变量调用也按同一顺序改写；完全命名的调用保持原样。

局部赋值证明要求赋值表达式直接位于同一个函数体、赋值目标就是该变量、赋值早于调用；`if`、循环、`try`、三元表达式和嵌套闭包中的赋值不作证明。存在可能撤销变量定义或跳过赋值的 `unset`、`goto`、`eval`、`extract`、`global`、`include`/`require` 等路径时保守拒绝。未证明已定义的变量、带函数调用或其它复合表达式、混合命名/位置参数、解包、引用/可变参数及无法证明完整方法家族的输入继续拒绝，避免无意改变求值顺序或漏改调用点。此次没有扩展为通用 Change Signature。

验证：`packages/semantic/test/reorder-method-family-parameter.test.ts` 2/2 通过，含函数参数裸变量正例、未知变量、带副作用调用和混合参数负例；Semantic TypeScript 与相关 ESLint 通过。最终实现的独立 VS Code 1.139.0 Linux x64 C3 宿主连续两次退出码 0，在三文件方法家族中验证了预览、取消、应用和一次 Undo/Redo，新增变量调用的目标顺序正确。日志 `/tmp/sophp-c3-variable-reorder-proven-20260925.log` 与 `/tmp/sophp-c3-variable-reorder-proven-repeat-20260925.log`。首次运行的 VS Code File Explorer 曾记录一条 `TreeError`，第二次未复现，原因未确定；它未影响本项断言。

完整 11 项 Open Source Pack 源码宿主随后使用[已安装的本地 PHPUnit 补丁 VSIX](phpunit-enoent-installed-vsix-2026-09-25.md)复核同一 C3 序列，退出码 0，日志 `/tmp/sophp-c3-pack-patched-variable-no-update-20260925.log`。隔离扩展目录中 PHPUnit 入口 SHA-256 为 `5aef9848114ad20acf616e024871e31406481ddc15adfc20571bbb37738a7148`，与补丁安装报告一致。首次组合运行在开始阶段因暂停的 `addImport` 请求无法释放而失败，同时 VS Code 日志显示正在自动更新 `xdebug.php-debug`；测试新建用户数据目录之前未禁用自动更新。现在 C3 组合宿主与打包 Profile 一样写入用户设置，关闭扩展和编辑器自动更新；随后相同输入通过。不能据此断言自动更新是首次失败的唯一原因，也不能把本地补丁组合通过当作 Marketplace 原版已稳定。WSL Remote 和真实用户操作仍待验收。

同日扩大到直接赋值局部变量后，定向语义测试 2/2 通过，新增条件赋值与 `unset` 负例；Semantic TypeScript、ESLint、独立 C3 宿主及上述本地补丁版 11 项 Pack C3 宿主均通过。独立与组合日志分别为 `/tmp/sophp-c3-local-variable-reorder-20260925.log`、`/tmp/sophp-c3-pack-local-variable-reorder-20260925.log`，两个宿主退出码均为 0。此次未打包新的 VSIX；Marketplace 原版、Remote 和真实编辑器交互仍按各自门槛验收。

随后将关闭文件中的局部实参语法树在同一次重排计划内按文件复用并在退出时释放。定向语义测试 3/3 通过：同一调用文件中的 20 次局部变量调用，相比只用函数参数的基线，仅多解析一次该文件；Semantic TypeScript、ESLint 及独立 C3 宿主均通过。宿主日志为 `/tmp/sophp-c3-reorder-parse-cache-20260925.log`，退出码 0，其中类型生成的一次 Redo 仍按已知限制开放。此次优化未重新运行完整 Pack，也未生成 VSIX。

独立 C3 宿主的 Redo 验收进一步核对接口声明、实现类声明和调用方三个文件，三处均在一次标准 Redo 后恢复目标参数顺序；`test/extension/suite/c3.ts` TypeScript、ESLint 和宿主通过，日志 `/tmp/sophp-c3-reorder-complete-redo-20260925.log`，退出码 0。此结果只覆盖方法家族重排，不改变类型生成资源 Redo 的开放状态。
