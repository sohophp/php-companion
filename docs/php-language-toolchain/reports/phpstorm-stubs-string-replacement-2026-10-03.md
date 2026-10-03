# str_replace／str_ireplace：subject 与数组键返回合同

## 来源与核对

固定 phpstorm-stubs 修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `standard/standard_1.php` 与 [str_replace 官方手册](https://www.php.net/manual/en/function.str-replace.php)、[str_ireplace 官方手册](https://www.php.net/manual/en/function.str-ireplace.php)确认 subject 的字符串／数组返回模式。

运行时探测发现不能把所有版本的数组元素都声明为 string：PHP 7.2／7.4 会保留对象和嵌套数组；PHP 8.1／8.2／8.4／8.5 会转换这些元素为字符串。进一步只读核对 [PHP 8.0.0 源码](https://github.com/php/php-src/blob/php-8.0.0/ext/standard/string.c)与 [PHP 7.4.0 源码](https://github.com/php/php-src/blob/php-7.4.0/ext/standard/string.c)的 php_str_replace_common，确认 PHP 8.0 已逐项转成字符串，旧版有数组／对象直接保留分支。源码只用来核对，没有复制进产品；本机没有 PHP 8.0／8.3 直接运行时。

修改前两个入口无论已知字符串还是数组，都得到宽 array|string。两版 × 修改前／隔离原型 × 四种输入 × 两函数，共三十二条查询见 `/tmp/sophp-string-replacement-prototype.json`。

## 修改

共享生成两个函数的声明：宽签名保留实际版本原生类型和旧版 replace_count 名称，返回合同按 subject 判断字符串或数组；数组静态重载用 TKey 保留已知键类型。PHP 7 数组值为 mixed，PHP 8 成功返回的数组值为 string；窄数组签名属于静态重载，不冒充独立 PHP 运行时函数。

已知 string 得 string；已知 array<string, mixed> 在 PHP 8 得 array<string, string>，PHP 7 得 array<string, mixed>；list 输入保留整数键的数组类型；未知 array|string 保留两种返回分支。没有承诺数组精确 shape 或连续列表标记，也没有改变搜索／替换跨参数约束或旧版 subject 标量转换规则。

## 终态验证

- 六套实际 PHP：两个函数字符串返回 Zb，数组外层键保留；字符串、int、bool、null、Stringable 对象及嵌套数组分别探测。旧版对象／嵌套数组保留身份与内容，现代版本转成 string，count 亦按实际转换核对。数组转换警告只在运行时探测中抑制，不改变产品。脚本 `scripts/check-string-replacement-runtime.mjs`、日志 `/tmp/sophp-string-replacement-runtime.jsonl`。
- 规格完整：231/231、十三文件、20.82 秒；九版本两个入口的宽／窄合同及旧版名称检查通过。
- 完整语义：1229/1229、六十三文件、53.20 秒。新增四版五种输入 × 两函数 × 带／不带 count，缺参反例、现代反序命名参数及命名空间同名用户函数保护。
- 当前正式 Core 实际 stdio：本项与 array_column，两文件 4/4、5.09 秒；本项两版 × 两入口 × 五次未保存 string→list→关联→union→string，共二十次完整 Hover 类型核对，磁盘未变。
- Linux VS Code 1.140.0、PHP 8.5、Core 隔离宿主：两个入口十次相同输入切换，旧返回类型撤回／恢复、磁盘未变、退出 0。
- language-spec 与根 Core 构建、语义／规格／协议／宿主测试及运行时脚本定向 ESLint 均退出 0。

日志 `/tmp/sophp-string-replacement-spec-full.log`、`/tmp/sophp-string-replacement-semantic-full.log`、`/tmp/sophp-string-replacement-stdio.log`、`/tmp/sophp-string-replacement-host.log`、`/tmp/sophp-string-replacement-lint.log`、`/tmp/sophp-string-replacement-host-lint.log`。

## 验收范围

本批源码与定向协议／宿主验证完成；之前集中 472 项协议不包含此修改，没有重跑当前完整 stdio 或完整 C2。Provider Hover 不替代可见弹窗、Windows 和真人 WSL 使用。已有其它未提交改动保留。未打包、提交、推送或更新 Profile。
