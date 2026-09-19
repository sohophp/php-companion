# Symfony 本地化 Route Attribute

日期：2026-09-19

## 语义依据与实现

Symfony 7.4 `AttributeClassLoader::addRoute()` 把 `path` 数组视为 locale→path 映射。普通类前缀会拼到每个本地化方法路径；类级本地化前缀可拼普通方法路径；两级均为 map 时必须具有完全对应的 locale 键。每个结果以基础名称加 `.locale` 注册，并设置该 locale 的默认值与约束。

framework-symfony 现在静态展开上述字面量子集。名称来源、自动名称序号和源码范围仍以一个 Attribute 为单位；同一 Attribute 展开的多个 locale 名称共享其精确名称或 Attribute 范围。invokable 类使用相同展开逻辑。动态 map、非字符串键值、重复 locale、类/方法 locale 集合不一致和 alias 均不发布。

Language Server 不增加特殊分支：展开后的事实进入现有唯一性合并，因此路由补全、Definition、References 和参数名补全共用相同身份与 Provider 所有权规则。

## 验证

- framework-symfony 40 项测试通过，覆盖类 map + 方法字符串、类/方法双 map、类字符串 + 方法 map、invokable 类和 locale 不匹配拒绝。
- 聚焦 stdio 回归通过显式 Attribute import 返回 `admin.class_localized.en` 与 `admin.class_localized.fr`，最终路径分别为 `/prefix/base/english` 和 `/prefix/base/francais`。
- Winstar 当前源码没有本地化 Route Attribute 样本，因此未声称真实项目覆盖；实现依据 Symfony 7.4 loader 源码和隔离 fixture。

功能提交、全量回归、Alpha 候选与安装证据将在发布门禁完成后补入本报告。
