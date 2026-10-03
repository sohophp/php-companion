# phpstorm-stubs：高亮函数按实参细化返回

2026-10-02。限定现有 `highlight_string`、`highlight_file`、`show_source` 三项声明。

## 修改

原声明将输出模式和捕获模式合并为 string|bool（PHP 8.4 起字符串入口为 string|true）。四版语义复现均失败。现在在保留原生签名的同时用 PHPDoc 条件返回按 return 实参区分：

- 文件入口及旧版字符串入口：true 为 string|false，false／省略为 bool。
- PHP 8.4 起字符串入口：true 为 string，false／省略为 true。
- 未知 bool 保留两分支联合；文件读取失败 false 没有被删去。

签名核对固定 phpstorm-stubs `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `standard/standard_4.php`。条件事实按 [highlight_string 手册](https://www.php.net/manual/en/function.highlight-string.php)和 [highlight_file 手册](https://www.php.net/manual/en/function.highlight-file.php)独立建模，未复制说明文本。没有修改语义引擎；旧版字符串的潜在失败分支保留上游宽合同。

## 验证

- language-spec 全量 153/153，零跳过，13.73 秒，含九版新增声明检查。
- PHP 7.2／8.3／8.4／8.5 四项定向语义及两项图片合同，6/6，10.76 秒。验证省略、false、true、未知 bool，PHP 8 命名实参乱序也匹配。未知分支按联合类型集合核对，bool 包含 true／false，不以联合显示顺序当类型错误。
- 六版 Linux PHP（7.2／7.4／8.1／8.2／8.4／8.5）及原生 Windows 8.5.11 实际调用通过。自建临时文件；两种输出模式返回 true 且有输出，捕获模式返回非空字符串且无输出，缺失文件返回 false；finally 删除文件。
- 当前根 Core Linux 隔离 VS Code 宿主退出 0，三个入口共 12 次未保存切换的变量 Hover 类型匹配，切回 true 后正确恢复，磁盘未变。
- 语言规格和根 Core 构建、扩展夹具 noEmit、定向 ESLint 及 diff 检查通过。首次宿主断言误用了 `string $result` 文本形式，实际 Hover 为 `$result: string`；修正夹具后通过，没有产品 Hover 补丁。

本轮未重跑完整语义或完整 stdio，也未单列新增 stdio 夹具；当前编辑器宿主经正式语言服务器验证 Hover 更新。七套 PHP CLI 不等于两平台编辑器验证，Windows 编辑器及真实 WSL UI 没有在本轮验收。未打包、提交、推送或更新 Profile。

[哈希、实际调用与宿主结果](phpstorm-stubs-highlight-conditional-return-2026-10-02.json)。日志 `/tmp/sophp-stubs-highlight-*`。
