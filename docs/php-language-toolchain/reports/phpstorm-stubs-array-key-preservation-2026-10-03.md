# phpstorm-stubs：反转、切片与分块的键类型

## 范围与来源

核对干净的固定 JetBrains/phpstorm-stubs 修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 中 standard/standard_8.php、standard/standard_9.php 的声明。键类型合同按 [array_reverse](https://www.php.net/manual/en/function.array-reverse.php)、[array_slice](https://www.php.net/manual/en/function.array-slice.php)、[array_chunk](https://www.php.net/manual/en/function.array-chunk.php) 官方手册独立补充；没有复制说明文本。

- reverse / slice 传递输入键域和元素模板。整数重新编号仍为 int；字符串键始终保留。不声明具体键名、非空或原顺序。
- chunk 的 preserve_keys=true 分支传递输入键域；默认／false 分支为整数键。未知布尔值保留两个返回分支；PHP 7 两分支均保留 null 失败返回，PHP 8 异常不建模为 null 返回。
- PHP 7 slice 的 length 用等价的显式 ?int 表达真实可空合同，修复合法 null 实参导致类型推导缺失。

## 验证

修复前新语义回归四版全部失败，首先复现 int 键被扩大为 int|string。

- 六套实际 PHP：7.2、7.4、8.1、8.2、8.4、8.5，混合键、保留／重编号及无效分块长度行为全部通过。脚本 scripts/check-array-key-preservation-runtime.mjs。
- 定向语义四版通过：每版 48 个正例及非法输入／缺参反例，PHP 8 命名实参重排和用户同名函数保护。
- 三文件真实 stdio：6/6，通过 PHP 7.2／8.5 共 16 次新用例未保存更新，原磁盘不变；相邻 flip/count_values 同时通过。
- Core Linux 隔离宿主：八次未保存编辑 Hover 全部匹配，磁盘不变，退出码 0。脚本 scripts/check-array-key-preservation-host.mjs；当前原始报告 /tmp/sophp-array-key-host.json。
- Core esbuild、根 tsc --noEmit、涉及文件 ESLint 通过。

全量声明包 **249/249（15 文件）**、全量语义包 **1303/1303（70 文件）** 通过；分别 13.67 秒、48.14 秒。首次回归发现旧测试仍要求反转／切片／分块返回宽泛键类型，保留失败日志并按已实测的新合同调整期待。扩展测试 tsc --noEmit 通过。标准库覆盖门禁退出 0：固定上游 585 名称条目，未归类缺席 0，当前 PHP 8.5 运行时导出缺席 0。

本项没有新增设置、打包、提交、推送或更新 Profile。隔离宿主 Provider 验证不是人工 WSL UI 验收，也不代表所有 stubs 类型合同均已补齐。
