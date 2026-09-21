# 工作区内重复 References 查询缓存

日期：2026-09-21。功能提交：`d2914008f2b2184b3b54d14b449abfab0d1ec29d`。

## 实现与失效边界

`SemanticWorkspace.references()` 现在缓存一次查询得到的精确语义位置。缓存最多 32 项，每项至多 2,048 个位置；超大结果每次重算。返回给调用方的是独立位置对象，调用方修改结果不会污染缓存。源码更新/删除、完整或声明快照恢复、延迟实现加载、外部语义 Provider 替换/撤销，以及 Callable 构造事实恢复时清空缓存。语言服务器仍为每次 LSP 请求执行版本、候选完整性和 Symfony 扩展事实检查；缓存只覆盖工作区语义结果，不覆盖这些门禁。

## 真实 Winstar 对照

分别启动独立 LSP 进程，从 `src/Security/AdminPasswordChangeGuard.php` 的 `attributes->get('_route', '')` 连续发起两次相同的 References。旧进程使用冻结候选 `artifacts/php-companion-alpha-0.4.5-7df60a26/` 的核心 VSIX；新进程使用当前源码构建。两边均使用独立的新候选缓存。

| 查询 | 旧候选 | 当前代码 |
| --- | ---: | ---: |
| Definition | 1 处，2.596 秒 | 1 处，2.602 秒 |
| 首次 References | 112 处，47.689 秒 | 112 处，48.483 秒 |
| 紧接着重复 References | 112 处，11.311 秒 | 112 处，0.017 秒 |

两版 Definition 的完整位置 SHA-256 均为 `62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1`；两版及两次 References 的全部 URI/行列位置 SHA-256 均为 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`。以上为同机单次观测，不是性能分位数。首次查询的约 48 秒并未改善，跨进程热查询仍需重新恢复候选，不能把 17 毫秒推广到 Reload 后第一次查询。

## 回归与限制

- 专项语义回归验证重复调用不再重新解析候选语法树，且完整位置集合一致；编辑候选文件、移除/恢复快照会立即改变结果。
- Provider 方法事实被替换后，先前缓存的外部方法引用消失；无效 Provider 更新仍按原有原子门禁拒绝。
- 语义包 279 项、Language Server 199 项、根 TypeScript/ESLint 及 24 个独立 tarball 消费验证通过。
- 真实 VS Code WSL Alpha Profile 的连续编辑、扩展宿主所有权和竞争 PHP Provider 状态仍待人工验收。
