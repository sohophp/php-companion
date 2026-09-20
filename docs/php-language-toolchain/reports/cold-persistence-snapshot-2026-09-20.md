# 冷索引持久快照去重

日期：2026-09-20

功能提交：`11bd4582002f7d4f9b1a12a8d3c054ff8da31fe1`

## 问题

冷索引解析每个 PHP 文件后，需要生成语义快照并写入持久缓存。原路径先把声明和实现事实转换为快照，再通过 `JSON.stringify`/`JSON.parse` 把整份快照深拷贝；索引结束时，缓存写入器又把完整索引序列化一次。第一次深拷贝只用于保护通用调用者免受共享对象修改，对生命周期完全由 Language Server 控制的缓存写入路径属于重复工作。

## 实现

- 普通 `SemanticWorkspace.snapshot()` 继续返回完全脱离工作区对象的快照，公共调用契约不变。
- 新增 `snapshotForPersistence()`，返回缓存写入器专用的不可变生命周期快照，跳过重复 JSON 序列化与解析。
- Language Server 冷索引缓存只使用该专用入口；快照随后仍经过分层 SHA-256 校验并由索引缓存统一序列化。
- 持久索引基准同步移除已经迁出核心的 Controller context 字段，并修正 `analyzeProjectPhpFileFacts()`、`restoreCachedProjectPhpFile()` 的现行参数契约，使该门禁重新验证当前 Doctrine 事实缓存。

单元回归证明两种快照内容完全相同；同 URI 后续更新为另一类型后，已取得的持久快照仍保留原类型和源码，普通脱离快照语义保持不变。

## 真实 Winstar A/B

两种模式均只读扫描 Winstar 自身 2,275 个 PHP 文件、9,528,897 字节，执行相同的 Doctrine 提取、缓存校验和构造、类型目录及 20 个类型 References 抽样。每种模式以相反执行顺序各运行一次：

| 轮次 | 脱离快照 | 持久共享快照 | 降幅 |
| --- | ---: | ---: | ---: |
| 脱离先运行 | 48.349 秒 | 46.791 秒 | 3.22% |
| 共享先运行 | 49.936 秒 | 48.741 秒 | 2.39% |
| 平均 | 49.143 秒 | 47.766 秒 | 2.80% |

四次结果都得到 2,289 个项目类型和 117 个抽样引用位置。峰值 RSS 在 426.6–474.7 MiB 间波动，样本不足以证明稳定内存下降，因此本增量只声明冷索引序列化耗时减少，不声明内存优化。

曾验证“冷解析后立即转为热缓存的 deferred implementation”方案；它保持相同的 2,289 个类型、117 个引用位置和 36/62 个 Doctrine 方法/属性事实，但真实 9,999 文件探针的峰值/保留 RSS 从 eager 的 892.7/880.3 MiB 增至 931.7/914.6 MiB。该方案已撤回，没有进入功能提交。

## 回归与候选

- Semantic 1 个测试文件、271 项全部通过。
- Language Server 5 个测试文件、196 项全部通过。
- 10,000 文件持久索引基准通过：冷索引 19.188 秒，热恢复 6.762 秒，恢复 10,000/10,000 个文件；19,999 个 callable 记录均可延迟加载，聚焦查询只水合 3 个相关文件；损坏派生层或 callable 记录均只重建 1 个文件。
- 相关 TypeScript/ESLint、24 个隔离 tarball 和四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 同时加载核心与独立 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过；机器结果见 [Winstar JSON](alpha-preflight-winstar-cold-snapshot.json) 与 [CoreRepo JSON](alpha-preflight-corerepo-cold-snapshot.json)。

候选目录：`artifacts/php-companion-alpha-0.4.5-11bd4582/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `5dde52d4ee7c66a9f6d5b6d5e39737f9e3d3301f478fb051722a8ebb940eb7bf` |
| `php-companion-symfony-0.4.5.vsix` | `072c9d67c36a48424cd2bc61b4746d89931a1487f2a79ba51fd616015bae0383` |
| `php-companion-open-source-pack-0.4.5.vsix` | `97eb553fadde4e5b8472fcec9e8bad3c304694b33d48d1528a079f0862d6ea78` |
| `php-companion-recommended-pack-0.4.5.vsix` | `2ebf0407c576ce329f6897c1c48d7715513403eaba72090bb4a99405ec7f341d` |

核心与独立 Symfony 候选已覆盖安装到 WSL RockyLinux8。候选包与安装目录中的 `dist/language-server.js` SHA-256 均为 `c8bba28c5a24268af0f807b4ba8134e4e727d13faabf5d34df7d451f1f98f7c2`；旧进程终止后，VS Code Extension Host 已自动启动新语言服务器进程。
