# References 候选按声明恢复，避免重复装载同一方法体

日期：2026-09-21。修复前产品基线：`8a82269`（随后 `061ae97` 仅补文档）。

## 修改

References 的 method candidate 磁盘缓存原先使用完整 `restore()`。现在在已有 `deferBodies` 路径使用 `restoreDeclaration()`，恢复所有声明与已验证的引用候选键，查询需要时再装载相关 callable 事实；未延迟的方法保持原恢复路径。缓存 schema、输入校验及候选文件覆盖范围未改变。

semantic 的 `loadCallableImplementations()` 原先每次都会合并已恢复事实并清空引用结果缓存，即使请求的 callable 全部已加载。现在显式记录文件级事实是否已装载，仅在首次文件级装载或新增 callable 时合并和失效；重复查询已加载 callable 直接复用。标志属于当前 deferred 实例，重新恢复/更新文件会重新建立状态。

新增回归先加载文件级函数调用和一个函数体，建立另一文件的 References 缓存，再验证查询同一函数体保留该缓存、加载第二函数体使其失效，最后验证完整快照往返一致。测试检查精确结果与实际是否重新解析引用文件，不依赖固定毫秒阈值。

## Reload 后首次查询

独立 LSP 进程、同一持久缓存、正式 bundle，均为 References-first；Winstar 同一 `AdminPasswordChangeGuard.php` 最后一个 `get`。2,285 文件，恢复 1,652 候选，打开文件重解析 1 个。

| 运行 | 候选阶段 | 语义阶段 | 首次 References |
| --- | ---: | ---: | ---: |
| 原版 | 3.518 秒 | 2.577 秒 | 7.567 秒 |
| 仅声明恢复 | 2.993 秒 | 2.779 秒 | 7.238 秒 |
| 声明恢复 + 同一 callable 复用 | 3.008 秒 | 2.611 秒 | 7.195 秒 |
| 随后再运行原版 | 3.410 秒 | 2.612 秒 | 7.470 秒 |

完整 112 处引用的位置 SHA-256 全部保持 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`；Definition 仍为正确的 1 处。最终实现直接重复查询 29 ms，Definition 7 ms，导航后重复 References 14 ms，后两次引用语义日志均为 0 ms。

这是小幅降低 Reload 恢复成本，单次测量不能推断 P95，也没有证明空缓存首次显著变快。首次耗时仍不满足交互目标。

## 验证与剩余问题

语义包 290 项通过（16.72 秒），相关 TypeScript/ESLint 和正式构建通过。LSP 定向 52 项通过、154 项跳过（54.84 秒），涵盖 References、Rename、签名/返回类型及缓存恢复；`pnpm check:references:winstar` 空缓存门禁通过：首次 References 9.431 秒、112 处完整位置一致；随后 Definition 14 ms、1 处声明一致。

尚未接入持久化查询结果直接返回：仅校验旧结果所指向文件不足以排除项目新增/删除、未保存编辑、依赖与 Provider 变化。该路径仍需完整输入与框架事实的复核设计，不能用 core-only 基准命中宣称 Symfony Profile 已获益。

未冻结 VSIX、未更新用户 WSL Profile，Goal 保持开放。
