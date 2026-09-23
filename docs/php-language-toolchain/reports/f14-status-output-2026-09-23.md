# F14 Language Server 状态日志本地化

日期：2026-09-23。Composer 项目加载、Symfony 语义 Provider 提交、Callable 工厂事实缓存、引用事实就绪以及项目/PHP 文件索引完成等信息级状态，现按 LSP 客户端语言输出。路径、Provider ID、版本号、计数和布尔值保持原样；英文默认文案保持原样。

验证：Language Server 构建和相关 ESLint 通过；4 项文案测试覆盖中英文状态及数字参数。真实 `zh-CN` stdio 客户端初始化后启动渐进索引，收到中文 Composer 项目快照日志。既有英文 stdio 用例确认项目扫描日志仍可被识别。

`[index:]`、`[references:]` 等结构化性能/诊断记录仍为英文，后续需单独审计消费方与本地化边界。未生成 VSIX；F14 最终验收保持开放。
