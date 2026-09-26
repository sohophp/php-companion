# C3 标量拼接 echo 的 Extract Method

日期：2026-09-26。SoPHP Core 在独立 Composer 夹具和当前 10 项 Open Source Pack 源码组合中验证；未修改业务项目，未生成 VSIX。

`echo $first . $second;` 现在可以在两个变量均为已声明的原生标量类型时提取为私有方法。生成的方法保留原拼接表达式与参数顺序。对象操作数仍被拒绝，避免提取时改变对象到字符串的转换或副作用；复杂表达式仍按原有保守规则处理。

语义包 344 项测试通过，包含标量正例与对象反例。VS Code 1.139.0 Linux x64 的 10 项 Pack C3 源码宿主退出码 0：实际 Code Action 出现，取消后源码不变，应用后生成带两个 `string` 参数的私有方法，标准一次 Undo/Redo 恢复正确；对象拼接没有 Extract Method。宿主日志 `/tmp/sophp-c3-extract-scalar-concat-pack10-20260926.log`。根扩展与宿主 TypeScript、相关 ESLint、差异检查通过。

本项是 C3 高频编辑范围的一个受限增量。当前源码还未进入安装候选；真实 WSL Remote、跨平台和长期使用仍按 C4 门槛验收。
