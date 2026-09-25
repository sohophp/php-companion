# C3 参数重构：同名 first-class callable 归属

日期：2026-09-25。独立 Composer 测试输入，未修改业务项目，未生成 VSIX。

此前新增、删除、重排方法参数会对工作区源码执行同名 `->method(...)` 文本扫描；无关 final 类的 first-class callable，甚至注释中的同名文本，均可能让整个重构被拒绝。现在三个方法家族操作和私有方法新增参数共用可解析 callable 的归属判定：注释或字符串中的匹配跳过；已解析、且能证明来自无关 final 方法或 final 类的方法放行。属于目标方法、无法解析的 callable，以及无法证明固定目标的同名 callable 继续拒绝。未被解析成 callable 的真实代码仍保守拒绝。

`add-method-family-parameter.test.ts`、`remove-method-family-parameter.test.ts`、`add-private-parameter.test.ts` 和 `reorder-method-family-parameter.test.ts` 共 16/16 通过，包含无关 final 方法、目标方法、未知接收者、注释文本及带注释的目标 callable 反例。Semantic TypeScript、相关 ESLint 通过。独立 VS Code 1.139.0 Linux x64 C3 宿主通过新增、删除、重排及一次 Undo/Redo 的既有流程；重排输入额外包含无关 final 类的同名 first-class callable，实际编辑仅涉及接口、实现与调用方三个文件。日志 `/tmp/sophp-c3-family-callable-scope-20260925.log`，退出码 0。

宿主没有单独为新增和删除参数注入无关 callable；其放行行为由定向语义测试证明。[完整 11 项 Pack 源码宿主](open-source-pack-c3-optional-callable-2026-09-25.md)随后使用内部 PHPUnit 补丁版通过同一 C3 序列；Marketplace 原版、安装候选和 WSL Remote 仍待对应组合验收。类型生成文件的一次 Redo 问题仍开放。
