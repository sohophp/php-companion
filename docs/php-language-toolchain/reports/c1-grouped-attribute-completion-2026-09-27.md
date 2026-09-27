# C1：同组第二个 Attribute 名称补全

日期：2026-09-27。仅修改 SoPHP 隔离工作树与独立 Composer/VS Code 夹具；没有修改业务项目、安装用户 Profile 或打包 VSIX。

可复现缺口：`#[\Domain\First, Sec]` 的第二个 Attribute 名称原本没有候选，因为类型输入上下文只识别紧邻 `#[` 的首个名字。现在补全识别 Attribute 组顶层逗号后的名字，跳过参数列表和数组中的逗号，并保留现有的 Attribute 类身份与 `TARGET_*` 目标筛选。限定名称、逗号后注释和未闭合的输入也有语义回归。此上下文同时供按需候选加载使用，所以未打开的 Composer 类可以出现在建议中。

验证：修复前新增语义用例得到空候选；修复后语义 433/433、`pnpm build`、测试入口 TypeScript、改动文件 ESLint 与 `git diff --check` 通过。VS Code 1.139.1 Linux x64 的完整 10 项 Open Source Pack C1 **源码宿主**退出码 0，在未打开的 Composer 类型中，class 位置只包含适用的 `TARGET_CLASS` 与默认目标，method 位置只包含适用的 `TARGET_METHOD` 与默认目标。宿主日志 `/tmp/sophp-grouped-attribute-pack10-20260927.log`。

本次处理组内名称输入；Attribute 构造参数适配、重复使用限制、真实 WSL Remote、已安装 0.4.8 VSIX 与长期会话仍需分别验收。新源码尚未进入 0.4.8 冻结候选。
