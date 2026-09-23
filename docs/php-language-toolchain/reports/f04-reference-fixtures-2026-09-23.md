# F04 References 编号验收输入

日期：2026-09-23。新增三个独立 PHP 输入，将方法和全局函数 References 的正例、合法文本反例、未完成输入绑定到 F04-REF-01/02/03。测试分别检查声明开关、真实调用的精确范围、字符串/nowdoc/块注释中的调用样式，以及未完成成员输入前已完整的调用。

验证：`pnpm --dir packages/semantic exec vitest run test/acceptance-f04-references.test.ts`，3 项通过；语义包全套 313 项、类型检查、相关 ESLint 及 `git diff --check` 通过。此项是语义层编号验收，不代表 F04 全部编辑器操作矩阵通过。

探索夹具时还发现开放缺口：`$printer = new Printer(); $printer->render();` 放在文件顶层时，当前语义工作区未从赋值推断接收者类型，References 从 `render` 声明查询返回空；把接收者改为有类型的函数参数后，真实调用可准确返回。现有 parser 仅为函数、方法、闭包等建立局部 scope；文件顶层没有同等赋值事实。该缺口需要独立设计和回归，不能以本轮有类型参数夹具宣称已解决。
