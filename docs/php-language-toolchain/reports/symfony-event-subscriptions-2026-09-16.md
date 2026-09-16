# Symfony 事件订阅 References（2026-09-16）

## 行为

对实现 `Symfony\\Component\\EventDispatcher\\EventSubscriberInterface` 的类，PHP Companion 会分析公开静态 `getSubscribedEvents()` 的单一直接返回数组：

- 从订阅类执行 Find All References，会额外显示每个可证明的事件键。
- 从公开实例监听方法执行 Find All References，会额外显示数组中的回调字符串。
- 支持字符串事件、静态类常量事件、直接回调、`[method, priority]` 和多个监听器数组。
- 只有回调可对应到同类公开非静态方法时才发布关系。

同一 References 链路现在也分析两类可静态证明的监听关系：

- 类级和方法级 `Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener`，包括字面量事件、`Event::class`、整数优先级、首个原生事件参数推断、类级 `on<EventName>` 派生和 `__invoke` 回退；方法级 attribute 不接受另行指定 method。
- `services.yaml` 中显式 `kernel.event_listener` 标签；event、method 和 priority 必须为静态值，标签可随确定性 resource 服务展开，类与方法 References 分别返回 event 和 method 的精确 YAML 范围。

两条路径都要求监听器对应同类公开非静态方法。动态事件名、动态 attribute 参数、分支返回、继承或 Trait 提供的订阅数组/监听方法、XML 或编译容器事件标签和 dispatch 调用保持未知，避免把约定猜测成引用。

Symfony 来源事实缓存同步升级为 `symfony-facts-v3`，恢复时会验证每条 YAML 监听事实及 event/method 范围；旧 v2 缓存自动重建。

## 查询性能

项目级方法、属性和常量 References 复用按名称候选扫描：读取 Composer 项目源码，但只解析包含目标名称的文件。冷查询不再为了单个成员引用启动完整语义索引；打开缓冲区仍优先于磁盘内容，扫描期间变化会按既有 epoch 规则重试。

Winstar 只读实测：

- `AdminSecuritySubscriber` 类 References：本轮首次约 6.29 秒，返回服务 resource 注册和 `KernelEvents::CONTROLLER` 事件订阅两项；热查询约 33 毫秒。
- `onKernelController` 方法 References：优化前基线约 50.02 秒；本轮首次约 5.72 秒，返回 `getSubscribedEvents()` 中的回调字符串；热查询约 13 毫秒。

## 验证

- framework-symfony 覆盖直接监听器、优先级、多监听器、动态事件、私有方法和非 subscriber 反例。
- Language Server 冷启动 stdio 回归同时验证服务注册、类事件关系、方法回调关系，且没有启动完整 `[index:]` 扫描。
- framework-symfony 新增 attribute 与 YAML 标签正反例；Language Server 冷启动回归确认 subscriber、attribute、有效 YAML 标签同时出现，无效 method 标签被排除。
- framework-symfony 23 项测试通过。
- Language Server 完整套件 6 个测试文件、185 项测试通过，耗时 220.30 秒。
- 根级 TypeScript、ESLint 和 39 项扩展单元测试通过。
- 16 个 monorepo 组件 tarball 从隔离消费者安装验证通过。
- 三份 0.4.5 VSIX 已完成打包并通过 `verify:vsix` 内容检查。

## Alpha 候选

- 功能提交：`2f693ca9d8b39be1f4961c02c68734867b4eb5f3`。
- 候选目录：`artifacts/php-companion-alpha-0.4.5-2f693ca9/`。
- 核心 VSIX SHA-256：`41911b1958bbefdd12aa235b80ed7b798348ed6f125c58988ecbd3d8bf8b0831`。
- Open Source Pack SHA-256：`b5bf50b511fd31c61ba922f4a52c7bb2eb97fe203bc270180e0094e4bca9c3d4`。
- Recommended Pack SHA-256：`7cdb5a77c705432de1e0b925ccbe7bd381df6bb27a90f83db57f13f3e6560c4a`。
- 核心 VSIX 已覆盖安装到 WSL RockyLinux8。安装目录与候选包内的 `language-server.js` SHA-256 均为 `56c69463b313128c395808f543a6193ffad24fc106ea9c4ff4bacfa4904af919`；`extension.js` SHA-256 均为 `9c666742c7823b2ff640f9d4b813979a7e6aeaed69e6b99d6d1afe6cf375ef8f`。须 Reload Window 后加载新进程。
