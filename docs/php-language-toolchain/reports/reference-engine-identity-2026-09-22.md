# References 引擎构建身份与实际 bundle 验证

日期：2026-09-22。上一基线：`f19e2b6`。

## 构建与运行时证据

以前审计上下文使用手动维护的 `semantic-v62-php-*`，不足以区分算法变化但版本未递增的两次构建。现在正式构建先取得服务器和 candidate worker 的实际输出，连同两份 WASM 的字节摘要生成确定性 SHA-256，再将等长构建标识写入服务器。64 字节占位替换保持 source map 的生成位置；生产构建和 watch 均使用同一输出处理。

运行时在启动阶段记录服务器、worker 和实际指定的两份 WASM，并包含 Node/V8/ICU 等运行时版本、平台、架构、排序规则及各文件角色。审计前后重新核对，资产变化或缺失时拒绝。将 core/php WASM 角色互换也不能得到同一身份。

未打包或解析器路径未得到证明的运行方式返回 `engineVerified: false`。正式 bundle 核对成功返回 `engineVerified: true`。`semanticCoverageVerified` 仍为 false：本轮只补齐引擎身份，尚未完成查询结果与扫描证据绑定、框架输入覆盖和持久化结果返回。

## 验证

- 引擎/输入/依赖 17 项单元测试通过，约 1.16 秒；增加文件角色后两项引擎用例再次通过。
- 构建身份单元测试通过：代码和两份解析器逐个变化都会改变 ID；输出顺序不影响 ID；缺少输出/资产/占位符拒绝；替换不改变 JS 字节长度及 source map。
- 包级 stdio 首次冷启动/Reload 两项通过（8.62 秒），确认未打包运行不会声称引擎已验证。
- 正式 bundle 的两项相同用例通过（最终 9.35 秒），确认 `engineVerified: true`；运行中修改 worker 或 PHP WASM 后，审计拒绝，恢复原字节后原指纹恢复。
- Language Server 构建、根 TypeScript、改动文件 ESLint 通过。
- watch 初次构建实际写出服务器与 source map，占位符已替换；已停止 watch 进程并恢复生产构建。没有声称完成持续 watch 编辑验收。
- 连续两次生产构建的服务器、worker、扩展和两份 WASM 字节摘要完全一致。

## 校正基准入口

检查发现 `check:references:winstar` 此前未传 bundle 参数，因此默认运行包级 `packages/language-server/dist/server.js`。本轮改为默认 `dist/language-server.js` 及同目录 WASM；可通过第三个 CLI 参数指定另一份 bundle。运行前须完成正式构建。

旧报告中将这个默认命令称为“正式 bundle”的两处记录已更正。显式传入 bundle 的成对测量不受影响，历史位置摘要仍然有效；运行目标的区分必须准确。

新的真实 bundle 基线通过：2,289 个项目文件，空缓存首次 References **8,945 ms / 112 处**，Definition **5 ms / 1 处**，完整位置摘要均匹配。当前文件数与旧样本不同，本轮也不是直接查询算法优化，不把耗时差当成提速收益。

另一个独立进程使用已有候选缓存执行审计：References 7,449 ms、112 处；输入核对 2,198 ms，返回 `captured: true`、`engineVerified: true`、`semanticCoverageVerified: false`。核对 2,539 文件，包含全部 2,289 个候选来源、1,659 个已加载来源、2 个规范依赖成功读取和 1 个缺失查找。

本轮未冻结或安装新 VSIX，首次交互耗时目标仍未完成；完整 Symfony Profile 和实际用户编辑仍需验收。
