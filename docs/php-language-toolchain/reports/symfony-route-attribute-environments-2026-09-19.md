# Symfony Route Attribute 环境筛选

日期：2026-09-19

## 语义依据与实现

本机 Symfony 7.4 的 `Attribute\Route` 将 `env` 规范化为字符串数组；`AttributeClassLoader` 先用类级环境筛选整个 Controller，再在 `addRoute()` 中筛选每个方法 Attribute。环境不匹配的声明在生成默认名称之前返回，因此不会消耗同一方法的自动名称序号。

framework-symfony 现在接受类级和方法级 `env: 'dev'` 或 `env: ['dev', 'test']`，并以调用方显式传入的环境执行同样的两层筛选。Language Server 传入 resource scope `phpCompanion.symfony.environment`；未设置时只发布没有环境限制的 Attribute 路由。动态表达式、带动态元素或键值映射的数组继续保持 unknown。

## 验证

- framework-symfony 38 项测试通过，覆盖类级字符串数组、方法级字符串、环境不匹配和未命名序号。
- 聚焦 stdio 回归在同一打开文档中把环境从 `prod` 切到 `dev`：`admin.class_dev_only` 仅在 dev 出现，最终路径为 `/prefix/base/dev`；切回 prod 后候选立即消失。
- Winstar 当前源码没有 `Route(env: ...)` 样本，因此没有把单元 fixture 冒充为项目覆盖；真实项目验证使用同一静态图和 provider 快照切换路径。

功能提交、全量回归、Alpha 候选与安装证据将在发布门禁完成后补入本报告。
