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

功能提交为 `5c57b84`。Language Server 186 项、全仓 TypeScript 与 ESLint 通过；19 个组件 tarball 已从隔离消费者安装并执行 smoke test。Winstar PHP 8.5 和 CoreRepo PHP 7.2 的 WSL 确定性预检通过。

Alpha 候选目录为 `artifacts/php-companion-alpha-0.4.5-5c57b84d/`：

- 核心 VSIX：`7b332981729a10a1c712939dc12959daeab64e30e741b475737e6e87938efe57`
- Open Source Pack：`88ee601810964824ff6eceb90fdcec7c04e99b362c23e98a52aa907cf4293832`
- Recommended Pack：`2b0de513d4ebb0393c046b963b18cb3eaebec19357c416623872373744964126`

三份 VSIX 的清单、内容和 `SHA256SUMS` 均通过。核心候选已由 Remote CLI 成功覆盖安装到 WSL RockyLinux8；已安装 adapter、Language Server 和 Winstar Provider 的 SHA-256 分别为 `e7169e05f37abf9c87edaa0e867c6e921ea9a2ea633916e829d5384348e778df`、`d73229ab863be4742bf21156b68a7a955969f4c68679f6b43dee8479f1100863`、`f048ee8753ca6c95b7caf9e9d3b6ca2d7780fa1d02fa5f6e2e3e881e082c0ed5`，与构建输出逐项一致。

直接启动已安装 Language Server 的隔离 stdio 探针在 none/dev/prod 三种环境均返回 `admin.localized.en` 与 `admin.localized.fr`，路径分别为 `/english` 与 `/francais`。YAML `when@env` 的 none/dev/prod 探针及真实 Winstar `admin.CompanyPage.edit` 的唯一 `id` 参数候选也继续通过。VS Code 需要 Reload Window 才会让当前 Extension Host 加载新版本。
