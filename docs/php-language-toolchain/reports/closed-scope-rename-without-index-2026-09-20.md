# 封闭作用域 Rename 不再启动项目索引

日期：2026-09-20

功能提交：`2f971cc360abb0bb45cc4cc4bd7a8df31825a013`

## 问题与边界

`onDemand` 模式已经能从当前文档证明局部变量范围，但 Prepare Rename 和 Rename 过去会先等待项目源码索引。final class 中 private 提升属性还同时具有构造参数身份，项目其他文件可能通过命名参数调用构造器，因此不能只编辑当前文档。真实 Winstar 在 `AdminSecuritySubscriber::$urlGenerator` 上按 F2 因而显示 `Indexing PHP symbols`。

现在服务器按目标范围分别处理：

- 局部变量从当前语义文档立即返回 Prepare Rename 或完整 WorkspaceEdit。
- final class private 提升属性先执行有界同名候选扫描，再覆盖声明/构造参数、构造器 PHPDoc、类内属性访问和跨文件构造器命名参数；不会启动全量项目索引。
- 命名参数的构造器签名从参数名称位置解析，因此 `dependency: new Value()` 这类嵌套调用不会误选内层构造器。
- 类型、函数、常量、公开/受保护成员及非封闭属性继续要求对应完整性门禁，不把局部优化扩大为不完整的跨项目 Rename。

## 自动验证

- semantic 270 项测试通过；新增跨文件 final private 提升属性回归，构造命名参数值包含嵌套 `new \\stdClass()`，仍返回完整命名参数编辑。
- Language Server 5 个文件共 191 项测试通过。修改后的冷启动 stdio 用例同时执行 private 提升属性 Prepare Rename 和 Rename，断言源文件 2 处、消费者命名参数 1 处编辑，并证明没有任何 `[index:*]` 启动日志。
- 全仓 TypeScript 与 ESLint、根扩展 44 项测试通过。
- 24 个组件 tarball 在仓库外隔离消费者中完成安装、导入和 smoke；四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 同时加载核心与独立 Symfony VSIX，完整运行通过并以 0 退出。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的候选摘要、Composer 根、运行时版本和 WSL 确定性预检均通过。

## 真实 Winstar 审计

对真实 `src/Bridge/AdminSecuritySubscriber.php` 构造器声明中的 private readonly `$urlGenerator` 发起 LSP Prepare Rename 和 Rename。探针只检查返回的 WorkspaceEdit，不应用修改。

| 运行产物 | References | Prepare Rename | Rename | 编辑数 | 全量索引日志 | `Indexing PHP symbols` 进度 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 源码构建 | 13.005 s | 512.37 ms | 487.27 ms | 3 | 0 | 0 |
| WSL 安装 bundle | 12.624 s | 544.38 ms | 502.25 ms | 3 | 0 | 0 |

两次 Rename 都只返回 `routeGenerator` 文本，覆盖提升属性声明、构造参数身份和 `$this->urlGenerator` 使用。References 的有界扫描检查 2,265/2,270 个项目文件，仅解析 231 个同名候选；后续 Prepare/Rename 复用候选事实。项目文件没有被修改。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-2f971cc3/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `f8c19104000bfb077e422c0ada0638ee1afeab6582d41beff9d7294aca90bc9f` |
| `php-companion-symfony-0.4.5.vsix` | `0f6c5ae5657375bd15d8821f450298d06cf77bc86dd706647070cb96cc7f1e9b` |
| `php-companion-open-source-pack-0.4.5.vsix` | `4ce79351931f34f47c17033ba8da016c2758c6cd20d9bdb58b525e0eda4f588a` |
| `php-companion-recommended-pack-0.4.5.vsix` | `34fe4d21a20000ba7ec79297bd316a3a9c458dad843d4a684b4df34f4cfe98f4` |

候选核心的 `language-server.js` 以临时文件加原子 `mv` 覆盖现有 0.4.5 安装；构建输出和安装目标的 SHA-256 均为 `496cd4cfe4f38ddbad4fe185efe4d4610f0909fadcf9e594ad27af18dd24c435`。

Alpha Profile 需要执行 Reload Window 才会启动新 Language Server。更广泛的符号 Rename 仍保留项目完整性要求；后续只在可证明候选扫描覆盖全部身份时继续缩短其等待时间。
