# CSV 字段数组：函数与 SPL 方法合同

## 来源与缺口

核对固定 phpstorm-stubs 修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `standard/standard_6.php`、`SPL/SPL_c1.php` 和 [fputcsv 官方手册](https://www.php.net/manual/en/function.fputcsv.php)、[SplFileObject::fputcsv 官方手册](https://www.php.net/manual/en/splfileobject.fputcsv.php)。两个入口均要求 fields 为数组，没有列表索引或仅字符串元素限制。

现有全局函数 PHPDoc 误限 `array<int, string|int|float|null>`，方法误限 `list<string>`。修改前 PHP 7.2／8.5 的十六条语义查询中，普通字符串列表能得到 false|int；带布尔的列表、关联字符串数组、关联 mixed 数组均丢失返回类型。基线 `/tmp/sophp-csv-baseline.json` 保留实际结果。

## 修改

两版函数与 SPL 方法的 fields 合同统一为 `array<array-key, mixed>`，保留 PHP 7 参数名称、PHP 8 类型、PHP 8.1 eol 参数及现有 int|false 失败分支。未扩展通用语义规则，未复制说明文本；已有未提交改动保留。

mixed 表示不在这里猜测运行时字段转换规则，不能解释为任意对象都能成功写入。非数组实参和缺必填参数仍不能证明合法返回。

## 终态证据

- 六套实际 PHP 7.2／7.4／8.1／8.2／8.4／8.5：函数和 SplTempFileObject 方法写入同一关联数组，字段覆盖字符串、int、float、bool、null、带 __toString 的对象，均输出 `alpha,12,1.5,1,,object` 加换行；两个返回值均为 23。显式指定 escape，未依赖 PHP 8.4 已弃用默认值。脚本 `scripts/check-csv-fields-runtime.mjs`，日志 `/tmp/sophp-csv-fields-runtime.jsonl`。
- 语言规格完整：213/213、十一文件、13.84 秒；九个版本分别检查全局函数与方法，确保没有把方法签名误当全局入口。首次新增规格测试误定位方法中的 function 子串，三个旧版本断言失败；修正测试位置后全量通过。
- 完整语义：1221/1221、六十一文件、54.39 秒；新增四版五种数组 × 两入口、scalar／缺参反例及 PHP 8 命名参数。
- 当前正式 Core 实际 LSP：CSV 与 iterator_apply 两文件 4/4、5.91 秒。本项两版 × 两入口 × 六次未保存列表→关联→bool→mixed→scalar→列表，共 24 次；合法数组保留 false|int，scalar 撤回，磁盘原文不变。
- Linux VS Code 1.140.0、PHP 8.5、Core 隔离宿主：两个入口共十二次未保存 Hover 验证、两次 scalar 撤回、列表恢复及磁盘未变，退出 0。
- language-spec 与根 Core 构建、最终定向 ESLint 均退出 0；运行时脚本首次 lint 缺 node:process 导入已补齐。

正式日志 `/tmp/sophp-csv-fields-spec-full-final.log`、`/tmp/sophp-csv-fields-semantic-full.log`、`/tmp/sophp-csv-fields-stdio.log`、`/tmp/sophp-csv-fields-host.log`、`/tmp/sophp-csv-fields-lint-final.log`。

## 范围限制

本项源码与定向协议／隔离宿主完成；此前集中 472 项协议不包含本项，未重跑完整 stdio 或完整 C2。Provider Hover 验证不替代可见弹窗、Windows 或真人 WSL 验收。未打包、提交、推送或更新 Profile。
