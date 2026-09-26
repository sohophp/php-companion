# C1 原生联合与交集类型的后续补全

日期：2026-09-26。只修改 SoPHP 源码；夹具是独立临时 Composer 项目，未修改业务项目，也未生成 VSIX。

`onDemand` 下输入原生类型声明的第二个类型时，例如 `function run(string|Inv $value)`，此前类型上下文识别返回空，无法继续搜索未打开文件中的 `Invoice`。同一缺口存在于返回类型和属性的联合/交集位置。

现在仅在已识别的参数、返回和属性声明位置，把 `|` 或 `&` 后的名称作为类型补全前缀。普通表达式中的 `echo string|Inv` 仍不触发类型补全。延用现有 Composer 按需候选搜索与导入编辑，不增加工作区扫描模式或新的 Provider。

语义测试先复现空结果，修复后参数、返回、属性及表达式反例通过；完整语义包 **347/347**。真实 stdio LSP 用独立 PSR-4 夹具验证未打开 `Domain\\Billing\\Invoice` 在联合参数和联合返回位置可补全；定向用例 **1/1**。`pnpm build`、扩展测试 TypeScript、改动文件 ESLint 和 `git diff --check` 通过。

VS Code 1.139.1 Linux x64 的 Core 源码隔离宿主在独立 Composer 项目验证联合参数、联合返回和交集属性三个位置：每处只返回一个 `C1ExternalTypeProbe` 类建议，并附带 `use App\\C1\\External\\C1ExternalTypeProbe;` 导入编辑。随后以明确的 `PHP_COMPANION_TEST_C1_PHP_VERSION=8.5` 再跑同一链，连同参数 Attribute 补全通过；原有六项编辑查询、未保存接收者切换、Composer vendor 和多根链继续通过，Extension Host 退出码 **0**。首次宿主的 `auto` 设置在本机对应默认 PHP 7.2；因此只把明确 8.5 目标的结果作为 PHP 8 类型语法证据。安装后的 VS Code 操作、真实 WSL Remote 和跨平台仍待下一次候选验收。
