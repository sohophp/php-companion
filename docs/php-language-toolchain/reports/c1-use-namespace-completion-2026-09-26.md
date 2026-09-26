# C1 手写 use 的 Composer 命名空间补全

日期：2026-09-26。仅修改 SoPHP 源码和独立 Composer/VS Code 夹具；未修改业务项目，未重新打包 VSIX。

在普通类导入中输入 `use Dom`，现在会从项目及依赖的 Composer PSR-4 映射建议 `Domain\\`。继续输入 `use Domain\\Bil` 时，只读取对应映射目录的下一层并建议 `Billing\\`。在 `use Domain\\` 后，会同时建议下一层命名空间和直接位于 `Domain` 下、尚未打开的类；嵌套目录中的类不冒充直接成员。trait `use`、`use function` 与 `use const` 不进入这条类命名空间补全链。目录结果按一层读取并限制为 64 项，未完成的结果标为 incomplete。

实现过程中，真实 stdio 用例先发现 `use Domain\\` 的类加载仍错误地使用当前文件的 `App` 命名空间。现按导入限定路径加载 PSR-4 目录，修正了未打开类缺失。语义完整回归 351/351；默认 `onDemand` 的独立 PSR-4 stdio 用例 1/1，覆盖根命名空间、子目录、直接类和未保存的路径变化。

VS Code 1.139.1 Linux x64 Core 源码宿主在明确 PHP 8.5 目标下，实际触发并接受 `use Ap` 的 `App\\` 建议；随后核对 `C1\\` 建议，向未保存缓冲区补入 `C1\\External\\` 后核对直接类候选。完整 C1 编辑查询、vendor 和多根链通过，宿主退出码 0；日志 `/tmp/sophp-c1-use-namespace-chain-20260926.log`。相关 TypeScript、ESLint 和差异检查通过。

当前命名空间目录发现由 PSR-4 映射提供；PSR-0、classmap/files 中仅由声明推导的命名空间路径和真实 WSL Remote 人工操作尚未验收。本次源码增量不在冻结候选 `15a5254` 中。
