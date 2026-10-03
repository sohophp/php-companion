# phpstorm-stubs：get_headers 返回类型合同

## 范围与依据

- 固定来源：JetBrains/phpstorm-stubs `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `standard/standard_6.php`。核对函数签名，没有复制说明文本。
- [PHP 官方手册](https://www.php.net/manual/en/function.get-headers.php)说明列表／关联模式与失败 false；重复响应头的数组值通过自有 loopback HTTP fixture 独立实测。
- 修改前四版语义回归均失败：默认调用仅得到 `array|false`，丢失元素信息。

## 修改

- PHP 7 的 `format = 0` 和 PHP 8 的 `associative = false` 返回 `list<string>|false`。
- 已证明关联模式返回 `array<array-key, string|list<string>>|false`；字符串值和重复头的字符串列表都保留。
- 未知模式合并两个分支，失败 false 不丢失。沿用现有条件 PHPDoc 消费，不增加函数专属语义路径。
- PHP 7/8 原生签名及 context 参数保持现有版本划分；PHP 8 命名参数亦验证。
- 非 false 保护后，下标值具有相应类型；同名用户函数保留自身返回类型。
- 没有固定响应头键建议，服务端头名称无法由这一合同证明。

## 已验证

- 六套真实 Linux PHP：7.2／7.4／8.1／8.2／8.4／8.5，默认列表、重复头数组、单值头、失败 false 均通过。可重跑 `node scripts/check-headers-runtime.mjs /usr/bin/php72 /usr/bin/php74 /usr/bin/php81 /usr/bin/php82 /usr/bin/php84 /usr/bin/php85`。
- 语言规格全量 168/168，六文件；四版定向语义 4/4，每版包含默认、显式模式、未知模式、成功保护、用户同名函数，PHP 8 另含命名实参。
- PHP 7.2／8.5 实际根 bundle stdio 2/2：每版四次未保存更新与 Hover 校验，默认→关联→未知→默认，磁盘保持原始文本。
- Linux VS Code 1.140.0 隔离 Core 宿主退出 0：四次未保存类型切换和恢复通过，文档保持 dirty，磁盘未变。
- language-spec 构建、根 bundle 构建、扩展测试 TypeScript 检查退出 0。
- 完整语义回归退出 0：1193/1193、54 文件、50.90 秒；本次修改文件 ESLint 退出 0。

## 尚未计入本次结论

本次未重跑完整 stdio、Windows 宿主、可见 Hover 浮窗或真人 WSL UI。不打包、不提交、不推送、不更新 Profile。此记录只关闭 get_headers 合同缺口，不代表全部内置签名完成。
