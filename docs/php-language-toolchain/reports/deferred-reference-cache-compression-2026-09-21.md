# 首次 References：缓存压缩与语义提交重叠

日期：2026-09-21。源码基线：`3bee01a`。

## 原因与实现

冷查询 CPU 采样显示 8 个语法准备 worker 大部分时间空闲，主线程在按文件顺序提交语义事实后同步生成压缩缓存。此前分段计时中，快照压缩约占候选阶段 1.8 秒。单纯把压缩改成异步 zlib 但逐文件等待曾使冷查询变慢。

`@php-companion/index` 增加可选 `cache.finalizePayload`：语义 `onSource` 按原顺序完成，缓存负载可稍后完成；所有负载写入磁盘前必须完成，失败的单个条目从缓存中移除，下次再重建。Language Server 将完整语义快照或仅声明快照交给现有最多 8 个 worker 校验和压缩，同时主线程继续提交后续文件。worker 失败时仍用原同步压缩回退。文件扫描顺序、语义更新顺序、引用验证、缓存格式及版本未改变。

## 同机串行对照

Winstar `src/Security/AdminPasswordChangeGuard.php` 最后一个 `get`，独立 LSP 进程、独立空持久缓存；先查询 Definition，再查首次 References。两轮交换先后顺序，均扫描 2,280 个 PHP 文件、解析 1,649 个候选，其中 1,648 个通过 worker 准备。下列是单轮观测，不是 P95。

| 测量 | 旧版 | 新版 |
| --- | ---: | ---: |
| 第一轮候选阶段 | 9.725 秒 | 8.157 秒 |
| 第一轮 References 响应 | 13.241 秒 | 11.451 秒 |
| 反序轮候选阶段 | 9.540 秒 | 8.217 秒 |
| 反序轮 References 响应 | 13.078 秒 | 11.615 秒 |

四次均返回完全相同的 112 处完整引用，位置 SHA-256 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`；Definition 的 1 处位置也一致。新版冷查询写入的缓存随后在独立进程中恢复 1,648 个候选、其中 1,648 个由 worker 预恢复，再次得到同一组 112 处引用；该次 Reload 首次 References 为 7.644 秒。

## 验证边界

Index 32 项、Language Server 全量 200 项、改动文件 ESLint 和正式扩展 esbuild 构建通过。正式 `dist/language-server.js` 配合 `dist/candidateWorker.js` 在独立冷缓存下首次 References 用时 11.621 秒，Reload 首次 6.875 秒；两次仍是完全相同的 112 处位置，Reload 恢复 1,648 个候选且均由 worker 预恢复。冷查询虽在同轮对照中减少约 1.5–1.8 秒，仍需约 11–12 秒；Reload 首次约 7 秒。尚未达到流畅交互，也未冻结新 Alpha 候选或完成用户 WSL Profile 持续编辑验收。
