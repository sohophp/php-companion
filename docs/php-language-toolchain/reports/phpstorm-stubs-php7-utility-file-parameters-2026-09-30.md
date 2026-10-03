# phpstorm-stubs PHP 7 URL 与文件函数签名核对（2026-09-30）

按本机 PHP 7.2／7.4 反射结果，校正 URL 编解码、`parse_str`、`http_build_query`、Base64、序列化，以及 `fclose`、`fread`、`mkdir`、`rename`、`copy` 的旧参数名。相应 PHPDoc 的参数名也同步调整；PHP 8 声明维持原样。

接续[数学与类型判断核对](phpstorm-stubs-php7-math-predicate-parameters-2026-09-30.md)，标准库审计结果如下：

| PHP | 函数名缺失 | 单声明差异 | 重载形状差异 |
| --- | ---: | ---: | ---: |
| 7.2 | 0 | 37（原 52） | 16 |
| 7.4 | 0 | 38（原 53） | 16 |
| 8.5 | 0 | 0 | 9 |

剩余 PHP 7 单声明差异主要为数组函数参数名；`stream_context_set_option` 与 `pack` 需要按调用行为单独核对，不能仅凭反射形状改变现有合法重载。语言规格构建与 104 项测试通过。源码未打包、安装或更新 Profile。
