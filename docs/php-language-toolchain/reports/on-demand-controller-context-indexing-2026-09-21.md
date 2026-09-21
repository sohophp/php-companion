# onDemand Controller 上下文索引验收

日期：2026-09-21

## 问题

真实 Winstar WSL 日志显示，窗口 Reload 后出现 `[index:1] start reason=semantic-query`，项目源码约 54.9 秒可用，完整流程在 71.348 秒结束。工作区设置使用默认 `onDemand`，触发链来自两个内部行为：独立 Symfony 扩展动态注册语义 Provider 时无条件启动全项目索引；TwigPlus 请求 `phpCompanion/interop/contexts` 时又要求完整项目索引。

这使普通 Reload 看起来像主动执行了项目级 References 或 Rename，也延迟了 Controller → Twig 上下文可用时间。

## 修改

- 动态 Provider 注册仍会撤销旧事实、清理受影响的 Symfony 容器、事件或 Controller 上下文并刷新打开文档诊断，但只有 `experimental` 模式会主动重建完整索引。
- `onDemand` 的 Twig interop 请求改为扫描 Composer 项目源码，不包含依赖；扫描受既有文件数、单文件大小、总字节数与取消令牌约束。
- 每个源码文件保存可复用的 `source-candidates-v1` 摘要，只把含精确 `render` PHP 标识符的文件加载到语义工作区并交给独立 Controller Context Provider。
- 首次扫描与缓存恢复使用同一精确标识符条件。`surrender` 等只包含该子串的标识符不会扩大 Provider 请求，避免超过协议最多 128 个文档的边界；精确 `render` 出现在注释或字符串时仍允许成为保守候选，并由 Provider 的 PHP AST 判断排除。
- 打开的未保存文档覆盖磁盘源码；删除 `render` 的文档会清除旧上下文。项目 epoch 在扫描中变化时会重试，扫描或 Provider 不完整时返回不可用，不发布部分上下文。
- Provider 返回上下文后，只按 Composer PSR-4 路径加载上下文变量所需的具体类型，用于 TwigPlus 成员目录；不为此扫描 vendor 或完整项目。

## 自动回归

- onDemand Reload 测试在 `initialized` 后动态注册 Controller Context Provider，确认没有 `Indexed` 或 `[index:]` 日志。
- Controller 上下文测试从冷缓存发起 interop 请求，确认只解析一个真正包含 `render` 标识符的文件；另一个只含 `surrender` 的文件被排除。
- 同一测试确认上下文中的 `App\\User` 通过 PSR-4 定点加载，Twig interop 类型目录包含其公开 `name` 属性。
- 既有动态通用 Provider 注册/撤销测试明确使用 `experimental`，继续验证完整项目事实 Provider 的生命周期。

## 真实 Winstar 结果

使用当前构建的 Language Server、独立 `php-companion-symfony` Controller Provider 和隔离缓存，通过 stdio 初始化 `/var/www/php/8.5/winstar2024`，设置 `indexingMode: onDemand` 后直接请求 `phpCompanion/interop/contexts`：

| 运行 | 总 PHP 文件 | 摘要缓存命中 | 解析候选 | 返回上下文 | 耗时 | `[index:]` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 冷缓存 | 2,277 | 0 | 111 | 9 | 12.918 秒 | 0 |
| 热缓存 | 2,277 | 2,166 | 111 | 9 | 9.669 秒 | 0 |

冷缓存最初还复现并定位了旧子串筛选问题：误命中文件使 Provider 拒绝超过协议边界的请求并返回 `null`。切换到精确标识符摘要后，同一全新缓存首次请求稳定返回 9 个上下文。

## 边界

该路径只负责 Controller → Twig 上下文发现，不建立 PHP 全项目引用图。用户明确执行 Find All References、F2 Rename 或其他需要完整证明的项目级操作时，仍会按该能力的精度和完整性规则执行有界项目扫描。Twig 解析、模板补全、格式化和模板作用域继续由 TwigPlus 独立拥有。
