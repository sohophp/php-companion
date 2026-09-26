# C3：重叠 PSR-4 目录的类型生成

日期：2026-09-26。仅修改 SoPHP 源码与独立 VS Code 宿主测试，没有修改业务项目或打包 VSIX。

当 Composer 的两个 PSR-4 前缀指向同一目标目录时，原实现直接取清单中的第一个前缀。现在类型生成会列出最具体目录映射形成的不同有效命名空间，并让用户选择。取消选择时不打开预览或创建文件；选定后，预览与生成文件使用该命名空间。重复映射形成的相同命名空间会合并。跨根路径的相对路径检查也拒绝绝对结果。

独立宿主用 `App\\Dotted\\` 和 `Alternative\\` 同时映射到 `src/Service.With.Dot/`：取消不创建文件，选择 `Alternative` 后生成的 PHP 声明为 `namespace Alternative;`。`pnpm exec tsc -p test/extension/tsconfig.json --noEmit`、定向 ESLint 及完整 `pnpm test:extension:c3` 均退出码 0；宿主使用 VS Code 1.139.1 Linux x64，并覆盖既有 C3 安全编辑用例。

最具体映射优先级保持不变。最终 `createFile` 兜底的 Redo 缺口仍按既有记录处理；本次没有新的 VS Code 资源撤销栈线索。安装候选和真实 WSL Remote 尚未包含本次源码增量。
