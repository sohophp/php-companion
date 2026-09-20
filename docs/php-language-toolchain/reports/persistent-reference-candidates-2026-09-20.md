# References 候选摘要持久化

日期：2026-09-20

功能提交：`3da6036696ac607222c0a5c04ba7541bd0771b49`

## 问题

按需 References 与提升属性 F2 已不再启动完整项目索引，但 Reload 后仍需重新读取全部 Composer 项目 PHP 文件，才能找出少量同名候选。Winstar 的 `AdminSecuritySubscriber::$urlGenerator` 已从 231 个语义候选收窄到 4 个，但每次进程冷启动仍约需 5–6 秒。

## 实现边界

- `@php-companion/index` 为每个文件持久化有界、排序的 PHP 标识符与构造器命名参数词法摘要；缓存使用独立 key，不覆盖完整语义索引缓存。
- size、mtime 与 ctime 不变时，从摘要判断是否需要源码。命中候选只表示需要读取，最终 References/Rename 仍由 parser、类型系统与唯一符号身份验证。
- 元数据变化时读取源码并用 SHA-256 回退验证；JSON、schema、字段或上限无效时保守重建。摘要超过 8,192 个 key 时标记为不完整，查询始终读取该文件，不能据此返回零结果。
- 打开的未保存 PHP 文档始终覆盖磁盘文本并进入当前语义工作区。文件 watcher、打开、编辑、关闭与 Composer 图变化继续使查询 generation 失效。
- Composer 源目录改为一次确定性递归枚举；`exclude-from-classmap` 的规范根和正则按不可变项目快照编译一次，避免对每个文件和依赖重复构造。

## 自动验证

- `@php-companion/project` 7 项、`@php-companion/index` 25 项、Language Server 191 项通过。
- stdio 跨进程回归第一次建立摘要，第二个 Language Server 模拟 Reload：2 个文件中 1 个由缓存排除、1 个读取解析，仍返回声明文件 2 处和消费者命名参数 1 处 Rename 编辑。
- 全仓 TypeScript、ESLint、24 个隔离消费者 tarball 与四份 VSIX 内容门禁通过。
- VS Code 1.138.0 隔离 Extension Host 同时加载核心与独立 Symfony VSIX，44 个场景以退出码 0 完成。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过。

## 真实 Winstar 证据

安装候选后，对 `src/Bridge/AdminSecuritySubscriber.php::$urlGenerator` 执行只读探针：

| 运行 | References | 缓存排除 | 语义候选 | Prepare Rename | Rename | 结果 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 首次建立摘要 | 5.524 s | 0 | 4 | 23.32 ms | 22.11 ms | 3 个引用/3 处编辑 |
| Reload 后复用摘要 | 2.209 s | 2,271 | 4 | 23.67 ms | 21.29 ms | 3 个引用/3 处编辑 |

两次运行的完整索引日志和 `Indexing PHP symbols` 进度均为 0。

独立 Symfony 插件同时启用时，从 `final class AdminSecuritySubscriber` 声明执行不含声明自身的 References：热 Reload 为 3.305 秒，2,261 个文件由摘要排除、10 个候选进入语义解析；结果精确包含 `config/symfony/services.yaml` 的 `App\\Bridge\\` resource 注册和类内 `KernelEvents::CONTROLLER` 订阅关系。约 1.8 秒候选扫描之后由独立 service/event Provider 建立框架关系，核心没有重新实现 Symfony 规则。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-3da60366/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `0c3bd35d0f2bc7cf59804bbb5c31377ee7ebd533140db82727543f092a67c148` |
| `php-companion-symfony-0.4.5.vsix` | `f46a32c565c164405544d19155b727e5c080715c3510aca68fcf16cf089eb5f4` |
| `php-companion-open-source-pack-0.4.5.vsix` | `218aa9f9401674f239f6a5608879897b6eb4a061f6e0f450261da47d405ae6ed` |
| `php-companion-recommended-pack-0.4.5.vsix` | `1a8be91b220356f2866d458bee5118a2b404120c07c20d8a20970ee4e28e68a3` |

核心与 Symfony VSIX 已通过 `code --install-extension ... --force` 安装到 WSL RockyLinux8。构建与安装目标的 `dist/language-server.js` SHA-256 均为 `9167a10991b03b8e2c9f7a464df936e0c259717850309599a212c75e978fc761`。Alpha Profile 需要执行 Reload Window 才会切换到该进程。
