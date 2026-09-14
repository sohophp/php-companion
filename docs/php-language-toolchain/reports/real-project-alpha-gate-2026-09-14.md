# 真实项目 Alpha 门禁

日期：2026-09-14

## 验收范围

本轮把合成 fixture 之外的 Winstar PHP 8.5 与 CoreRepo PHP 7.2 纳入可重复的只读门禁。`scripts/audit-real-workspace.mjs` 从 Composer autoload 边界加载项目与依赖，不启动项目 Kernel、不修改业务文件，也不读取项目密钥。门禁检查：

- 项目源码必须完整进入索引；依赖可按已记录预算截断。
- 从项目类型目录确定性抽样，至少 90% 的声明必须通过 References 回到自身精确范围。
- 抽样 References P95 必须不超过冻结的 150 ms 热查询预算。
- 可选 JSON Oracle 必须同时命中指定成员补全与 Definition 文件。

Oracle 保存在 `docs/php-language-toolchain/oracles/`，不包含机器绝对路径。执行时显式传入实际 Composer 根：

```bash
pnpm audit:workspace -- /var/www/php/8.5/winstar2024 100 10000 docs/php-language-toolchain/oracles/winstar.json
pnpm audit:workspace -- /var/www/php/7.2/CoreRepo 100 10000 docs/php-language-toolchain/oracles/corerepo.json
```

## 运行时与结果

项目规定的启动器实际返回：

- Winstar：`bin/php-runtime` → PHP 8.5.9 CLI。
- CoreRepo：`./phpbin` → PHP 7.2.34 CLI。

| 指标 | Winstar | CoreRepo |
| --- | ---: | ---: |
| 完整项目 PHP 文件 | 2,218 | 1,137 |
| 总索引文件 | 9,999 | 10,000 |
| 总索引字节 | 38,866,358 | 29,871,175 |
| 冷索引时间 | 98.41 s | 68.31 s |
| 峰值 RSS | 754.5 MiB | 726.9 MiB |
| 抽样声明成功 | 100/100 | 100/100 |
| 跨文件引用样本 | 60/100 | 70/100 |
| References P50 / P95 / max | 0.51 / 12.17 / 71.24 ms | 0.70 / 21.17 / 59.73 ms |

Winstar Oracle 从 `BlogDatasetEntity::getLatestArticles()` 中 `$repo` 的原生 `assert($repo instanceof BlogPostsEntityRepository)` 事实出发，补全 `createQueryBuilder` 并把 Definition 精确落到 `vendor/doctrine/orm/src/EntityRepository.php`。CoreRepo Oracle 从 `CanonicalUrl::generate(..., Language $language, ...)` 出发，补全 `getUrlCode` 并落到 `App/Components/Language/Language.php`。

机器可读结果：

- [Winstar JSON](real-workspace-winstar-2026-09-14.json)
- [CoreRepo JSON](real-workspace-corerepo-2026-09-14.json)

## 免费插件组合

当前 `php-companion-0.4.5.vsix` 在 VS Code 1.137.0 的独立用户目录和扩展目录中完成 Open Source Profile 测试。目录包含 Symfony Language Tools 0.20.2、twig-plus 1.3.7、Red Hat YAML 1.24.0、Red Hat XML 0.29.3、PHP CS Fixer 0.3.21、PHP Debug 1.40.1、PHPUnit 3.9.40 与 EditorConfig 0.18.2；没有 Intelephense。格式化、调试与测试入口使用 Winstar 的 PHP 8.5 wrapper、项目 PHP CS Fixer 3.95.22 和项目 PHPUnit 9.6.36。完整组合宿主退出码为 0。

本轮主 VSIX SHA-256 为 `a4431eaabf7684b7e187a4863bd2432a37ba685ef47ebc75aacc0adfc890cdb9`。

## 结论边界

这组证据证明当前 Linux/WSL 构建能在两个真实代码库上完整保留项目源码、执行低延迟精确类型引用，并完成两个已冻结的真实成员查询；也证明当前免费插件组合在隔离 Profile 内可以共同运行。依赖索引均因 10,000 文件预算而不完整，因此需要全依赖封闭世界的负向诊断继续保持静默。Windows + WSL Remote、Windows/macOS 完整第三方组合及多小时真实项目会话仍属于后续系统矩阵。
