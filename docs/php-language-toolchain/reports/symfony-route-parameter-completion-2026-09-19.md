# Symfony 路由路径参数补全

日期：2026-09-19

## 实现

framework-symfony 在 PHP 语法树中定位 `generateUrl()`、`redirectToRoute()` 和 `generate()` 的直接参数数组键，保留路由字面量、位置或命名参数身份、已有键及精确替换范围。Language Server 再以语义模型证明方法属于受支持的 Symfony 路由生成接口，并核对路由和参数数组分别对应目标方法的前两个形参。

路由必须在静态图及动态 Provider 合并后名称唯一。补全从最终路径提取合法 `{identifier}` 占位符，排除已有键并只替换当前字符串内容。动态路由名、动态键、非直接数组、unpack、重复路由名、同名业务方法和外部 runtime provider 所有权均不产生 Companion 参数候选。

## 验证

- framework-symfony 37 项测试通过，覆盖位置参数、重排命名参数，以及动态路由、动态键、非数组和 unpack 拒绝。
- Language Server 186 项测试通过，覆盖 `{id}` / `{slug}` 候选、已有键排除及同名业务方法门禁。
- 真实 Winstar onDemand 探针通过内置 runtime Provider 取得 `admin.CompanyPage.edit` 的最终路径 `/newadmin/CompanyPage/edit/{id}`，并在 `RouterInterface::generate('admin.CompanyPage.edit', ['i' => 1])` 的键位置只返回 `id`，类型为 Field，详情为 `admin.CompanyPage.edit path parameter`。

## 边界

当前只补全直接参数数组中的字符串键，不推断路由默认值、requirements、控制器形参或动态数组构造。外部 Symfony Language Tools 拥有工作区 runtime 路由能力时，Companion 不运行自己的路由 Provider，也不发布这类候选。

功能提交、Alpha 候选、组件 tarball、VSIX 哈希和 WSL 安装证据将在完成发布门禁后补入本报告。
