# C3 完整条件返回的 Extract Method

日期：2026-09-25。独立 Composer 夹具和 10 项 Open Source Pack 源码 Profile；未修改 Winstar 文件，也未重新打包 VSIX。

`Extract Method` 现支持单个完整 `if / elseif / else`，每个分支只有一个直接 `return`，条件仅由有原生 `bool` 类型的参数、`!`、`&&`、`||` 与括号组成。原方法有原生返回类型时，分支表达式需证明为同一类型，新私有方法保留该类型；原方法没有返回类型时，允许分支返回不同类型，并让新私有方法也保持无返回类型。提取后原位置变为 `return $this->extractedMethod(...)`。缺少最终 `else`、分支混用赋值与返回、已声明类型不符、`void`、不安全条件或选区注释时拒绝提供操作。

语义包完整回归 395/395 通过，TypeScript、相关 ESLint 和差异检查通过。完整 C3 Open Source Pack 源码宿主复跑退出码 0，新场景通过代码操作、预览取消、应用及一次 Undo/Redo；日志 `/tmp/sophp-c3-branch-return-pack10-rerun-20260925.log`。首次宿主运行在进入此用例之前收到 VS Code `Canceled` 并退出码 1，日志 `/tmp/sophp-c3-branch-return-pack10-20260925.log`，因此保留这次不稳定记录；复跑的通过不证明取消根因已经消除。

随后补充的无类型混合返回场景，在语义层用字符串、整数和布尔值分支验证；完整 Pack C3 源码宿主再次通过预览取消、应用及一次 Undo/Redo，退出码 0，日志 `/tmp/sophp-c3-untyped-branch-return-pack10-20260925.log`。该场景不会给原本无类型的方法新增返回类型约束。

本轮改动尚未进入已冻结的 `21977ee1` 私有候选。新文件生成的一次 Redo 仍是独立 C3 阻断项；真实 WSL Remote、跨平台和持续人工使用仍属 C4。
