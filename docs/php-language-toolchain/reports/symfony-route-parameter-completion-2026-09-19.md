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

功能提交为 `ca8ed34`。全仓 TypeScript 与 ESLint 通过；19 个组件 tarball 已从隔离消费者安装并执行 smoke test。Winstar PHP 8.5 和 CoreRepo PHP 7.2 的 WSL 确定性预检通过。

Alpha 候选目录为 `artifacts/php-companion-alpha-0.4.5-ca8ed34d/`：

- 核心 VSIX：`fa4e6efa6392a8c49b05144a71e1560b035ce63a533940040369c80b88bd36e2`
- Open Source Pack：`92c7d00249fb39bd1d73d7200ecc36074aa81a72bcbf39f7a8c8c621cde09612`
- Recommended Pack：`9e8fcf358b6d4ff92159aeea8e602ee6d1ccf8fca14aee28dcbe528e94b607b1`

三份 VSIX 的清单、内容和 `SHA256SUMS` 均已验证。核心候选已覆盖安装到 WSL RockyLinux8；已安装 adapter、Language Server 和 Winstar Provider bundle 的 SHA-256 分别为 `e7169e05f37abf9c87edaa0e867c6e921ea9a2ea633916e829d5384348e778df`、`6afcf489a1c66cea22fd7de3bc690c706b88132764eb9bd8eef135223d737f3e`、`f048ee8753ca6c95b7caf9e9d3b6ca2d7780fa1d02fa5f6e2e3e881e082c0ed5`，与本次构建输出逐项一致。直接启动已安装的 Language Server 和已安装 Provider 后，真实 Winstar stdio 探针仍只返回 `id`。VS Code 需要执行 Reload Window 才会让当前 Extension Host 加载该候选。
