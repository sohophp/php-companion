# References 输入核对：复用 Composer 读取证据

日期：2026-09-21。上一基线：`a168076`。

## 改动

Composer 加载器在第一次读取时保留实际元数据路径与原始字节 SHA-256，覆盖根 composer.json、composer.lock、自定义 vendor-dir 下的 installed.json 及实际安装目录中的依赖 composer.json。不存在的文件记录为缺失；非 ENOENT 读取错误或超过 4,096 条记录，标记证据不完整。原有 Composer 解析和降级行为保持不变，证据不包含文件原文。

测试专用 References 输入审计直接核对这些读取证据，删除重复的 `loadComposerProject()` 和额外 vendor-dir 配置解析。磁盘配置即使只增加一个换行、解析语义未变，也会使旧证据失效。Composer 由磁盘加载，不能拿编辑器未保存的 JSON 内容替代其实际读取证据。

该路径仍为输入审计，不缓存或直接返回历史 References 结果。正常查询只增加首次元数据读取时的摘要计算。

## 验证及短循环

- Project 构建与 11 项测试通过；新增自定义安装路径、同语义不同字节、缺失/畸形 JSON 和读取失败测试。
- Language Server 构建、4 个改动文件 ESLint 通过。
- 首次 References stdio 两项通过（8.25 秒），覆盖属性链、返回链、冷启动和 Reload，并增加 Composer 文件变化/恢复审计。
- 阶段扩展回归 128 项通过、89 项跳过，用时 87.49 秒。
- 包级编译输出的 `pnpm check:references:winstar` 通过：冷 References 9,938 ms、112 处；Definition 9 ms、1 处，完整位置摘要均符合基线。入口说明由后续[引擎身份审计](reference-engine-identity-2026-09-22.md)更正；下方显式 bundle 的成对测量不受影响。

日常修改先按改动包构建，再执行直接相关文件/用例，例如：

```bash
pnpm --filter @php-companion/project test
pnpm --filter @php-companion/language-server exec vitest run test/stdio.test.ts -t 'resolves first cold and reloaded references'
```

影响输入快照、依赖读取或语义解析时，追加对应单元测试；较宽 LSP 回归在阶段收口执行。本轮宽名称匹配选中了 128 项，不能继续作为每次修改的默认循环。完整打包、tarball 与 VSIX 验证留到候选冻结；性能测试串行运行，避免与回归争用资源。

## Winstar 串行测量

旧、新正式 bundle 使用同一已建立的缓存，分别启动独立 LSP 进程，先 References，再 Definition，最后输入审计：

| 项目 | 旧版 | 当前 |
| --- | ---: | ---: |
| 项目扫描文件 | 2,287 | 2,288 |
| Reload 首次 References | 7,358 ms | 7,063 ms |
| References 精确位置 | 112 | 112 |
| 输入审计文件 | 2,537 | 2,538 |
| 输入审计耗时 | 3,798 ms | 3,424 ms |

两次间 Winstar 正在变化，文件集合与缓存命中数不同，不能把这组时间差认定为改动带来的性能收益。两次引用完整位置摘要一致：`bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`。

## 后续关键路径

首次耗时目标仍未达到。若要安全复用持久化结果，下一步必须记录候选扫描所有读入文件（包括判定跳过的文件）的摘要及完整文件集合，防止“原来不匹配的文件后来新增调用”被配对到旧结果；之后补齐引擎构建身份及框架 Provider 输入。当前 `semanticCoverageVerified` 仍为 false。

本轮未冻结或安装新 VSIX。基准没有注册 Provider，不能替代完整 Symfony WSL Profile 的实际编码验收。
