# 普通导航不再加载无关容器类型并失效引用缓存

日期：2026-09-21。修复前提交：`12d7967`。

## 原因和修复

真正 References-first 查询后，直接重复查询可命中缓存，但在中间执行一次 Definition 后会重新计算。`provenSymfonyContainerServiceReference()` 原先在无法证明服务引用时，一律加载 PSR/Symfony 容器接口。普通方法名、类型名和变量上的导航也进入该路径，新增无关声明使语义引用缓存失效。

semantic 现在提供仅依赖语法的 `literalMethodArgumentCandidateAt()`，复用原有单个位置参数、简单字面量和光标范围判定。Language Server 只有在存在这样的候选时才进行容器方法证明和依赖加载；不把语法候选当作服务身份，业务同名方法仍须被原有精确方法族检查排除。空字符串补全位置继续支持；具名、多个参数、展开、转义及普通函数调用仍保持原有排除行为。

该公共 helper 适用于未加载接收者声明和声明快照恢复后的文件。此次没有扩大服务语法支持范围，也没有放宽真正新增声明时的引用缓存失效规则。

## 正式 bundle 查询序列

Winstar `src/Security/AdminPasswordChangeGuard.php` 最后一个 `get`，同一持久缓存、独立新进程；所有 References 都保持 112 处完整位置摘要 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`，Definition 保持 1 处及原位置摘要。

| 请求顺序 | 修复前 | 修复后 |
| --- | ---: | ---: |
| Reload 后首次 References | 7.483 秒 | 6.817 秒 |
| 直接重复 References | 16 ms | 15 ms |
| Definition | 16 ms | 7 ms |
| Definition 后重复 References | 2.679 秒 | 13 ms |

前后为单次顺序测量，不能把首次耗时波动归因于本修复。有效证据是最后一次 References 的语义阶段从 2.666 秒变为日志 0 ms，同时完整结果一致。该修复保留了已建立的缓存，首次候选扫描和精确匹配仍待优化。

## 验证

语义包 289 项全部通过（15.82 秒）；LSP 定向 54 项通过、152 项跳过（57.22 秒），覆盖 References、Rename、容器服务及导航相关路径。相关 TypeScript、ESLint、正式 esbuild 构建通过。`pnpm check:references:winstar` 通过：空缓存、References-first 9.340 秒，112 处完整位置摘要一致；随后 Definition 13 ms、1 处声明一致。尚未冻结 VSIX，也未更新用户 WSL Profile。

## 下一轮的首次路径证据

本次源码在空缓存、References-first 下另采集 Node CPU profile（临时目录 `/tmp/php-companion-first-profile-P2v1n8`）。主线程共有 8,764 个采样；其中 References 调用树包含 2,224 个、候选 `onSource` 包含 1,411 个、首次 `updateBuiltinForRoot` 包含 879 个。References 内 `memberTarget` 包含 1,107 个采样。四个候选 worker 均有较多 idle 采样。

这些是包含子调用的采样数，不能相加为阶段耗时，也不能把带 profiler 的时间当正式延迟。下一轮优先检查首次内建声明准备与成员接收者推断中的重复工作；没有证据支持继续增加 worker 数量。
