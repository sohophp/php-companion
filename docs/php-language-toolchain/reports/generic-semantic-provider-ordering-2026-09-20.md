# 通用语义 Provider 乱序提交防护

日期：2026-09-20

功能提交：`9335a83cdd1c35e339da74be6c78f12c450e5022`

## 问题与实现

PHP Companion 的组件协议允许独立扩展通过隔离进程贡献方法、属性和字面量方法返回事实。配置快照连续变化时，两个相同 Provider 请求可以并发；旧请求若最后完成，会用旧事实替换新事实。

Language Server 现在为每个 Composer 根、每个大小写归一化 Provider ID 分配单调请求版本。外部进程返回后必须同时满足调用方取消门禁和最新版本门禁，才允许执行 `replaceExternalFacts()`。Provider 注册变化还会递增所有现存版本，使旧注册启动的在途进程不能在新注册生效后提交。

Symfony 容器、事件和 Controller 上下文继续使用各自更严格的权威通道版本；本次覆盖的是可独立发布的通用语义组件。

## 精准回归

真实 stdio 测试注册 `vendor.ordered` Provider，并连续推送两份框架 YAML 快照：

- `slow` 请求先启动并延迟 300ms，返回 `methodSlow`。
- 确认旧进程已启动后推送 `fast`，延迟 10ms，返回 `methodFast`。
- 等待旧请求最后结束后查询 `$service->met` 补全。
- 结果包含 `methodFast`，且不包含 `methodSlow` 或初始 `methodInitial`。

## 验证

- Language Server 5 个测试文件、195 项全部通过。
- Language Server TypeScript 与相关 ESLint 通过。
- 24 个 monorepo 组件真实 tarball 隔离消费通过。
- 四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 同时加载核心与独立 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过；对应 JSON 报告已随本提交保存。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-9335a83c/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `6d443b006feef6437ce71dae7b7cc73db44b9001c3962804bf2cacfbca1a8201` |
| `php-companion-symfony-0.4.5.vsix` | `0007c26202ffa83b73e8b1ac27d35f34e41fc45975b50bd1fc113d64b1b23a45` |
| `php-companion-open-source-pack-0.4.5.vsix` | `638dafd0e0d19a95f4c83f82e85cfebafa7adfd47f39e932b974eed38cf2d0e4` |
| `php-companion-recommended-pack-0.4.5.vsix` | `2cd670a22d959f177b9f199ca69c0ccc16d81775daa22e8c6663c40716cf9cb3` |

核心和独立 Symfony 候选已覆盖安装到 WSL RockyLinux8。构建与安装目录中的 `dist/language-server.js` SHA-256 均为 `b0ee44f2822231e07a7a40d9fc1d72bea19bcf15d645f9aa520727a420aad92a`；Extension Host 已自动启动新语言服务器进程。
