# C1：函数与常量导入补全

日期：2026-09-27。0.4.10 发布后的源码增量；没有修改业务项目或打包 VSIX。

顶层 `use function Vendor\crea`、`use const Vendor\api_` 原先没有符号候选。现在 Core 识别这两个导入位置，只返回对应种类及 namespace 的声明；建议直接替换当前段，不另插入一条 `use`。未打开的 Composer `autoload.files` 声明按需读取，已加载的项目和内建声明沿用语义快照。函数与常量的命名空间段也可建议。超过 256 个显式文件时采用有界名称预筛；搜索无法证明完整时把结果标为未完成。类体里的无效导入不会进入此上下文。

独立 Composer 真实 LSP 测试先证明无候选，再验证未打开的函数、常量文件各返回正确种类与一次候选，小写常量前缀可替换为实际大写名称，namespace 段可补全，没有重复导入编辑。完整 Semantic 441/441，定向 Language Server stdio 2/2、改动文件 ESLint、TypeScript 构建和 `git diff --check` 通过。VS Code 1.139.1 Linux x64 的独立 C1 源码宿主实际请求两种导入建议，均只有一项且不附加 `use` 编辑；完整 C1 操作链退出码 0。

组合 Pack、Windows/macOS 和真实 WSL Remote 尚未验证此发布后增量；下次候选冻结时进入这些门禁。动态生成符号以及未被 Composer 显式加载、也未进入当前索引的函数和常量继续遵循现有按需索引边界。
