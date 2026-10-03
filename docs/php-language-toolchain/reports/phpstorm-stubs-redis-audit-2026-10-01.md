# phpstorm-stubs Redis 审计（2026-10-01）

固定 `JetBrains/phpstorm-stubs` 修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 中的四个 Redis 类已由 `scripts/audit-phpstorm-redis.mjs` 与本机 PHP 扩展反射对照。Winstar 的 Composer 依赖明确要求 `ext-redis`，因此这组声明与实际项目有关。

| 本机 PHP | Redis 扩展 | `Redis` 方法／常量 | `RedisCluster` 方法／常量 | `RedisSentinel` |
| --- | --- | ---: | ---: | --- |
| 7.2 | 4.3.0 | 234／24 | 185／28 | 不存在 |
| 7.4 | 6.3.0 | 287／52 | 255／5 | 12 个方法 |
| 8.1 | 5.3.7 | 240／48 | 190／52 | 11 个方法 |
| 8.5 | 6.3.0 | 287／52 | 255／5 | 12 个方法 |

当前固定上游的 `Redis` 类含 297 个方法和 53 个常量；即使 6.3.0 也少 10 个上游方法和一个常量。4.3／5.3 另导出 24 个上游未列出的旧方法别名。`RedisArray` 上游显式列出 283 个方法，但本机仅反射到 29–33 个直接方法，四版均有 `__call` 代理；把其它名称当成“缺失”会误删可调用入口。`RedisCluster` 常量集合还随扩展版本大幅变化。

因此 Redis 接入需要按**项目实际扩展版本**选择方法和常量，并单独处理 `RedisArray` 的动态代理。不能仅按 PHP 语言版本或当前上游文件生成通用候选。此轮只建立可重复审计，没有把不可靠的 Redis 候选加入 SoPHP。`igbinary` 两个稳定函数已单独接入，见同日记录。
