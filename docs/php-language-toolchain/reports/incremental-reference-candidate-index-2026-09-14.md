# 增量引用候选索引验收

日期：2026-09-14

## 结果

本轮完成 P3 的首个引用倒排层。`@php-companion/index` 提供与 PHP 语义无关的 `DocumentKeyIndex`；`@php-companion/semantic` 按 PHP 身份规则写入类型、全局函数、全局常量、import、原始名称和静态成员候选。References 与 Rename 先读取候选 URI，再沿既有绑定、继承、可见性和歧义规则确认每个结果。

该结构不缓存“已经解析的引用”，因此声明变化不会留下错误绑定。文件更新先完整构造并验证新键集合，再原子替换旧 postings；删除和快照恢复使用同一生命周期。键数或键长超过预算的文档进入保守回退集合，查询会额外检查这些文件，不会返回不完整结果。

## 精准边界

- 类型和函数身份不区分大小写；全局常量、属性与类常量保持大小写敏感；方法候选不区分大小写。
- 同名但不同声明的文件可以进入候选集，最终结果仍由 semantic 精确解析，候选命中不等于引用命中。
- 动态成员继续沿现有保守路径处理；本轮没有把动态字符串猜成静态引用。
- 当前持久快照仍保存解析与语义文件数据，未保存解析后的引用 postings。完整派生依赖图和分层磁盘格式继续列在 P3。

## 规模证据

命令：

```bash
pnpm build:packages
node scripts/benchmark-references.mjs 10000 200
```

Linux x64、Node.js v22.14.0、本机 Intel Xeon E5-2696 v3 的结果：

| 指标 | 结果 | 冻结预算 |
| --- | ---: | ---: |
| 10,000 文件内存索引 | 3121.71 ms | 仅记录 |
| 类型 References P50 / P95 / max | 0.06 / 0.17 / 0.35 ms | P95 ≤ 150 ms |
| 方法 References P50 / P95 / max | 0.23 / 0.57 / 3.50 ms | P95 ≤ 150 ms |

基准同时验证无关文件命中为 0、使用文件替换后陈旧命中为 0，并验证快照恢复后类型与方法引用重新出现。

## 回归门禁

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm test`：十六个组件 619 项、根扩展 33 项，共 652 项通过。
- `pnpm verify:packages`：十六个组件 tarball 在仓库外隔离安装并验证通过。
- `pnpm package:all && pnpm verify:vsix`：主扩展、Open Source Pack、Recommended Pack 三份 VSIX 通过内容检查。
- `pnpm test:extension:packaged`：VS Code 1.137.0 的隔离 profile 内通过打包主扩展工作流。

VSIX SHA-256：

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `fee08e253ce722f9f32497be4da02c1f2522a87cef581bf5917f22da679f4f1d` |
| `php-companion-open-source-pack-0.4.5.vsix` | `187a9c53079adc3d20587942a073d975cafdf4ae33529cf494d874bd67e9dbea` |
| `php-companion-recommended-pack-0.4.5.vsix` | `4c2f1502961b479a9340663a6741e10d011aa5a39b1527c42f8b81ba43232ac0` |
