# Fiber 与敏感参数内建验收

日期：2026-09-15。范围：PHP 8.1 Fiber/ReflectionFiber 与 PHP 8.2 敏感参数运行时对象。

## 实现范围

- `Fiber` 覆盖构造、start/resume/throw/suspend、状态查询、返回值与 `getCurrent(): ?Fiber`，严格从 PHP 8.1 起可见。
- `ReflectionFiber` 覆盖 Fiber、Callable、当前执行文件/行和 trace 查询，严格从 PHP 8.1 起可见。
- `SensitiveParameter` 保留 parameter-only Attribute 声明；`SensitiveParameterValue` 保留 mixed 包装值、`getValue()` 与安全调试信息，严格从 PHP 8.2 起可见。
- 全部声明进入统一虚拟内建文档，现有语义核心直接提供成员补全、Signature Help、返回传播和 Definition，不建立旁路索引。

## 精确性证据

language-spec 测试逐版本检查 PHP 8.0 不含 Fiber、PHP 8.1 不含敏感参数对象，并核对公开方法的参数与返回类型。Language Server 测试从真实 PHP 源码验证 Fiber/ReflectionFiber 的成员、ReflectionFiber 构造签名、`Fiber::getCurrent()` 非空分支收窄、SensitiveParameter Definition 和 SensitiveParameterValue 成员导航。

签名依据 PHP 官方 Fiber、SensitiveParameter、SensitiveParameterValue 与 ReflectionFiber 手册核对，链接记录在 `packages/language-spec/SOURCES.md`。

全仓 `pnpm check` 通过类型检查、ESLint、16 个组件 640 项与根扩展 35 项测试，共 675 项；十六个组件 tarball 均从隔离消费者安装通过，三个 VSIX 均重新打包并通过内容核验。VS Code 1.137.0 Linux x64 打包 Extension Host 退出码为 0。language-spec 为 52 项，Language Server 为 171 项。提交 `2c91a7d` 的 [CI 34943334118](https://github.com/sohophp/php-companion/actions/runs/34943334118) 18/18 成功，覆盖 Linux、Windows、macOS Quality、打包 Extension Host、冻结七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。

私有 Alpha 候选位于 `artifacts/php-companion-alpha-0.4.5-2c91a7d6/`，三份校验和均通过；候选详情见[私有 Alpha 候选验收](private-alpha-candidate-2026-09-15.md)。

## 边界

原生 Fiber 不自行添加 PHPStan/Psalm 泛型；回调的跨 suspend/resume 双向泛型关系在缺少标准原生契约时保持 mixed。该增量关闭真实项目暴露的四个内建类型缺口，不代表 P4 名称绑定、成员查找或完整 PHP 内建目录已经完成。
