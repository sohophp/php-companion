# References Reload：并行准备持久缓存恢复

日期：2026-09-21。源码基线：`b5c12d1`。

## 实现

`@php-companion/index` 新增可选的 `cache.prepareRestore`。文件元数据与持久缓存一致时，每批最多 32 个条目可并行预处理；`cache.restore` 仍按原路径顺序提交，并收到可选预处理结果。预处理失败不丢弃缓存，继续使用原同步恢复路径。冷缓存、变更文件、取消与原有文件/字节预算仍走原决策。

Language Server 使用现有最多 8 个 candidate worker 解压和校验已缓存的声明或完整语义快照，再由主线程按顺序恢复到 SemanticWorkspace。worker 只在需要解析源码时初始化 PHP Tree-sitter parser，单纯恢复缓存无需加载 WASM。日志新增 `preparedRestores`，与原有 `restored` 计数区分。缓存格式、版本和校验规则保持不变，因此旧缓存可直接读取。

## 同机对照

Winstar `src/Security/AdminPasswordChangeGuard.php` 最后一个 `get`，各版本使用同一份缓存的独立复制和独立 LSP 进程；先查询 Definition，再查首次 References。两轮交换先后顺序。测试过程中 Winstar 项目有少量文件变化，因此只比较同轮成对测量，不将数值当作稳定延迟分位数。

| 测量 | 同步恢复 | worker 预恢复 |
| --- | ---: | ---: |
| 第一轮候选阶段 | 4.586 秒 | 3.985 秒 |
| 第一轮 References 响应 | 8.275 秒 | 7.420 秒 |
| 反序轮候选阶段 | 4.430 秒 | 4.111 秒 |
| 反序轮 References 响应 | 7.997 秒 | 7.717 秒 |

随后延迟初始化 parser 的一轮对照中，候选阶段 4.504→4.063 秒、References 7.838→7.488 秒；该轮有 12 个文件相对原缓存发生变化，不能与上表直接横比。新增日志在该轮确认 1,637 个候选由 worker 预恢复，其余变更文件正常重建。每轮仍返回完全相同的 112 处引用，位置 SHA-256 为 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`，Definition 的 1 处位置也一致。

独立冷缓存单轮旧/新为 14.234/13.291 秒，但新逻辑只作用于已有缓存，不能把这次差额归因于预恢复。冷查询约 13–14 秒、Reload 首次约 7–8 秒，仍不满足流畅交互目标。

## 验证边界

Index 31 项通过，覆盖并发预恢复、顺序提交、准备失败回退；Language Server 全量 200 项及改动文件 ESLint 通过。正式扩展构建生成 `dist/language-server.js` 和 `dist/candidateWorker.js`；该组合在独立 Winstar Reload 查询中由 worker 预恢复 1,637 个候选、返回相同 112 处引用，用时 7.555 秒。该轮项目有 12 个文件相对旧缓存变化，不能作为上表的严格同轮对照。未冻结新 Alpha 安装包，用户 WSL Profile 的持续编辑体验仍需实际验收。
