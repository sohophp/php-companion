# Symfony 命名 render 参数与 renderView 模板上下文

日期：2026-09-26。范围为独立框架分析器和 Controller 上下文 Provider；未修改业务项目，未重新打包 VSIX。

Symfony 的 `AbstractController::render()` 与 `renderView()` 均可把 `view` 和 `parameters` 传给模板。原分析器按参数位置取第一个 AST 子节点，因此 `render(parameters: [...], view: '...')` 完全没有上下文；`renderView()` 也未被识别。新增回归先得到空结果，再改为按 PHP 位置与命名参数映射，并识别 `renderView()`。未知参数、重复参数、展开参数和命名参数后的普通位置参数不产生上下文，避免把错误调用映射到错误模板。

框架包 5 个测试文件、61 项通过；Controller Provider 4 项通过，包含未保存的新控制器 `renderView(parameters: ..., view: ...)` 的模板变量类型、来源 URI 与快照版本。两个包的 TypeScript 类型检查和相关 ESLint 通过。Provider 测试须先构建框架包，否则会读取旧 `dist`；已按该顺序复测通过。

随后在 VS Code 1.139.1 Linux x64 隔离源码宿主中，运行 `PHP_COMPANION_TEST_SYMFONY_CONTEXT_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js`，Extension Host 退出码 0。测试在独立临时项目打开 Controller，调用 `phpCompanion.provideTwigInterop`，确认命名 `render()` 和 `renderView()` 均返回完整的 `user` 类型与 PHP 来源；未保存地把模板名从 `named.html.twig` 改为 `edited.html.twig` 后，新上下文出现且旧上下文消失。运行前完成 `pnpm build`、Symfony 扩展源码构建和测试宿主 TypeScript 编译。

这证明 Symfony 生产端到 SoPHP Twig 桥的上下文链；TwigPlus 消费端的已安装 VSIX 与真实 WSL Remote 可见补全、导航仍归下一次候选和 C4 组合验收。
