# C2 数组与值表达式：阶段集成验证

日期：2026-10-01。覆盖 R19–R20；状态：本轮列明范围的源码集成验证完成；后续静态作用域修复不包含在这批冻结输入中。未打包、提交、推送或更新 Profile。

| 范围 | 当前证据 |
| --- | --- |
| 全量语义 | 16 文件，553/553，48.98 s；R20 完整语义复验结果 |
| 完整 C2 Core 源码宿主 | 退出码 0；无子用例 ONLY 开关。原有跨文件、数组、classmap、Attribute、分组导入、未保存查询与新增数组／常量／位运算实参验证通过 |
| 全仓 Lint | `pnpm lint` 退出码 0 |
| 完整 stdio | 375/375，零跳过，1188.66 s，退出码 0；启用跨进程引用缓存用例，会话 54117 已终态 |
| 输入一致性 | 8 项源码、构建产物和测试输入 SHA-256 在完整 C2/Lint 结束及 stdio 终态后复核全部一致；随后才应用静态作用域修复，旧清单仅证明本轮输入 |

日志：`/tmp/sophp-value-expression-integration-full-stdio.log`、`/tmp/sophp-value-expression-integration-full-c2-host.log`、`/tmp/sophp-value-expression-integration-lint.log`。输入清单：`/tmp/sophp-value-expression-integration-inputs.sha256`。

复现命令与上一批相同：完整 stdio 使用 `PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js`；完整 C2 使用 `CORE_ONLY=1 C2_ONLY=1`，不设置 ELVIS_ONLY；末尾执行输入 SHA-256 校验。

本轮未重新测 C1 可见弹窗等待或 C3 重构，不借此宣布这些范围再次通过。当前 375 项只代表 stdio 文件，不是全部 language-server 测试或全仓包测试。真实 WSL、平台矩阵和安装候选仍单列，人工验收不自动等同源码受阻。

## 下一批待修复现

只读语义探针比较实例／静态方法及直接 new／Elvis 初始化四种组合。三个组合返回 ready，只有静态方法内 `$value = null ?: new ScopeRepo(); scopeObserve($value, ['flag' => 1]); $value->` 返回空列表。记录在 `/tmp/sophp-static-method-value-repro.json`。当前方法作用域包含声明头，已有局部逃逸检查对整个前缀作关键词扫描；声明修饰符与真正的静态局部变量需要区分，尚未在本轮冻结产品输入上修复。

本轮运行中未修改产品输入或另起同一全量任务。375 项终态与输入校验完成后，才开始套用静态作用域修复；它的协议、宿主和后续完整集成单独登记。

后续先在[独立临时源码目录](c2-static-scope-snapshot-2026-10-01.md)准备修复，17 文件、554/554 语义通过，并保留 static/global 局部绑定及引用捕获反例；终态后套用到当前分支。当前新的源码状态不能借本轮 375 项结果宣布再次全量通过。
