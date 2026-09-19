# Symfony Route Attribute 环境筛选

日期：2026-09-19

## 语义依据与实现

本机 Symfony 7.4 的 `Attribute\Route` 将 `env` 规范化为字符串数组；`AttributeClassLoader` 先用类级环境筛选整个 Controller，再在 `addRoute()` 中筛选每个方法 Attribute。环境不匹配的声明在生成默认名称之前返回，因此不会消耗同一方法的自动名称序号。

framework-symfony 现在接受类级和方法级 `env: 'dev'` 或 `env: ['dev', 'test']`，并以调用方显式传入的环境执行同样的两层筛选。Language Server 传入 resource scope `phpCompanion.symfony.environment`；未设置时只发布没有环境限制的 Attribute 路由。动态表达式、带动态元素或键值映射的数组继续保持 unknown。

## 验证

- framework-symfony 38 项测试通过，覆盖类级字符串数组、方法级字符串、环境不匹配和未命名序号。
- 聚焦 stdio 回归在同一打开文档中把环境从 `prod` 切到 `dev`：`admin.class_dev_only` 仅在 dev 出现，最终路径为 `/prefix/base/dev`；切回 prod 后候选立即消失。
- Winstar 当前源码没有 `Route(env: ...)` 样本，因此没有把单元 fixture 冒充为项目覆盖；真实项目验证使用同一静态图和 provider 快照切换路径。

功能提交为 `6f18f29`。Language Server 186 项、全仓 TypeScript 与 ESLint 通过；19 个组件 tarball 已从隔离消费者安装并执行 smoke test。Winstar PHP 8.5 和 CoreRepo PHP 7.2 的 WSL 确定性预检通过。

Alpha 候选目录为 `artifacts/php-companion-alpha-0.4.5-6f18f29c/`：

- 核心 VSIX：`d027349d2e777a1ec1743df3984ee0614aedf89f0a9bd084e68f6d92e0ff5472`
- Open Source Pack：`74b30383b5834eeb1647617c8d48afb5c5f006cc07c21a01d33d57348ad2e2e0`
- Recommended Pack：`89c38ef306d50224467beb284dfbac628adfbd66fae21110c2bf163a60bd649b`

三份 VSIX 的清单、内容和 `SHA256SUMS` 均通过。Remote CLI 本次结束时没有更新现有 0.4.5 扩展目录，因此没有把该操作记作成功安装；候选 `language-server.js` 随后原子覆盖到 WSL RockyLinux8，已安装文件与构建输出 SHA-256 均为 `6b7473661e7a01b3c1082c99a35b1b488b9aeb2122e5ee67c3ee6064ab96b306`。adapter 和 Winstar Provider 未变化，哈希仍分别为 `e7169e05f37abf9c87edaa0e867c6e921ea9a2ea633916e829d5384348e778df` 与 `f048ee8753ca6c95b7caf9e9d3b6ca2d7780fa1d02fa5f6e2e3e881e082c0ed5`。

直接启动已安装 Language Server 的隔离 stdio 探针得到 `none=[]`、`dev=[admin.dev_only]`、`prod=[]`；同一已安装 bundle 对真实 Winstar `admin.CompanyPage.edit` 仍只补全 `id`。VS Code 需要 Reload Window 才会让当前 Extension Host 加载新 bundle。
