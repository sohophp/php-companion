# C1：函数内 global 与 static 变量建议

日期：2026-09-26。仅修改 SoPHP 解析器、隔离测试及使用说明；未修改业务项目，未打包 VSIX。

在 PHP 通用词建议默认关闭后，`global $shared` 和 `static $cache = []` 产生的局部名字没有进入 SoPHP 的作用域候选。解析器已有这两种语法节点可供其它语义分析使用，但事实节点清单未把声明交给变量赋值提取。

现在解析器按函数作用域记录 `global` 声明的每个直接变量，以及函数内 `static` 声明的每个变量；候选只在声明之后出现。动态变量名不当作可静态建议的绑定，不把一个函数的声明传播到另一函数。这里只记录可见名字，不推测全局值或静态初值的类型。

验证：parser 87/87、semantic 406/406；相关 TypeScript、ESLint 通过。完整 10 项 Open Source Pack 的 VS Code 1.139.1 Linux x64 C1 源码宿主退出码 0，实际建议列表核对了 `global` 与 `static` 名字，日志 `/tmp/sophp-pack10-c1-declared-locals-20260926.log`。另一函数不继承声明由语义测试覆盖。

已安装 VSIX、真实 WSL Remote 和其它平台仍待 C4 验收。
