# 属性 Hook 关键字作用域

日期：2026-10-03。接续 D40 声明变量边界，处理已有补全计划中的作用域识别，不新增配置。

## 缺口与修正

Hook 块此前被识别为普通 statement，却没有 callable 标记，导致 `r` 无法优先建议 `return`。现在 AST 及未闭合语法恢复分别识别 getter／setter，`r` 首位为 `return`，接受文本为 `return `。嵌套闭包保留自己的 callable 上下文。

实际 PHP 8.4／8.5 确认 mixed getter 可返回 Generator；setter 的 void 返回合同禁止 Generator。因此只过滤 setter 的 `yield`／`yield from`，保留 getter、嵌套闭包及普通方法的生成器建议。最初“所有 Hook 禁止 yield”的假设已被运行结果否定，没有按该假设交付。这里不新增依据 getter 返回类型筛选生成器关键字的能力。

官方 [Property Hooks 手册](https://www.php.net/manual/en/language.oop5.property-hooks.php)说明 Hook 作用域及 get／set 语法；生成器差异另有下列实际运行证据。

## 当前证据

- 完整语义 75 文件、1337/1337、50.93 秒；保留树／临时树、未闭合 getter／setter、嵌套条件、闭包、普通方法及顶层反例分别覆盖。
- Hook 与 D40 真实 stdio 两文件 5/5、7.65 秒；Hook 两版各 16 次未保存查询，共 32 次，核对首位、插入空格、生成器候选及磁盘不变。D40 三版 36 次边界查询保持通过。
- 既有 magic-declaration 与 Hook 两文件 4/4、5.71 秒，保护普通声明补全。第一次命令多写了一个不存在的 magic 文件名，实际只运行两个存在的文件；上述后续命令使用正确文件名，不把不存在的文件算通过。
- Linux 隔离 VS Code 四次可见 Enter／Tab：getter／setter 接受 `return ` 后文本、空格、光标、Undo/Redo 和磁盘不变均通过。
- 实际 PHP 8.4／8.5 共十个预期结果：getter Generator、getter return、setter 裸 return、setter 内嵌闭包 Generator 成功；直接 setter Generator 以 void 类型错误拒绝。首次运行探针用了临时对象写属性这一非法形式，已修正为具名变量；不算产品缺陷。
- Semantic／Core 构建、根目录和宿主 TypeScript noEmit、定向 ESLint 通过。完整语义及宿主执行后仅追加显式 TypeScript 返回类型标注以满足 Lint，不改变运行逻辑。

原始日志：`/tmp/sophp-hook-keywords-{semantic-full,stdio,magic-stdio,host,types,host-types,lint}.log`；实际 PHP 和宿主 proof：`/tmp/sophp-hook-keywords-{php,host}.json`。

本修正未重新运行完整协议、Windows 或真人 WSL；此前 501 和 Windows C2 证明仍属于之前的 stubs 构建。不据此称整项补全验收完成。未打包、安装、更新 Profile、提交或推送。
