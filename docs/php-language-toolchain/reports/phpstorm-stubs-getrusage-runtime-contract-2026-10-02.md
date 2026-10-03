# getrusage：实测字段与返回声明

2026-10-02。承接[平台审计](phpstorm-stubs-getrusage-platform-audit-2026-10-02.md)，当前已接入主工作区并通过下述定向验收。前两节保留实现初期的分段记录。

## 已完成源码与验证

- 新增 language-spec 返回声明生成器 `src/getrusage.ts`。根据项目 PHP 的自身／子进程字段生成条件数组形状，保留失败 `false`；没有可靠字段时沿用 `array<string, int>|false`。保持 PHP 7 的 `$who` 与 PHP 8 的 `$mode` 签名。
- runtime-probe 新增 `getrusageRuntime`，通过实际 `getrusage()`／`getrusage(1)` 采集字段并传入客户端结果。函数不可用或调用失败时不提供字段。输入规范化拒绝重复、未知及缺少基本计时字段的快照。
- 5 项定向语义测试通过（2.37 秒，零跳过）：成功保护、失败分支、默认／子进程／未知实参、平台切换撤回旧键及缺失信息后撤回键。字段不同的子进程样例是合成合同测试，实际 Windows 8.5 两种模式均为六字段。
- runtime-probe 全量 30/30 通过（0.513 秒，零跳过）；构建、language-spec TypeScript noEmit 和定向 ESLint 通过。
- 实际调用当前 runtime-probe 验证六版 Linux PHP 7.2／7.4／8.1／8.2／8.4／8.5 均取得 17 字段、原生 Windows PHP 8.5.11 取得 6 字段。不是仅模拟 payload。

[输入哈希与全部运行时结果](phpstorm-stubs-getrusage-runtime-contract-2026-10-02.json)。日志 `/tmp/sophp-stubs-getrusage-helper-semantic.log`、`/tmp/sophp-stubs-getrusage-probe-tests.log`、`/tmp/sophp-stubs-getrusage-real-probe.json`。

## 下一步与边界

当前生成器尚未替换 `builtinPhpStub` 的原声明，也尚未接入服务器运行时验证、内置文档 URI 和缓存身份；因此不能声称产品键补全已经修好。下一步完成这些连接，再验证运行时切换、内置声明导航、真实 LSP 和隔离编辑器宿主。

正在运行的 443 项协议回归仍使用原 Core；本轮终态观察前检查，80 项冻结输入全部未变。只构建了独立 runtime-probe 包，未重建根 Core、打包或更新 Profile。

## 当前主工作区集成验收

原来的 443 项完整协议回归已经终态通过，退出码 0、零跳过、1,394.88 秒，启动前与终态 80 项输入一致；先归档该证据，随后将隔离验证的两个文件变更接入主工作区。该全量属于 getrusage 集成之前，不能当作当前构建的全量结果。

产品已接入：runtime-probe 实测字段 → 客户端通用运行时 payload → 服务器字段校验 → 内置 URI 的规范化快照 → `builtinPhpStub` 条件返回形状 → 补全与内置声明导航。没有运行时字段时保持原有宽类型；字段变化会更新 URI 身份并撤回旧候选。

当前构建验证：

- language-spec 全量 135/135、零跳过，13.49 秒。
- semantic 全量 45 文件、1,128/1,128、零跳过，47.49 秒。
- PHP 7.2／8.5 定向真实 LSP 2/2、零跳过，5.73 秒；Linux → Windows → 无字段 → Linux，候选及内置 URI 身份均刷新，磁盘未变化。
- 当前根 Core 的 Linux／原生 Windows 隔离 VS Code 宿主均退出 0，分别使用实际 PHP 8.5.9／8.5.11。各走 9 步默认／子进程／未知 mode 与失败保护切换，分别核对 17／6 字段及撤回；内置虚拟文档显示当前运行时字段，磁盘保持原样。
- 100 次小样例预热语义查询 P95 2.70 ms；这不是大项目或可见弹窗等待。
- language-spec／runtime-probe／language-server 构建、根 Core 构建、根 TypeScript noEmit、定向 ESLint 通过。

当前完整 stdio 尚未重跑，真实 WSL 可见弹窗人工使用未验收；不能用定向宿主替代。未打包、提交、推送、发布或更新 Profile。证据与当前哈希见同名 JSON。
