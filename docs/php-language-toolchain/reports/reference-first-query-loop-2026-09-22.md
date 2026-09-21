# 首次 References：缩短验证循环与瓶颈复核

本轮以 Winstar 源码为只读样本，查询 `AdminPasswordChangeGuard.php` 最后一个 `get`，启用 Symfony Provider。每次使用正式 bundle、独立空缓存，先发 References，再核对结果数量和排序后的位置 SHA-256。目标是定位首次查询的实际关键路径；此报告不代表 WSL 编辑器交互验收。

新增 `scripts/benchmark-first-references.mjs`，把单次冷查询、阶段日志提取、结果哈希及可选基线对比合成一个命令。候选和基线各使用独立临时缓存；结果数量或位置哈希不同则直接失败。快速迭代先跑单次候选，只有观察到稳定收益时再交叉复测，避免每个猜想都等待四次完整冷启动。

```bash
PHP_COMPANION_BENCHMARK_SYMFONY=1 \
PHP_COMPANION_EXPECTED_REFERENCES_SHA256=bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2 \
node scripts/benchmark-first-references.mjs \
  /var/www/php/8.5/winstar2024 \
  /var/www/php/8.5/winstar2024/src/Security/AdminPasswordChangeGuard.php \
  get last dist/language-server.js
```

同一工具末尾可加基线 bundle 路径，自动对比引用集合。`PHP_COMPANION_BENCHMARK_RSS=1` 可输出进程峰值内存。此命令复用已有 `benchmark-language-queries.mjs` 的 LSP 流程，不绕过真实语言服务器。

当前正式 bundle 的单次测量：首次 References 9,043 ms、112 处，位置哈希 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`；候选扫描 4,593 ms，容器事实 791 ms，路由 810 ms，事件 37 ms，语义引用 2,085 ms。容器和路由任务有重叠，阶段数值不可直接相加。候选扫描完成后的缓存等待 27 ms，连同写盘约 263 ms，不能解释主要耗时。

本轮对三个低风险假设做了冷查询验证，结果均保持 112 处及相同位置哈希，但没有稳定速度收益，因此未保留产品实现变更：跳过新文件的语义表面比较（旧版 9,016/9,578 ms；试验版 9,040/9,120 ms）；直接使用已解析成员访问事实筛选候选（单轮 9,103 ms，语义阶段 2,344 ms）；候选解析 worker 从 4 增至 6（对比 8,992 → 9,293 ms，候选阶段 4,482 → 4,679 ms）。这些数据表明当前机器上的瓶颈不是单一序列化、文本匹配或 worker 数量。

后续应针对候选准备和语义解析做更细的 CPU/等待分解，再修改算法；保持完整位置哈希、首次冷查询和取消/编辑失效行为作为接受条件。当前首次立即查询仍约 9 秒，未达到满意水平，Goal 继续。
