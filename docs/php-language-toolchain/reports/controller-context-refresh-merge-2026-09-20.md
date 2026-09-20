# Controller 上下文完整与局部刷新合并

日期：2026-09-20

功能提交：`d76c25fff126a39db01c39a258b6e319fe13e734`

## 问题

完整 Controller/Twig 上下文 Provider 运行期间，用户可能继续编辑其中一个 Controller，从而启动更快的文档级刷新。此前为了防止旧结果覆盖新结果，只要任一文档发生变化就丢弃整份完整结果。这保护了被编辑文件，却也让其他未编辑 Controller 无法取得该次完整刷新。

## 实现

- 完整请求记录启动时每个已刷新 PHP URI 的版本。
- 返回时计算执行期间发生新局部刷新的 URI，只过滤这些文件对应的旧上下文。
- 未变化文件继续通过源码范围门禁，并作为同一完整快照提交。
- 已变化文件从现有上下文表保留较新的局部结果；局部请求仍逐 URI 判断是否为最新版本。
- 完整 Provider 失败或输出无效时，只清理仍由该请求拥有的文件，保留执行期间已取得新结果的 URI。
- 更晚启动的完整请求仍会整体取代更早完整请求，Provider 注册变化也继续使旧请求失效。

## 精准回归

真实 stdio 测试建立 `FirstController` 与 `SecondController`：

1. 初始完整快照建立两个 Controller 上下文。
2. 框架快照变化启动延迟 300ms 的完整刷新，输出 `full-first.html.twig` 与 `full-second.html.twig`。
3. 确认完整进程已启动后，打开第一个 Controller 的新版本，10ms 局部刷新输出 `fast-first.html.twig`。
4. 等待两个进程全部结束，最终上下文恰好为 `fast-first.html.twig` 和 `full-second.html.twig`。

这同时证明被编辑文件不回退，且未编辑文件不会因另一文件变化而丢失完整刷新。

## 验证与候选

- Language Server 5 个测试文件、196 项全部通过。
- TypeScript、相关 ESLint、24 个隔离 tarball 和四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 同时加载核心与独立 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过。

候选目录：`artifacts/php-companion-alpha-0.4.5-d76c25ff/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `0e2e9356cea2f5d70440454a673fe34797844fccb3043418b193e8e1410d5c37` |
| `php-companion-symfony-0.4.5.vsix` | `bb1886d3ca9537fad3f0b7ab47a16d90f7c25a8d9ea299c0c5cacaec24fde6fb` |
| `php-companion-open-source-pack-0.4.5.vsix` | `0edc38c7d8edb862b105974559cbc68aecafefe941abe437af52c64297418d2f` |
| `php-companion-recommended-pack-0.4.5.vsix` | `59ac8ffd57eb064d11a7ca5b77efe60490b03d9417d62bb0d173ea23df443b1b` |

核心和 Symfony 候选已覆盖安装到 WSL RockyLinux8。构建与安装目录中的 `dist/language-server.js` SHA-256 均为 `7b1bcb61524f9a2484242a3fcb5f26f381c243e767fdae290b1eda4488a577b3`；Extension Host 已启动新语言服务器进程。
