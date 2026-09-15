# 私有 Alpha 候选验收

日期：2026-09-15。范围：可核验的本地候选组装，以及最新 PHP Companion 对 Winstar PHP 8.5 与 CoreRepo PHP 7.2 的只读真实项目门禁。

## 候选产物

`pnpm candidate:alpha` 最新在干净提交 `03461a7c6135134b446188eab2f1d0ace90ad97f` 上重新构建并验证三个 VSIX，生成本地目录 `artifacts/php-companion-alpha-0.4.5-03461a7c/`。目录没有加入 Git，公开 npm、Marketplace、Git tag 与对外发布均未执行。

| 角色 | 文件 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| PHP 核心 | `php-companion-0.4.5.vsix` | 881,823 | `7e5b6b10dc4d746b0296d1b8918fef34342fbab16cae699aa0be23608c709df7` |
| Open Source Pack | `php-companion-open-source-pack-0.4.5.vsix` | 67,469 | `e01a19102d590d652dccc4861ee5b18b2d931694fc1c59a7eeab6183cc247ee6` |
| Recommended Pack | `php-companion-recommended-pack-0.4.5.vsix` | 76,496 | `b01960ecb48957511b21f5776af24016171264102fbc083e89cca75f50147efb` |

候选目录的 `sha256sum -c SHA256SUMS` 三项均返回 `OK`。`candidate.json` 同时记录 Node v22.14.0、Linux x64、完整源码提交、三个产物元数据、七个受支持扩展，以及被拒绝的 Symfony Language Tools 0.20.1 和 DotJoshJohnson XML Tools 2.5.1。

提交 `03461a7` 的 [CI 34984747546](https://github.com/sohophp/php-companion/actions/runs/34984747546) 18/18 成功，覆盖 Linux、Windows、macOS Quality、真实打包 Extension Host、冻结七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。该提交增加实例/静态 callable 数组的精准变量调用契约；Alpha 环境预检与可移植候选说明继续保留。

## 最新真实项目门禁

使用候选对应源码构建的 `@php-companion/semantic` 执行：

```bash
node scripts/audit-real-workspace.mjs /var/www/php/8.5/winstar2024 100 10000 docs/php-language-toolchain/oracles/winstar.json \
  > docs/php-language-toolchain/reports/real-workspace-winstar-alpha-2026-09-15.json
node scripts/audit-real-workspace.mjs /var/www/php/7.2/CoreRepo 100 10000 docs/php-language-toolchain/oracles/corerepo.json \
  > docs/php-language-toolchain/reports/real-workspace-corerepo-alpha-2026-09-15.json
```

| 指标 | Winstar | CoreRepo |
| --- | ---: | ---: |
| 项目 PHP 文件 | 2,256，完整 | 1,137，完整 |
| 总索引文件 | 9,999 | 10,000 |
| 索引耗时 | 97,094.08 ms | 67,261.54 ms |
| 峰值 RSS | 713.9 MiB | 713.7 MiB |
| 类型目录 / 项目类型 | 10,036 / 2,270 | 10,011 / 1,128 |
| 抽样声明解析 | 100/100 | 100/100 |
| References P95 / 最大值 | 22.26 / 45.39 ms | 18.05 / 57.51 ms |
| 冻结成员 Oracle | 补全、Definition 通过 | 补全、Definition 通过 |

Winstar Oracle 从 `BlogDatasetEntity::getLatestArticles()` 的已证明 repository 类型补全 `createQueryBuilder`，Definition 落到 Doctrine `EntityRepository.php`。CoreRepo Oracle 从 `CanonicalUrl::generate()` 的 `Language` 参数补全 `getUrlCode`，Definition 落到项目 `Language.php`。两边 `projectComplete=true`；vendor 依赖受 10,000 文件预算截断，因此整体 `complete=false`，需要封闭世界的负向结论继续抑制。Winstar 的 Google API Client `Aiplatform.php` 还超过 512 KiB 单文件预算，新完整性逻辑把它明确报告为依赖缺口，没有误伤项目完整性。

Winstar 审计读取提交 `7c25439a8bdbc25055b14d3226e59a43f256bb4d` 上当前含 87 条未提交状态的工作树；命令没有修改它。CoreRepo 为干净提交 `99c2bd00f3e250a9b70739b5e7862282e0858024`。本报告不把 Winstar 当前业务工作树外推为可复现的纯提交快照；机器可读结果分别保存在 [Winstar JSON](real-workspace-winstar-alpha-2026-09-15.json) 与 [CoreRepo JSON](real-workspace-corerepo-alpha-2026-09-15.json)。

## 尚需人工关闭的门槛

自动证据已覆盖 Linux、Windows、macOS 原生 CI 宿主、真实打包 VSIX、冻结七扩展组合和 PHP 7.2–8.5。新增预检已确认 Winstar `bin/php-runtime` 为 8.5、CoreRepo `phpbin` 为 7.2，并且最终候选三项摘要有效；证据见 [Alpha 环境预检](alpha-preflight-2026-09-15.md)。Windows 客户端连接 WSL Remote 的扩展归属、路径解析与项目包装器仍需在实际 Remote 窗口验收；依赖完整的大型项目连续两小时交互也需要人工操作记录。执行步骤与阻断缺陷定义见 [Alpha 候选试用](../alpha-candidate.md)。
