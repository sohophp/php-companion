# C3 Extract Method：if / elseif / else 的同一局部输出

日期：2026-09-25。独立 Composer 项目与当前 10 项 Open Source Pack 源码 Profile；未修改 Winstar，也未打包 VSIX。

现在可选择类方法内一整个 `if / elseif / else`：各条件只读取原方法的原生 `bool` 参数，可组合 `!`、`&&`、`||` 和括号；每个分支块各有一条对同一新局部变量的直接赋值，所有右值都能证明为相同返回类型，且该变量在分支后继续使用。提取后的私有方法按条件中首次出现的顺序接收参数，保留原短路表达式与分支执行顺序并返回局部值；调用点把结果赋回原变量。来源变量在提取前已使用、任一分支输出不同、缺少最终 `else`、输出类型不一致、右值依赖自身或含注释时拒绝；比较、位运算和方法调用条件也暂不提取。其它控制流形式仍需单独证明。

语义包 393/393 通过；测试文件 TypeScript 和相关 ESLint 通过。VS Code 1.139.0 的完整 10 项 Pack 宿主退出码 0：`if ($flag && !$enabled) / elseif ($enabled) / else` 的 Code Action 可见，预览取消不改源文件，应用后的类型 Hover 仍为 `string`，一次 Undo 恢复原文、一次 Redo 恢复提取结果。简单条件、复合条件及多分支的日志分别为 `/tmp/sophp-c3-extract-if-output-pack10-20260925.log`、`/tmp/sophp-c3-extract-compound-if-pack10-20260925.log`、`/tmp/sophp-c3-extract-elseif-pack10-20260925.log`。

这是 Linux 源码组合证据。已安装候选、WSL Remote、其它平台和较复杂的分支数据流仍待 C4 或后续场景验收。新文件生成的一次 Redo 问题与此文本编辑的 Undo/Redo 独立，继续保持开放。
