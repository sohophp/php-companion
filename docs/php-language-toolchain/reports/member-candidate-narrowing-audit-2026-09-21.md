# 高频成员引用候选缩小审计

日期：2026-09-21。功能提交：`cc874e34d1a41939a85131d0889e5b8b6b8ed979`。范围：Winstar `src/Security/AdminPasswordChangeGuard.php` 中 `attributes->get('_route', '')` 的 References。以下缩小候选的改动仅用于本地实验，**未进入交付代码**。

## 对照结果

| 冷进程候选策略 | 解析项目文件 | References | 不同文件 URI | 完整位置 SHA-256 |
| --- | ---: | ---: | ---: | --- |
| 当前保守子串规则 | 1,647 | 112 | 43 | `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2` |
| 仅独立 `get` token | 451 | 66 | 37 | `99eeb63176b80a8e54b2610e6e8ffe378c7c5ac5441eda56678b8c2d90b7c00e` |
| 独立 token + `AppController` 声明 | 451 + 1 | 111 | 42 | `55708039e9934ff6b413b7a25ecc2fd4204ff61bef067be4db35b3d0fc9183a4` |
| 独立 token + 三层相关 Controller 声明 | 451 + 3 | 112 | 43 | 与保守规则一致 |

缺失的六个文件 URI 均为 Admin/Media/Email 控制器。直接写有 `->get()` 的类需要沿 `EmailRecordsController → NativeRecordController → AppController → Controller` 等继承链，才能证明 `$this->request` 是 Symfony Request；`AppController` 等中间类文件本身不含独立 `get` token。因此不能按“目标词出现为完整标识符”排除所有其他文件。

三层声明的补入仅证明**这个样本**的位置恢复。实验中，已解析文件记录的 1,248 个 `get` 方法访问仍有 524 个无法唯一解析；仅凭此样本无法证明未知调用与目标无关，不能把硬编码或不完整的继承闭包推广为项目索引规则。实验代码已撤回，当前产品继续使用保守候选并以完整位置摘要守护正确性。

CPU 采样显示首次候选阶段主要耗在 Tree-sitter 解析和语义构造，摘要扫描与压缩只占较小部分。语义更新中另有一处跨文件 `value-of<Enum>` 声明查找改为现有倒排索引；Winstar 的 112 处位置摘要保持不变。单次查询时间差异不足以把这项微优化报告为显著提速。下一步应建立可验证的类型/继承依赖闭包，或改进解析调度；未知成员访问仍须保守回退。

语义包 279 项、Language Server 199 项、根 TypeScript/ESLint 和 24 个独立 tarball 消费验证通过。
