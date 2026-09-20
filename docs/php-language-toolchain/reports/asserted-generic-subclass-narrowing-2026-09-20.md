# 泛型父类断言到具体子类的收窄验收

## 问题与修复

真实 Winstar Oracle 在 `src/Modules/Blog/Entity/BlogDatasetEntity.php` 的 `$repo->createQueryBuilder('e')` 处同时失去补全和 Definition。Composer 文件预算、依赖文件集合和加载顺序均不是原因：`$repo` 已先推断为 `EntityRepository<BlogPosts>`，原生 `assert($repo instanceof BlogPostsEntityRepository)` 随后错误地把“泛型父类与具体子类”的可成立交集降为 unknown。

`SemanticWorkspace` 现在对正向原生 `instanceof` 断言增加一条受限规则：当具体目标类存在已解析的继承路径，确认它是当前泛型基类的子类时，保留具体子类；若可计算的泛型父类投影与原类型明确冲突则仍拒绝收窄。未知或无继承关系的类、否定断言及普通类型兼容性规则均未放宽。

新增语义回归先证明 `Repository<Entity>` 经 `assert(... instanceof CustomRepository)` 后原本无法补全或跳转 `custom()`，修复后补全和 Definition 均落到具体 Repository 声明。功能提交为 `108c1e9`；真实审计证据提交为 `0e50a54`。

## 自动验证

- `@php-companion/semantic`：274/274；`@php-companion/language-server`：196/196。
- 全仓 TypeScript 与 ESLint 通过。
- Winstar：9,999 文件、2,289 个项目类型，100/100 抽样声明解析，60 个跨文件样本、1,262 个返回位置，References p95 22.67 ms；冻结 `createQueryBuilder` 补全及 Definition Oracle 均通过，失败数 0。原始数据见 [Winstar 审计 JSON](real-workspace-winstar-v58-2026-09-20.json)。
- CoreRepo PHP 7.2：9,999 文件、1,128 个项目类型，100/100 抽样声明解析，70 个跨文件样本、1,562 个返回位置，References p95 22.67 ms；冻结 Oracle 失败数 0。原始数据见 [CoreRepo 审计 JSON](real-workspace-corerepo-v58-2026-09-20.json)。
- VS Code 1.138.0 隔离打包宿主最终以退出码 0 完成，核心和独立 Symfony VSIX 同时加载。此前两次运行分别在隐式可空或动态属性诊断的固定 5 秒等待处超时；两次失败位置不同，第三次完整通过。这证明产物可运行，也暴露了宿主测试等待窗口的时序波动，不能把前两次失败记为通过。

## 候选与预检

候选目录为 `artifacts/php-companion-alpha-0.4.5-0e50a54a/`，绑定提交 `0e50a54ac55b5678fdd525ec9d8bde4a23b59d70`。`sha256sum -c SHA256SUMS` 四项均为 OK：

| 角色 | 文件 | SHA-256 |
| --- | --- | --- |
| PHP 核心 | `php-companion-0.4.5.vsix` | `3bdce4174145c2ac0f94bb4c561fbb070c9131154a897ec572298a9b55d5d2e3` |
| Symfony | `php-companion-symfony-0.4.5.vsix` | `9abd07a7e72d3056b02f264d7efbf59ef1bf8112dd0923426e4d9f824b4292db` |
| Open Source Pack | `php-companion-open-source-pack-0.4.5.vsix` | `e116af2602e463129d06e20f18c61089732518a64f8481af327d9f490f5ac8ac` |
| Recommended Pack | `php-companion-recommended-pack-0.4.5.vsix` | `92bbd386093a7e6c7e2ee117f496e996c1a5c309149cd1ad3f25ab4fa14f3eae` |

Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL 预检均通过，分别见 [Winstar 预检](alpha-preflight-winstar-asserted-repository.json) 和 [CoreRepo 预检](alpha-preflight-corerepo-asserted-repository.json)。后台 shell 不属于 VS Code 集成终端，所以 Extension Host 所有权、竞争 PHP Provider 和两小时真实编辑仍为人工门槛。

尝试从后台 WSL shell 覆盖安装核心与 Symfony VSIX 时，VS Code Server CLI 超过两分钟未响应；已只终止本次 CLI 进程。磁盘哈希表明 Symfony bundle 已与候选一致，核心 `dist/language-server.js` 仍是上一候选，因此不得宣称当前窗口已加载本修复。应从 Alpha Profile 的 WSL 集成终端重新执行本地核心与 Symfony VSIX 安装并 Reload Window。

## 发布边界与剩余时间

Symfony 已作为独立 `sohophp.php-companion-symfony` VSIX 发布单元存在，同时留在 monorepo 中共享协议、测试和候选证据。PHP 核心继续保持框架无关；Symfony 扩展拥有服务、路由、事件和 Controller 上下文，Twig 仍由 twig-plus 提供。

以当前证据估算：修复 Alpha 剩余索引、引用、Rename 和 Safe Move 实测问题约需 2–4 个工作日；形成可长期主力使用的 Beta 约需 3–5 周；覆盖大多数日常 PHP/Symfony 操作并接近 PhpStorm 体验约需 3–5 个月。调试、测试运行、格式化、YAML、XML、JSON 与 Twig 继续复用成熟扩展，不计入重复自研范围。
