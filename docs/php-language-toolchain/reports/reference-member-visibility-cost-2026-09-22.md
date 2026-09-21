# 方法 References CPU 采样与继承可见性成本

基线 `bab0f10`。Winstar 仅作只读测量；使用独立 Symfony 扩展的实际默认注册。

## 采样

在忽略目录独立构建未压缩、带匹配 source map 的核心与 worker，保留正式引擎身份生成流程及两份 WASM。通过既有 `PHP_COMPANION_CPU_PROF_DIR` 对真正 References-first 请求采样，没有使用旧 source map 或覆盖正式构建。

主要主线程样本（包含子调用，区间重叠，不能相加）：

| 调用 | 采样累计 |
| --- | ---: |
| references | 2,920 ms |
| memberAt | 1,671 ms |
| members | 875 ms |
| isSubclassOf | 246 ms |
| onSource | 1,637 ms |
| updateBuiltinForRoot | 952 ms |

此外 `postMessage` 自耗时约 359 ms，`structuredClone` 约 170 ms。诊断构建的采样用于定位，不能替代正式构建的墙钟比较。五份进程/线程样本位于本机 `node_modules/.cache/reference-cpu-bab0f10/profiles/`。

## 实验与保留修改

曾试验仅在一次 References 内缓存完整成员列表，结合原引用缓存失效点清理，限制 256 项并隔离访问上下文与泛型参数。结果仍正确，但正式查询 13,220 ms、语义阶段 2,918 ms，没有显示收益。该缓存、失效辅助方法等实验代码全部撤回。

保留的修改只有局部复用：一次 `members()` 调用内，对同一访问类和声明类只计算一次 protected 继承关系。public、private、同类访问的原有分支保持语义；正、负判断都只在当前调用中复用，不跨文件更新或查询保存。

## 正式构建对照

目标为 `AdminPasswordChangeGuard.php` 最后一个 `get`。新旧版本分别使用独立空缓存，均扫描 2,289 文件。

| 顺序 | 原版首次 / 语义阶段 | 修改版首次 / 语义阶段 |
| --- | ---: | ---: |
| 原版 → 修改版 | 12,347 / 2,274 ms | 11,810 / 2,171 ms |
| 修改版 → 原版 | 11,908 / 2,459 ms | 12,228 / 2,376 ms |

语义阶段两组分别减少 103 / 83 ms；总耗时没有稳定改善，不能把第一组全部差值归因于修改。所有 References 均为相同 112 处完整位置，摘要 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`。第一组修改版两次重复为 988 / 888 ms，语义日志为 0 / 1 ms。

原始证据：`/tmp/php-companion-protected-{compare,reverse}-{old,new}.{jsonl,log}`；另有 `/tmp/php-companion-members-query-cache-1.{jsonl,log}` 记录撤回的缓存实验。

## 验证与下一步

22 项定向语义测试在 2.64 秒内通过，包含继承成员、trait、非对称可见性、属性 hook、泛型、提升属性和引用失效。原有可见性测试增加多个 protected 方法、protected 属性与无继承关系的类内访问，验证正、负结果均准确。受影响语义包 TypeScript、正式核心 bundle、改动文件 ESLint 和 diff 空白检查通过。

没有重复全仓验证、打包或安装新版 VSIX。默认静态路由对 Winstar 的 incomplete 限制仍在，且没有完成真实 WSL 持续编辑验收。

首次查询仍约 12 秒，Goal 保持进行中。下一步检查候选事实提交与缓存快照传输，尤其主线程向 worker 复制深层对象的成本。既有线程数对照已表明增加 worker 没有明显收益且增加内存，因此不重复单纯增加线程数的实验。
