# Node 20递归目录索引兼容性

2026-10-13。本批修复已声明Node >=20范围内的目录索引崩溃，不增加功能。当前正常Core为 `f60765a4`，Semantic保持 `761e112d`。

## 问题与产品修复

旧代码仅使用Dirent.parentPath，实际Node20.11.1持久缓存CLI在拼接undefined路径时失败。初步兼容Dirent.path后，真实Node20.0同一回归仍失败：该版本尚无递归readdir和两种路径字段。20.11通过不足以关闭声明最低版本的问题。

现优先使用原生递归读取及parentPath/path；条目无两种路径字段时，逐层读取目录并收集完整PHP路径，再保持原排序。目录符号链接不跟随，Composer排除、取消、项目预算、依赖确定性截断及缓存恢复保持；新路径不改变规则或支持域。读取失败沿用原发现策略。

已加入默认test:index-runtime，包构建后执行五项真实文件系统回归：嵌套及大写PHP、冷热缓存与排除；目录链接及循环；取消不发布部分结果；项目预算不静默截断；项目优先及依赖截断。Windows使用junction创建测试目录链接，不新增跳过。

## 已执行并通过

- 产品实现的五项回归在Node20.0.0、20.11.1和22.14.0分别通过，合计15项。旧实现真实回归失败证据保留。
- 索引包69项、定向Lint与类型检查通过，最终根23文件121项通过。
- Node20.0正常CLI原1千文件四阶段退出0：冷索引3.26秒/8秒，整进程RSS152.23/384 MiB，原缓存、三Callable事实、两类损坏恢复和精确性断言通过。
- Node20.0真实打包服务器原500编辑/50预热通过：诊断P95 33.06ms、取消1.26ms，所有原预算及缓存损坏/未保存内容恢复通过，陈旧0。正常构建八个运行资产与实测私有服务器逐字一致，资格依据实际字节身份复用，未冒充正常命令重新执行。
- 最终正常Core的Node22原500编辑/50预热退出0：诊断P95 31.68ms，原查询、取消、内存和恢复断言通过。
- 前一8165c809候选完整LSP142文件1652通过/1既有条件跳过、退出0，原进程已结束且7冻结输入保持。该整轮属于前一候选，不计作最终f607的完整整轮。

最终bundle的跨进程引用缓存条件用例独立补验已通过：原命令与结果核对脚本整步退出0，唯一目标1通过、其余567未选择；不改写前一整轮的1跳过统计。最终24包隔离消费者门禁在私有Git索引下通过，普通暂存区未变。14最终输入和68项原文件/归档校验通过。随后最终f607的[完整LSP](final-node20-lsp-2026-10-13.md)已独立通过1652项/1既有条件跳过；全部默认组合及编辑器矩阵仍按各自快照保留。

## 原始证据

[旧20.11错误](../../../.vscode-test/node20-runtime-2026-10-13/persistence-before.stderr)、[最低20.0失败](../../../.vscode-test/node20-runtime-2026-10-13/node20-minimum-current-failure.log)、[前一LSP终态](../../../.vscode-test/node20-runtime-2026-10-13/first-candidate-terminal.json)、[三运行时最终回归](../../../.vscode-test/node20-runtime-2026-10-13/final-minimum-regression.log)、[最终根](../../../.vscode-test/node20-runtime-2026-10-13/final-root-tests.json)、[正常最低版本缓存](../../../.vscode-test/node20-runtime-2026-10-13/final-minimum-persistence.json)、[最低版本服务器编辑](../../../.vscode-test/node20-runtime-2026-10-13/minimum-private-editing.json)、[八资产一致性](../../../.vscode-test/node20-runtime-2026-10-13/final-private-runtime-identity.json)、[最终Node22编辑](../../../.vscode-test/node20-runtime-2026-10-13/final-node22-editing.json)、[运行状态](../../../.vscode-test/node20-runtime-2026-10-13/state.json)、[最终引用缓存](../../../.vscode-test/node20-runtime-2026-10-13/final-reference-cache.json)、[最终消费者](../../../.vscode-test/node20-runtime-2026-10-13/final-package-consumer.log)、[终态审计](../../../.vscode-test/node20-runtime-2026-10-13/final-audit.json)。

[Node官方文档](https://nodejs.org/docs/latest-v20.x/api/fs.html#fspromisesreaddirpath-options)记录递归readdir从20.1加入；path从20.1、parentPath从20.12加入。20.0.0使用官方归档及校验清单，SHA256验证通过。私有原型的四边界、四阶段、静态检查和构建日志也保留，不删除失败记录。

本批资格限Linux、实际三运行时、PHP8.5/onDemand普通合成项目及文件系统边界。复杂Controller原500/150ms性能、其他平台/模式、真实编辑器/Remote、完整F13/P9/R4与26长期项继续开放。未提交、推送、发布或更新日常Profile，功能扩展暂缓。
