# C3 PHPDoc 类型引用与改名范围

日期：2026-09-27。改动位于 SoPHP 隔离源码分支，未进入冻结于 `248ee1f8` 的 0.4.7 VSIX。

## 问题与修复

独立夹具复现：当 `@return Widget description Widget` 的说明文字恰与项目类同名时，References 把两个 `Widget` 都当作类引用；数组形状的 `Widget:` 键和 `@method` 后的说明文字也会进入类 Rename 的候选列表。这会让安全改名编辑非类型内容。

现在类 References、Rename、Safe Move、复制符号与导入使用判断共用 PHPDoc 类型位置校验。解析器补充已支持的跨行类型续写名称，使 `@return list<` 下一行的 `Widget` 不会在 Rename 或 Safe Move 时漏掉。非类型说明文字与数组形状键不进入这些编辑范围；未知类型的导入建议也不再从说明文字产生。全局常量引用与改名只读取 PHP 代码名称；从 PHPDoc 大写词发起常量 Rename 或 References 也不会命中代码常量。

## 验证与边界

语义夹具逐个核对同名说明文字、形状键、`@method` 参数与跨行类型的 References、Rename、Safe Move 编辑起点；另核对 PHPDoc 说明文字中的全局常量名不会被改名。Parser **87/87**、语义 **368/368**、`pnpm build`、扩展 TypeScript、相关 ESLint 和差异检查通过。完整 10 项 Open Source Pack 的 C1 源码宿主验证精确 References，日志 `/tmp/sophp-c1-phpdoc-reference-safety-pack10-20260927.log`；C3 源码宿主使用真实 VS Code Rename Provider 核对预览编辑范围，完整 C3 链退出码 **0**，日志 `/tmp/sophp-c3-phpdoc-rename-safety-pack10-20260927.log`。

C3 宿主通过后增加的全局常量与未知类型建议过滤由定向语义测试验证，没有重新跑完整宿主。任意复杂的 PHPDoc 语法、真实 WSL Remote、其它平台、安装候选和长期使用仍按后续门禁验收。PHPDoc 注释生成继续由 PHP DocBlocker 负责。
