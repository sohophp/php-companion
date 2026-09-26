# C3：多工作区类型生成的备用暂存目录

日期：2026-09-26。仅修改 SoPHP 源码和独立宿主用例；未修改业务项目、未打包 VSIX。

从活动 PHP 编辑器执行“创建 PHP 类型”且不传目标 URI 时，命令原先始终把第一个工作区目录作为 `folder`。生成位置和 Composer 命名空间来自活动文件，但首次暂存移动失败后的备用暂存文件却可能放到第一个项目旁边。在多根位于不同文件系统的工作区，这会削弱同文件系统移动路径，增加落入 `createFile` 兜底的机会；该兜底仍有已知 Redo 缺口。

现在无显式目标时，从活动文件目录找到所属工作区；没有活动编辑器时才取第一个工作区。C3 宿主动态加入第二个独立 Composer 项目，激活其 PHP 编辑器，注入首次暂存移动失败，并验证备用暂存文件位于第二个项目旁边、生成的类型属于第二个项目的 `Other\\Service` 命名空间。该测试在修复前会因备用暂存路径指向第一个工作区而失败。

`pnpm exec tsc -p test/extension/tsconfig.json --noEmit`、定向 ESLint、`pnpm test:extension:c3` 均退出码 0。完整宿主使用 VS Code 1.139.1 Linux x64；末尾输出 `C3 Create PHP Type used the active Composer workspace for its fallback stage`。结果证明本机源码宿主的多根选择，尚不等于冻结候选或真实 WSL Remote 验收。
