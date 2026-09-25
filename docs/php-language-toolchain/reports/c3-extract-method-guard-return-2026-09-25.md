# C3 提前返回与最终返回的 Extract Method

日期：2026-09-25。独立 Composer 夹具、10 项 Open Source Pack 源码 Profile；未修改 Winstar 文件或打包 VSIX。

现在可以把连续的 `if ($flag) { return ...; } return ...;` 提取成一个私有方法，原位置保留 `return $this->extractedMethod($flag);`。无最终 `else` 的 `elseif` 链也可在后接最终 `return` 时提取；每个条件必须由原生 `bool` 参数及受支持的布尔运算组成，每个分支只含一个直接返回。原方法有原生返回类型时，返回表达式需证明为同一类型；原方法无返回类型时，新方法也不新增类型约束。缺少最终返回、分支中改为赋值、不安全条件、类型不符或选区注释时不提供操作。

新增语义用例先以 `undefined` 失败；实现后完整语义包 396/396 通过。测试还发现 `elseif` 链的最后一个条件原本没有进入输入列表，修正后定向用例与完整回归通过。相关 TypeScript、ESLint 与差异检查通过。

完整 C3 Pack 源码宿主在 typed、untyped 两种 guard return 上通过 Code Action、预览取消、应用及一次 Undo/Redo；最终未加临时重试的宿主退出码 0，日志 `/tmp/sophp-c3-guard-return-pack10-final-20260925.log`。首次宿主运行在新用例前、Symfony 路由导航之后被 VS Code `Canceled` 中断，日志 `/tmp/sophp-c3-guard-return-pack10-20260925.log`。中间一次宿主加入只读编辑器操作重试后通过，但没有触发重试，故移除该逻辑并在最终源码上复测通过；取消根因仍未确认。保留 `services.yaml`/`services.xml` 就绪阶段日志以便下次定位。

此改动尚未进入已冻结的私有候选 `21977ee1`。新文件生成的一次 Redo 仍是独立 C3 阻断项；真实 WSL Remote、跨平台和长期使用属于 C4。
