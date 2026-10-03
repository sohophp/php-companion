# C2：赋值后字符串文字的独立修复准备

日期：2026-10-02。本文保留临时准备过程；完整 stdio 383 项终态后已应用，当前源码与新增协议／宿主证据见[正式增量报告](c2-post-assignment-literal-types-2026-10-02.md)。下文“尚未应用”描述准备当时的状态。

当前只读语义探针：局部 `$value = null ?: new PrefixRepo();` 后，独立赋值 `$label = 'static';` 保留 ready；改成单引号的 `'literal $value'`、`'global eval &$value'` 或双引号的转义文字 `"escaped \$value"` 后建议为空。真实插值 `"$value"` 同样为空，但不能与普通文字混同。

原因是 harmless 的独立赋值检查先对 RHS 原文做 `includes(variable)`，早于标量字面量判断。临时修复仅允许语法确认的标量字面量跳过原文包含判断；双引号字符串必须只有 string_content／escape_sequence，真正的插值、对象访问、调用、写入、引用等不由此扩展。

临时目录 `/tmp/sophp-static-scope-snapshot` 以当前主源文件与 R22 测试为基线。逐文件比较语义 src/test，只有 `src/index.ts` 与 `test/local-prefix-syntax.test.ts` 两项不同；其它当前语义源文件和测试字节一致。新增赋值后正反例先失败，临时修复后通过；完整 18 文件 **555/555、48.89 s**，原始语义 tsconfig 类型检查及相关 ESLint 均退出码 0。临时源文件／测试的终态 SHA-256 均匹配。

日志 `/tmp/sophp-post-assignment-literal-{red,green,full-snapshot,typecheck,lint}.log`；两个输入哈希 `/tmp/sophp-post-assignment-literal-snapshot-inputs.sha256`；原始复现 `/tmp/sophp-local-prefix-next-repro.json`。

准备期间产品的完整 stdio 会话 93888 使用被冻结的 R21–R22 输入。它已以 383/383、零跳过、1180.04 s、退出码 0 终态并复核全部输入，随后才应用这份修复。临时全量测试单独不证明当前分支已修复，也不能替代实际编辑器验证；当前应用状态见正式报告。
