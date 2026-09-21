# PHP Parser 节点访问成本与首次 References

日期：2026-09-21。功能提交：`f25a34f`。

## 改动

Parser 主语法树遍历此前对每个命名节点多次读取 Tree-sitter 的 `node.type`，并为每个节点重新建立相同的成员种类表与调用种类集合。现在每个节点只读取一次类型，种类表与集合每次文档解析只建立一次。作用域查找改为单次循环选取最小包含范围，保留此前排序在同长度时先出现者优先的行为。TreeCursor 遍历的实验在同一 Winstar 查询中为 47.896 秒、结果不变，但比现有遍历更慢；该实验已撤回。

## 真实 Winstar 对照

旧版使用 `artifacts/php-companion-alpha-0.4.5-e634b421/` 的打包核心；新版使用本提交构建的 Parser 与语言服务器。每次以独立新缓存、独立 LSP 进程，从 `src/Security/AdminPasswordChangeGuard.php` 的 `attributes->get('_route', '')` 查询。

| 冷查询 | 旧候选 | 当前代码 |
| --- | ---: | ---: |
| Definition | 1 处，2.641 秒 | 1 处，2.240 秒 |
| 首次 References | 112 处，44.472 秒 | 112 处，37.350 秒 |
| 候选扫描阶段 | 33.123 秒 | 27.665 秒 |
| 精确语义阶段 | 11.305 秒 | 9.640 秒 |

两版均扫描 2,278 个项目文件、解析 1,647 个候选。Definition 的完整位置 SHA-256 都为 `62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1`；112 处 References 的完整位置 SHA-256 都为 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`。这是同机成对单次观测，不代表延迟分位数。之前的中间版本还测得 43.778 秒对 38.276 秒，位置摘要相同；最终提交又以独立缓存复测。

## 门禁与限制

Parser 67、Semantic 279、Language Server 199 项、根 TypeScript/ESLint 及 24 个独立 tarball 消费验证通过。首次查询仍约 37 秒，距离交互式 References 尚有明显差距；真实 WSL Remote Alpha Profile 的扩展宿主归属、竞争 PHP Provider 与持续编辑仍需人工验收。

本轮候选冻结于 `artifacts/php-companion-alpha-0.4.5-76e99553/`，包含核心、独立 Symfony 扩展和两种扩展包。四份 VSIX 的 `SHA256SUMS` 全部通过；Winstar 的 Composer 工作区、WSL 与 PHP 8.5 包装器确定性 preflight 通过；VS Code 1.138.0 隔离打包双扩展宿主以退出码 0 完成。该宿主测试不能代替实际 WSL Profile 中的长时间编辑验收。
