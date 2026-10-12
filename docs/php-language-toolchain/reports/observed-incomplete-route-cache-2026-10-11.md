# 输入完整的未完成路由快照

2026-10-11。固定项目静态路由快照不完整，但已记录32个输入文件，`inputEvidenceComplete=true`；其17个部分路由保持不发布。此前每次References仍重新启动静态Provider，上一正常查询的route阶段630ms。

本轮允许明确启用`cacheUntilInvalidated`的Provider复用不可用状态，仅限输入证据完整、文件与目录数组齐全、非空输入全部是工作区内文件URI。权威未完成快照仍不发布任何部分路由；缺失、未证明、空、不合法URI和工作区外输入仍在下一查询重试。无路由词元的已观察PHP文件及输入目录下文件现在参与磁盘与打开/修改/关闭失效，以及Provider文档快照。

失效保留旧输入清单作为打开文档的分类提示；旧revision不能作为当前References输入证明。缓存签名另包含文档URI、版本及快照完整性，防止打开处理尚未完成时复用旧结果。旧逻辑两项控制均因重复调用Provider失败；首版缓存另两项在立即打开不同内容后错误返回旧路由。原失败与两份源代码/产物备份保持，最终原断言通过。

十项路由协议通过：文件/目录输入两项分别执行不可用状态复用、磁盘恢复、无路由词元PHP的打开/修改/关闭；五类弱输入证据继续恢复重试；原完整快照缓存、权威快照失败/冲突恢复和容器/路由并行引用保持。另十四项准备引用源新鲜度/读取竞态、三项路由契约通过。严格语言服务器与契约构建、正常bundle及定向Lint通过；均为相关范围，不代替完整LSP。

| 同一固定项目的单次正常观测 | References总耗时 | route阶段 | 结果 | 原1000ms门槛 |
| --- | --- | --- | --- | --- |
| 先前1ff2c04c | 2046ms | 630ms | 完整188 / Definition1 | 失败 |
| 当前474b8ff4 | 1435ms | 2ms | 完整188 / Definition1 | 失败 |

完整位置摘要及四个继承/vendor锚点保持，semantic复用0ms，无named-candidates日志。66079项目/238工具输入前后保持，所有观察进程与自有缓存清理。原检查器未变，失败仍在cold，reload未执行。该单次观测证明此固定输入下阶段成本下降，不是P95或全性能资格。

[机器报告](observed-incomplete-route-cache-2026-10-11.json)；[终态审计](../../../.vscode-test/d1815-observed-route-cache-terminal-audit.json)；[归档](../../../.vscode-test/d1815-observed-route-cache-archive/manifest.json)。正常bundle SHA256为`474b8ff429c3963b1cd7e51a8ef9341e9d1ba1bbae8022148af856956f4eeaf8`。新增F09-ROUTE-07，169编号/14家族，路线图未完成大项26；原1秒门槛、新构建完整LSP/六流程、编辑器/平台/Remote和完整F13/P9/R4继续。日常Profile未更新，未提交或发布。
