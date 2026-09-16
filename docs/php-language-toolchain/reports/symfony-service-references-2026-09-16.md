# Symfony 服务注册 References（2026-09-16）

## 目标

从 PHP 类声明或类型使用点执行 Find All References 时，除普通 PHP 引用外，显示可由静态证据证明的 Symfony 服务注册位置。实现类导航继续指向 PHP 源码；注册来源单独指向服务配置，避免把类声明重复计为框架引用。

## 已实现范围

- 显式 YAML service 的键范围。
- 确定性 YAML namespace resource 展开后的 resource 键范围，继续遵守目录、尾部通配符、brace exclude、抽象类和显式覆盖规则。
- 新鲜 `dev` 编译容器 XML 中的服务 ID 范围。
- `onDemand` 冷启动类型查询先按短类名扫描候选 PHP 文件；若尚无该类的 Symfony 服务事实，再加载服务配置并合并引用，不启动依赖全量索引。
- Symfony 原始事实缓存升级为 `symfony-facts-v2`，旧缓存会安全重建。

动态 resource、参数化 class/resource、运行时编译器改写和无法证明的注册保持不返回。事件订阅与 dispatch/listener 关系不在本次范围，仍列为 P8 后续任务。

## 验证证据

- `@php-companion/framework-symfony`：20 项测试通过。
- Language Server 冷启动 stdio 回归：onDemand 模式、无预热索引时，从类声明查询得到 `config/services.yaml` 注册位置。
- 既有 Symfony/Doctrine stdio 场景：从类型使用点同时得到 PHP 声明和服务配置位置。
- Language Server 完整套件：6 个测试文件、185 项测试全部通过，耗时 212.33 秒。
- 根级 TypeScript 与 ESLint 通过；16 个 monorepo 组件 tarball 从隔离消费者安装验证通过。
- 三份 0.4.5 VSIX 均完成打包并通过 `verify:vsix` 内容检查。
- Winstar 只读实测：`src/Bridge/AdminSecuritySubscriber.php` 首次 Definition 约 1.95 秒；首次 References 约 6.19 秒并返回 1 项；重复 References 约 15 毫秒并保持 1 项。该项目由 `config/symfony/services.yaml` 的 `App\\Bridge\\` resource 注册此类。
