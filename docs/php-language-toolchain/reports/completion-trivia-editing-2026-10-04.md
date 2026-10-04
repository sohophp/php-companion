# D60：连续编辑中的词前缀与注释遮罩

## 当前基线与定位

在 ea92790c 当前生产 bundle 上恢复 D51–D53 的同一输入：241283 字节、1500 行注释常量，SHA-256 `6822eac6c769a7b97bc577e1eb8c6a8b637a4eeffe00683bed0d2a13d9f6e071`。普通串行 100 轮未保存修改交替 bool／string 字段契约，P50 251.20 ms、P95 301.44 ms。100 轮首项、另一侧候选保留、列表完整及磁盘不变通过；性能预算仍未完成。

随后一次 CPU 采样发现，预期值入口的全前缀词正则 self 1076.76 ms，调用者均为 completeExpectedValues；completionTriviaSource self 1140.93 ms，逐字符遮罩正则聚合 self 492.21 ms。这些是整次采样的累计时间，不能相加当作单次延迟。采样运行 P95 315.27 ms，单列，不用于普通改前／改后比较。解析、CST 访问及其它全前缀查询仍有开销，本批不推断已经消除它们。

## 修改

- 预期值补全复用已有 completionIdentifierPrefix，只读取光标左侧当前词；保留 ASCII／Latin1 和数字前缀边界，以及 quotedCompletion 的引号处理。
- 注释遮罩按连续非 CR／LF 片段生成等长空格，避免逐字符替换；UTF-16 偏移和每个换行保持一致。完整文档遮罩与局部 commentMaskedSlice 共用该实现，只遮蔽解析器已确认的范围。
- 新增 16 项，包含空串、长片段、中文／emoji、CRLF、裁剪／重叠范围、字面量中的注释样式文本，以及保留／临时 CST 下 30 次 bool／nullable 实参词中光标和未保存更新。检查精确替换范围及 revision／snapshot 不变。

## 相同输入的普通测量

| 指标 | 当前改前 | 本批改后 |
| --- | ---: | ---: |
| P50 | 251.20 ms | 210.20 ms |
| P95 | 301.44 ms | 284.86 ms |
| 最大 | 447.29 ms | 418.36 ms |
| 首次请求 | 350.61 ms | 376.55 ms |

各一次串行 100 轮，无 profiler／显式 GC，无构建／回归／宿主并行。两组所有候选正确性检查通过，首次请求没有改善，**P95 仍超过 150 ms，预算未通过**；不再重复同一测量到绿色。客户端计时从发送 completion 到收到响应，包含服务器排队处理之前 didChange 的工作，不含客户端序列化及编辑器展示。当前没有把编辑和查询分段的独立墙钟成绩；CPU 采样只用于定位。

[测量与 CPU 聚合归档](completion-trivia-edit-performance-2026-10-04.json)保留两组普通原始结果、独立 profiler 结果、输入和当前源码／bundle 哈希。自己的临时 Composer 夹具核对哈希及两个文件清单后删除；原始日志 `/tmp/sophp-d60-current-performance.log`、`/tmp/sophp-d60-after-performance.log` 和 CPU 原件 `/tmp/sophp-d60-current-cpu/` 保留。

恢复同一输入的源码生成方式如下，生成后须核对以上字节数及哈希：

```python
source = '<?php class Documentation {\n' + ''.join(
    f'/** comment {i} ' + ('documentation ' * 8)
    + f'*/ public const VALUE{i} = {i};\n' for i in range(1500)
) + '}\nfunction shapePickA():string{return "x";} function shapePickZ():bool{return true;}\n'
```

用现有 scripts/benchmark-project-completion.mjs 在该临时 Composer 项目交替执行测量归档中的 a／b 片段，100 轮，启用 EXPECT_FIRST 与 SHARED_CANDIDATES；生产 bundle 与两个 WASM 路径见归档。普通测量不启用 CPU_PROFILE_DIR 或 GC。

## 当前源码验证

- 定向语义四文件／124 项通过，2.96 秒；日志 `/tmp/sophp-d60-focused.log`。最后只缩短了长输入测试标题，全部进入下述完整回归。
- 完整语义 96 文件／2026 项全通过，64.58 秒，原会话 75715 退出 0；日志 `/tmp/sophp-d60-full-semantic.log`。无构建／宿主并行，未改超时门槛。
- 字段值及未闭合 callable 的 PHP 7.2／8.5 stdio 四项通过，518 项未选中，14.50 秒，原会话 60958 退出 0；日志 `/tmp/sophp-d60-protocol.log`。
- 混合 PHP 区块的 stdio 两项通过，520 项未选中，9.40 秒，原会话 79261 退出 0；日志 `/tmp/sophp-d60-mixed-protocol.log`。两组共六项；未选中不计通过，服务器版本配置不等于全部实际 PHP 运行时验收。
- semantic／language-server／生产 bundle 构建及定向 ESLint、diff 检查通过，原构建会话 81460 与 lint 会话 77250 退出 0。
- [当前隔离编辑器记录](completion-trivia-visible-2026-10-04.json)：Linux VS Code 1.140.0／PHP 8.5，注释后的函数、字面量、嵌套字段及常量各 Enter／Tab，八次实际首项、精确文本、光标、Undo／Redo 与磁盘不变通过。原会话 83356 退出 0；日志 `/tmp/sophp-d60-visible-host.log`。显式触发等待 149–517 ms，首个 517 ms 保留；不作为自动弹出或 P95 门禁。八份实际接受后的闭合文本均通过 PHP 8.5.9 `-l`，只编译、不执行，源码哈希与退出码随记录归档。

当前完整 LSP 绿色仍绑定 a3678016；本批定向检查不替代新源码的完整组合。大型连续编辑预算、超过恢复长度上限的输入、自动弹出、全部平台／规模及真人 WSL 继续单列。完成必要本地源码检查点后推进独立范围；本批不打包、推送或更新 Profile，goal active。
