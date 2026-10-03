# phpstorm-stubs：array_combine 任意输入数组

## 缺口与依据

现有声明把 keys、values 限制成 list，合法的关联数组输入不能匹配，返回对象类型和后续成员补全缺失。使用规范多行 PHPDoc 的四版基线均失败，调用表达式类型为 undefined。

固定来源 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `standard/standard_9.php` 与 [PHP 官方手册](https://www.php.net/manual/en/function.array-combine.php)均声明输入为 array。版本失败边界保留：PHP 7 返回 false，PHP 8 参数数量不等抛出 ValueError。

## 修改

- keys 参数 PHPDoc 为 `array<array-key, mixed>`，允许数组的原始索引以及 PHP 可转换的键元素。
- values 参数为 `array<array-key, TValue>`，保留对象值类型，不要求列表索引。
- 返回继续是 `array<array-key, TValue>`，PHP 7 保留 `|false`。没有把字符串输入键推断成纯字符串输出键，因为 PHP 会进行键转换。
- 复用现有模板绑定及 foreach 类型消费，无新增函数专属语义分支。

## 验证

- 六套实际 PHP：7.2／7.4／8.1／8.2／8.4／8.5。关联输入、同一对象身份、float／bool／null 键转换、空数组和数量不等边界全通过。可重跑 `node scripts/check-array-combine-runtime.mjs /usr/bin/php72 /usr/bin/php74 /usr/bin/php81 /usr/bin/php82 /usr/bin/php84 /usr/bin/php85`。
- 四版语义 4/4：每版 3 类 keys × 3 类 values，逐项核对对象返回类型及 foreach 成员补全。
- 语言规格全量 177/177、七文件、17.00 秒。
- PHP 7.2／8.5 根 bundle 实际 stdio 2/2：每版 Item→Other→mixed→Item 四次未保存更新，成员候选撤回／恢复、Hover 及版本 false 边界正确，磁盘未变。
- Linux VS Code 1.140.0 隔离 Core 宿主退出 0：相同四次未保存更新，Hover 和成员候选正确，文档 dirty、磁盘未变。
- language-spec、根 bundle 构建、扩展测试 TypeScript 和本批 ESLint 均退出 0。

完整语义回归退出 0：1197/1197、55 文件、51.78 秒。本次未重跑完整 stdio、Windows 宿主或真人 WSL UI，也未测量可见补全弹窗。未打包、提交、推送或更新 Profile；不能据此声称全部数组函数合同完成。
