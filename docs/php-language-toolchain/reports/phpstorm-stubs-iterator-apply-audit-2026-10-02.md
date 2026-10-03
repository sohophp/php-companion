# iterator_apply：任意参数数组原型核对

## 事实

固定来源 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `SPL/SPL_f.php` 与 [PHP 官方手册](https://www.php.net/manual/en/function.iterator-apply.php)把 args 声明为 array|null，当前产品 PHPDoc 则为 list<mixed>|null。

只读语义核对中，PHP 8.5 的已知关联数组、非列表整数索引数组导致合法 iterator_apply 调用表达式丢失返回 int；PHP 7.2 的三个输入现有类型均为 int。将生成声明字符串里的两版 list 限制在隔离原型中改为 `array<array-key, mixed>|null` 后，两版三类输入均为 int。不能声称 PHP 7 已发生相同返回缺失。

## 已有证据

- `/tmp/sophp-iterator-apply-prototype.json`：两版 × 原声明／原型 × 三种 args，十二条语义查询。
- 临时复制当前根 bundle，仅在自有临时目录替换两个声明字符串，没有改产品源码。两版实际 LSP 各四次关联→列表→非列表整数索引→关联 Hover 均显示 int；`/tmp/sophp-iterator-apply-lsp-prototype.json` 共八次，磁盘原文未变，临时 bundle 已清理。
- 六版本机 PHP 7.2／7.4／8.1／8.2／8.4／8.5 都接受关联参数数组，count 为 int。对反序的 b/a 字符串键，本机前四版按值顺序收到 [2,1]，后两版按命名参数收到 [1,2]；原始观测见 `/tmp/sophp-iterator-apply-runtime.json`。
- 起初分别假定所有 PHP 8 都按名称、所有版本都忽略名称，均被实际观测否定。没有按这两种假定实现任何规则。PHP 8.0／8.3 的精确边界尚未核验，不根据这六套运行时猜测。

## PHP 7 可空参数核对

隔离正式测试补充 null／省略 args 后，发现 PHP 7 当前声明的隐式可空 `array $args = null` 在语义签名中变成不可空 array，显式 null 合法调用丢失 int。六套 PHP 的 ReflectionParameter::allowsNull() 均为 true，直接传 null 均返回 1，见 `/tmp/sophp-iterator-apply-null-runtime.json`。

原型将 PHP 7 生成声明规范化为 `?array $args = null`；PHP 7.2／7.4 本机语法检查通过。两文件 13 项隔离测试通过（11.60 秒），覆盖四版数组／null／省略参数、非法 scalar、错误 iterator、必填参数缺失和 PHP 8 命名参数。只修正该内置签名的准确表示，不声称所有用户代码的隐式可空参数分析已经修复。

## 正式接入与终态

前一批集中协议原会话 37089 已退出 0（472/472、十五文件、零跳过、1388.33 秒），2905 项冻结输入终态未变。完成该终态复核后，本项才写入产品，前一批结果不包含本项。

正式修改：两版 PHPDoc args 改为 `array<array-key, mixed>|null`；PHP 7 生成签名规范化为 `?array $args = null`，保留 `$function` 名称和旧版返回 PHPDoc。没有修改通用用户参数可空分析，也没有增加回调转发名称规则。原目录其它未提交改动保留。

- 语言规格全量：204/204、十文件、13.38 秒；九个版本签名检查通过。原 SPL 断言预期隐式 array 表示，因此首次全量 203 通过、1 失败；同步为已证明合法且可空的 ?array 表示后全量通过。
- 完整语义：1217/1217、六十文件、53.43 秒。新增四版回归覆盖三种数组、null／省略 args、错误 scalar、错误 iterator、缺必填及 PHP 8 命名实参。
- 当前正式 Core bundle 实际 stdio：iterator_apply 与三个相邻数组合同，共四文件 8/8、4.78 秒；本项两版各六次未保存关联→列表→整数索引→null→省略→关联 Hover 为 int，磁盘未变。
- Linux VS Code 1.140.0、PHP 8.5、Core 隔离宿主：六次未保存 Hover 刷新通过，磁盘未变、退出 0。此项验证 Provider，不声称可见弹窗或真人 WSL 验收。
- 运行时脚本 `scripts/check-iterator-apply-runtime.mjs`：六套 PHP 验证任意关联参数数组、nullable、显式 null 与省略参数。只验证收到两个值，不猜测尚未证明的版本排序边界。
- language-spec 构建、根 Core 构建、定向 ESLint 均退出 0。

日志：`/tmp/sophp-iterator-apply-spec-full-final.log`、`/tmp/sophp-iterator-apply-semantic-full.log`、`/tmp/sophp-iterator-apply-stdio.log`、`/tmp/sophp-iterator-apply-host.log`、`/tmp/sophp-iterator-apply-runtime-final.jsonl`。

本项源码与定向协议／宿主验证完成；没有重跑包含本项的完整 stdio 和完整 C2。没有打包、提交、推送或更新 Profile。真人 WSL、Windows 与回调参数名称的精确版本边界仍分别留待对应任务。
