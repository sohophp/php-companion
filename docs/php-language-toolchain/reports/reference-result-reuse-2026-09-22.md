# References 持久化结果复用与短验证循环

日期：2026-09-22。开发基线：`0b913c8`。本轮只修改 php-companion；Winstar 为只读测量目标。

## 实现及边界

正式 bundle 的 on-demand 核心 PHP 查询可以在重启后复用同一查询的完整位置结果。普通查询完成后，在后台验证其输入并写入独立 `reference-results-v1` 缓存目录；最多保留 32 个查询，每个文件上限 8 MiB、最多 2,048 个位置。写入使用临时文件和原子替换；取消、损坏、缺失、读取失败或无法证明输入完整时回到原查询流程。后台写入未完成就退出或发起更新查询时，可能没有可复用结果。

查询键绑定 URI、偏移和是否包含声明。输入绑定完整候选文件集合及内容、实际读取的依赖和缺失查找、Composer 元数据、未保存文档、工作区 URI 映射、PHP 版本与限制、外部语义事实以及服务器/worker/WASM/运行时身份。声明和查询计算前捕获的语义状态在异步验证后再次核对。来源集合改变、文件移动、删除或之前跳过的源码新增调用均不能沿用旧结果。

源码根递归快照已覆盖的候选文件不再重复作为显式文件核对路径身份，仍逐文件计算内容摘要并验证读取期间及结束时的文件状态。额外依赖、元数据和缺失路径继续显式核对。首次验证成功后的同进程重复查询遵循现有文件通知、文档版本及项目代际失效，并检查当前已加载语义来源未超出已验证范围；不在每次重复点击时重新扫描磁盘。

以下情况保留正常语义查询：未打包入口或解析器身份无法证明、已建立项目索引、已经扫描候选、注册了 Semantic/Route/Symfony Route Provider、有框架文档快照、证据不完整。**完整 Symfony Profile 尚未接入这条复用路径，也未完成其首次耗时验收。**

## Winstar 结果

最终正式 bundle，2,289 个项目候选文件；References 必须先于 Definition 执行，无导航预热。用新临时缓存执行一轮查询、等后台写入结束，再退出并启动新服务器查询相同位置。

| 场景 | References | 引用数 | Definition |
| --- | ---: | ---: | ---: |
| 空缓存首次 | 9,275 ms | 112 | 5 ms |
| 新进程首次，验证后复用 | 3,053 ms | 112 | 141 ms |

两轮 References 全部位置摘要为 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`；Definition 摘要为 `62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1`。Reload 必须出现恢复日志且不能出现候选重扫日志，否则基准命令失败。

此前同轮实现的 Reload 测量分别为 3,352 ms（重复路径核对优化前）和 2,923 ms（优化后）；后者连续查询及 Definition 后再查询均为 5 ms，112 处完整位置一致。补充最终依赖证据失效检查前的另一轮对照为 9,394/2,858 ms；多次 Reload 约 2.9–3.1 秒，尚不能承诺稳定低于 3 秒。这些是本机样本，不承诺所有项目或机器固定达到该延迟。冷启动建缓存的后台验证耗时不计入首次响应，需要等待完成后才能测跨进程复用。

本轮改善的是已有查询证据时的 Reload 首次体验。**完全空缓存首次仍约 9 秒，Goal 继续；未冻结或安装新 VSIX，也未声称实际 WSL 编辑验收完成。**

## 精简验证方式

依赖包已构建时，只构建改动包并生成正式 bundle，避免每轮调用全仓 `pnpm check`、所有 VSIX 或 tarball 门禁：

```bash
pnpm --filter @php-companion/semantic build
pnpm --filter @php-companion/language-server build
node esbuild.mjs --production
```

持久化相关改动直接运行：

```bash
pnpm --filter @php-companion/language-server exec vitest run test/reference-result-store.test.ts test/reference-input-snapshot.test.ts test/reference-dependency-evidence.test.ts test/reference-engine-identity.test.ts
PHP_COMPANION_TEST_REFERENCE_BUNDLE=../../dist/language-server.js pnpm --filter @php-companion/language-server exec vitest run test/stdio.test.ts -t 'restores proven references across processes'
PHP_COMPANION_CHECK_REFERENCE_RELOAD=1 pnpm check:references:winstar
```

- 四个底层文件 19 项测试通过，约 1.04 秒；收紧文件校验后，两个存储用例再次通过。
- 最终正式 bundle 的跨进程用例通过，24.82 秒：包含 vendor 方法的首次/Reload、重复查询、声明选项、源码新增/移动/删除/修改、未保存内容、依赖文件变更、Composer 元数据变化、损坏文件及注册 Provider 后回退。
- 既有属性链、方法返回链首次/Reload 两项与早期持久化用例合跑通过，27.85 秒；它们显式关闭新复用路径，继续覆盖实际候选扫描与审计。
- 外部语义事实替换定向回归通过，含 generation-only 更新、输入对象后续修改、实际语义事实变更和移除的身份检查。
- 相关 TypeScript 构建、改动文件 ESLint 和完整位置基线通过。性能测量与自动化测试分开运行；第一轮缓存填充曾与测试并行，其耗时不作为最终基线。

日常修改只跑受影响用例；引擎或扫描算法改变时增加既有首次链式 References 用例。全仓和打包宿主验证留在阶段收口及候选发布时运行。下一步仍是空缓存扫描/语义计算成本，以及完整 Symfony Profile 的 Provider 输入证明和真实编辑验收。
