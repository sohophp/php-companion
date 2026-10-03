# array_column：动态列名的返回索引合同

## 来源与问题

固定 phpstorm-stubs 修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `standard/standard_9.php` 与 [PHP 官方手册](https://www.php.net/manual/en/function.array-column.php)确认：指定 index_key 后，列值按该列重建键，允许字符串键；省略或 null 才是连续列表。

原生成签名始终声明 list<mixed>。语义层已有可证明的字面列名／对象属性细化，但动态列名会回落至此错误声明。PHP 7.2／8.5 在省略、null、字符串索引列和 nullable 索引变量四种情况下都得到 list<mixed>；两版隔离替换原型后分别得到列表、列表、array<int|string, mixed> 与两种分支的 union。共十六条查询见 `/tmp/sophp-array-column-return-prototype.json`。

本轮也只读检查了 call_user_func_array／forward_static_call_array，当前两版签名已经使用 array 参数，没有 list 误限，未修改它们，不称完成了回调返回类型推断。

## 修改与证据

仅把 array_column 返回 PHPDoc 改为 `($index_key is null ? list<mixed> : array<array-key, mixed>)`，复用现有条件类型解析；列值不能证明时仍为 mixed。保留现有列值细化、参数名和目标版本原生类型，没有修改通用语义层。

- 六套实际 PHP 7.2／7.4／8.1／8.2／8.4／8.5：关联输入的外层键不保留；列表为 one/two，索引模式为 first/second，null 列名返回完整行，缺列跳过、缺索引回落整数键、重复索引取后值。脚本 `scripts/check-array-column-return-runtime.mjs`、日志 `/tmp/sophp-array-column-return-runtime.jsonl`。
- 语言规格完整：222/222、十二文件、20.43 秒；九个版本签名和条件返回检查通过。
- 完整语义：1225/1225、六十二文件、54.08 秒；新增四版覆盖省略／null／索引列／nullable 索引、已知非空索引、非法输入／缺参、字面对象值成员保留及 PHP 8 反序命名参数。
- 当前正式 Core 实际 LSP：本项与 array_combine、CSV 两版测试，共三文件 6/6、5.88 秒；本项两版各六次未保存省略→索引→null→未知→索引→省略，十二次 Hover 精确核对完整类型，磁盘原文未变。
- Linux VS Code 1.140.0、PHP 8.5、Core 隔离宿主：六次相同模式切换，旧结果撤回／恢复和磁盘未变通过，退出 0。
- language-spec 构建、根 Core 构建、定向 ESLint 均退出 0。

正式日志 `/tmp/sophp-array-column-return-spec-full.log`、`/tmp/sophp-array-column-return-semantic-full.log`、`/tmp/sophp-array-column-return-stdio.log`、`/tmp/sophp-array-column-return-host.log`、`/tmp/sophp-array-column-return-lint.log`。

## 范围

源码与定向协议／宿主验证完成。此前集中 472 项协议不包含本项，未重跑完整 stdio 或完整 C2。隔离 Provider Hover 不替代可见弹窗、Windows 或真人 WSL UI。没有承诺推断动态列名的具体字段、任意行数据或字符串键名称；列值证明沿现有语义能力。未打包、提交、推送或更新 Profile。
