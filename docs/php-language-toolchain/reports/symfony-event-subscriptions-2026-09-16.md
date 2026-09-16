# Symfony 事件订阅 References（2026-09-16）

## 行为

对实现 `Symfony\\Component\\EventDispatcher\\EventSubscriberInterface` 的类，PHP Companion 会分析公开静态 `getSubscribedEvents()` 的单一直接返回数组：

- 从订阅类执行 Find All References，会额外显示每个可证明的事件键。
- 从公开实例监听方法执行 Find All References，会额外显示数组中的回调字符串。
- 支持字符串事件、静态类常量事件、直接回调、`[method, priority]` 和多个监听器数组。
- 只有回调可对应到同类公开非静态方法时才发布关系。

动态事件名、动态返回、分支返回、继承或 Trait 提供的订阅数组、`#[AsEventListener]`、YAML/XML service tag 和 dispatch 调用保持未知，避免把约定猜测成引用。

## 查询性能

项目级方法、属性和常量 References 复用按名称候选扫描：读取 Composer 项目源码，但只解析包含目标名称的文件。冷查询不再为了单个成员引用启动完整语义索引；打开缓冲区仍优先于磁盘内容，扫描期间变化会按既有 epoch 规则重试。

Winstar 只读实测：

- `AdminSecuritySubscriber` 类 References：首次约 6.53 秒，返回服务 resource 注册和 `KernelEvents::CONTROLLER` 事件订阅两项；热查询约 21 毫秒。
- `onKernelController` 方法 References：优化前首次约 50.02 秒；优化后首次约 5.81 秒，返回 `getSubscribedEvents()` 中的回调字符串；热查询约 16 毫秒。

## 验证

- framework-symfony 覆盖直接监听器、优先级、多监听器、动态事件、私有方法和非 subscriber 反例。
- Language Server 冷启动 stdio 回归同时验证服务注册、类事件关系、方法回调关系，且没有启动完整 `[index:]` 扫描。
- framework-symfony 21 项和 semantic 267 项测试通过。
- Language Server 完整套件 6 个测试文件、185 项测试通过，耗时 210.63 秒。
- 根级 TypeScript、ESLint 和 39 项扩展单元测试通过。
- 16 个 monorepo 组件 tarball 从隔离消费者安装验证通过。
- VSIX 证据在本阶段封板后补充。
