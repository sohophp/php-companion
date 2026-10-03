# R38 字符串键和值前缀补全

日期：2026-10-02。已应用到当前分支；应用前 R37 完整协议 423/423、零跳过与十九项终态输入一致已确认。

## 修改

统一字符串前缀读取、已知转义解码和插入文本转义。标点、中文、转义引号及反斜线参与实际内容匹配；闭合字符串的词中光标会替换完整后缀。字符串里的 `=>` 不再误作数组键值分隔符。嵌套形状路径、键对应的实参值和已使用键过滤使用同一键读取逻辑。

PHPDoc 解析器保留转义键名，语义层从已解析字面值取得真实键名。双引号插入内容中的 `$` 被转义，避免变成变量插值。两个引号分别定位并按已有字符串／注释范围过滤，不再把 PHPDoc 单引号误当作当前未闭合双引号。

前缀读取最多 4,096 字符；R37 的数组恢复、作用域和合同预算不变。不增加配置，不猜未知合同或插值内容。转义规则核对 [PHP 字符串手册](https://www.php.net/manual/en/language.types.string.php)。数字／十六进制／Unicode 转义、多行和插值前缀本批仍保守撤回，未宣称全部字符串语法已支持。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| 主产品完整语义 | 35 文件、910/910，50.80 秒，退出码 0 |
| 新语义文件 | 58 项：标点／中文／转义、空键、嵌套路径、已有键、词中光标、注释和 HTML 负例、美元符号及前后引号类型 |
| PHPDoc 全量 | 21/21；新增六种键名、optional 标记、嵌套类型、偏移及损坏输入断言 |
| 主产品定向 stdio | 6 通过、419 跳过，总 425，17.86 秒；新场景 PHP 7.2／8.5 各 16 个状态，完整候选、文本及原始编辑范围 |
| 完整 Core C2 | 修正后退出码 0；既有断言与本批十六个闭合／未闭合候选场景通过 |
| PHP 8.5 可见列表 | 16 次，116–182 ms；精确 Tab 全文与 Undo/Redo，退出码 0 |
| PHP 7.2 可见列表 | 16 次，114–164 ms；精确 Tab 全文与 Undo/Redo，退出码 0 |
| 热查询 | 0／2,300 背景文件，800 次 completionContext 查询；最差场景 P95 1.84 ms，错误候选与 revision 改变为 0；不是 UI 等待 |
| PHP 实际字符串值 | PHP 7.2／8.5 共 40 个结果，单／双引号、中文、美元符号、反斜线、引号、换行和空串与原值完全一致 |
| 构建、bundle、宿主编译、定向 ESLint | 退出码 0；本批路径 diff --check 通过 |

第一轮协议和完整 C2 暴露未闭合双引号定位错误，保留失败用例后修复；第一次 C2 失败不能算通过。修正后完整 Core C2 会话 80049 已退出码 0，既有与新增精确候选断言全部通过；二十七项宿主终态输入一致。完整 425 stdio 会话 26446 运行中；冻结二十七项输入，保持相同 source／bundle，等待原进程终态后再核对。准备副本 885/906 的历史结果不能替代主产品 910 或本批完整协议。

当前日志：`/tmp/sophp-quoted-prefix-product-semantic-final.log`、`/tmp/sophp-quoted-prefix-phpdoc.log`、`/tmp/sophp-quoted-prefix-product-stdio-final.log`、`/tmp/sophp-quoted-prefix-product-visible-85.log`、`/tmp/sophp-quoted-prefix-product-visible-72.log`、`/tmp/sophp-quoted-prefix-product-full-c2-final.log`、`/tmp/sophp-quoted-prefix-product-full-stdio.log`。冻结输入：`/tmp/sophp-quoted-prefix-product-inputs.sha256`。

PHP 8.5 日志仍包含已独立复现的 VS Code getItemsByProvider renderer 错误，功能断言通过不代表修复该平台错误。真实 WSL、完整 C3 Symfony 快照组合和整条路线图仍未完成；不例行打包、提交、推送或更新 Profile。

## 完整协议终态

原会话 26446 已退出码 0：425/425 通过、零跳过、1323.76 秒。二十七项冻结输入终态一致，见 `/tmp/sophp-quoted-prefix-product-final-inputs.log`。该结果对应 R38 产品源码，不替代后续数组读取补全源码的验证。
