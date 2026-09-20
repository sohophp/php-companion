# 封闭作用域 Rename 不再启动项目索引

日期：2026-09-20

功能提交：`2d8c3ea2cd4bc2ad6661d3782f11613b84f2891d`

## 问题与边界

`onDemand` 模式已经能从当前文档证明局部变量，以及 final class 中 private 提升属性的完整封闭 Rename 范围，但 Prepare Rename 和 Rename 过去会先等待项目源码索引。真实 Winstar 在 `AdminSecuritySubscriber::$urlGenerator` 上按 F2 因而显示 `Indexing PHP symbols`，即使正确编辑只涉及同一 final class。

现在服务器先从当前语义文档求解这两类封闭目标：

- 可证明时立即返回 Prepare Rename 或完整 WorkspaceEdit，不创建项目索引。
- 当前文档不能证明时仍按原行为完成项目源码索引，再重试封闭目标。
- 类型、函数、常量、公开/受保护成员及非封闭属性继续要求对应完整性门禁，不把局部优化扩大为不完整的跨项目 Rename。

## 自动验证

- Language Server 5 个文件共 191 项测试通过。修改后的冷启动 stdio 用例同时执行 private 提升属性 Prepare Rename 和 Rename，断言返回 2 处编辑，并证明没有任何 `[index:*]` 启动日志。
- 全仓 TypeScript 与 ESLint、根扩展 44 项测试通过。
- 24 个组件 tarball 在仓库外隔离消费者中完成安装、导入和 smoke；四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 同时加载核心与独立 Symfony VSIX。首次运行在既有 PHP 8.4 隐式可空诊断的 5 秒等待点超时；未修改源码或候选的第二次完整运行通过并以 0 退出。本轮不把首次运行记录为通过，也没有把该超时归因于 Rename 实现。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的候选摘要、Composer 根、运行时版本和 WSL 确定性预检均通过。

## 真实 Winstar 审计

对真实 `src/Bridge/AdminSecuritySubscriber.php` 构造器声明中的 private readonly `$urlGenerator` 发起 LSP Prepare Rename 和 Rename。探针只检查返回的 WorkspaceEdit，不应用修改。

| 运行产物 | Prepare Rename | Rename | 编辑数 | 项目索引日志 | `Indexing PHP symbols` 进度 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 源码构建 | 8.36 ms | 13.39 ms | 3 | 0 | 0 |
| WSL 安装 bundle | 8.77 ms | 43.04 ms | 3 | 0 | 0 |

两次 Rename 都只返回 `routeGenerator` 文本，覆盖提升属性声明、构造参数身份和 `$this->urlGenerator` 使用。项目文件没有被修改。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-2d8c3ea2/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `33277df6d4a75a5ff816c0dbfe6c12fd2d2cdced95094bfed0cd862887df0cf8` |
| `php-companion-symfony-0.4.5.vsix` | `56ed4cea54a2e7f48039c1a43dd57b141c878f237ef173f4dd27424b26bb8340` |
| `php-companion-open-source-pack-0.4.5.vsix` | `3f4e69c5fe25b895d1ec6cf04deca7d1417668ab459f94d2cf88b3247504963c` |
| `php-companion-recommended-pack-0.4.5.vsix` | `8d1f932bf939817d26f0d1507e7974e6f34e9053363f5175305a5032194b2b50` |

本轮 WSL Remote CLI 的安装和只读清单命令均挂起。终止本轮 CLI 客户端后，候选核心的 `language-server.js` 以临时文件加原子 `mv` 覆盖现有 0.4.5 安装；候选 VSIX、构建输出和安装目标的 SHA-256 均为 `26580154d61e6a49e35c026f35e47670873e84e6979940cf0594e4a19406d682`。核心扩展入口、Symfony 扩展入口和静态路由 Provider 与候选构建摘要一致。

Alpha Profile 需要执行 Reload Window 才会启动新 Language Server。更广泛的符号 Rename 仍保留项目完整性要求；后续只在可证明候选扫描覆盖全部身份时继续缩短其等待时间。
