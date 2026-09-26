# C1 跨行 PHPDoc 类型跳转与未保存反馈

日期：2026-09-27。此改动在 SoPHP 隔离源码分支，未进入冻结于 `248ee1f8` 的 0.4.7 候选。

上一轮的 PHPDoc Definition 使用解析器的同一行名称列表限制类型位置。输入 `/** @return list<` 后换行继续写 `* Widget` 时，补全已有候选，但 Definition 返回空。新的导航判断从光标所在完整名称和已有 PHPDoc 类型上下文确认位置，因此能识别已支持的跨行泛型、联合等续行；说明文字、普通注释、数组形状键及 `@method` 方法名仍无类型 Definition。

独立语义夹具将跨行类型 `Widget → Other → Widget` 按未保存编辑顺序更新，并逐次检查目标；修复前首个 Definition 为空，修复后均正确。`semantic.test.ts` **367/367** 通过，`pnpm build`、扩展宿主 TypeScript 和修改文件 ESLint 通过。完整 10 项 Open Source Pack 源码 Profile 在 VS Code 1.139.1 Linux x64、PHP 8.5、按需索引下，实际执行跨行 Definition、未保存替换和 Undo 后的 Definition，完整 C1 宿主退出码 **0**；日志 `/tmp/sophp-c1-phpdoc-continuation-pack10-20260927.log`。

这只覆盖已有补全语法允许的续行及上述编辑链；任意复杂 PHPDoc 类型、多平台、真实 WSL Remote、安装候选和长期会话仍需单独验收。PHPDoc 注释生成继续由 PHP DocBlocker 负责。
