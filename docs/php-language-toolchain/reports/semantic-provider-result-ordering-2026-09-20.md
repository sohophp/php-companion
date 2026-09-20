# Symfony 语义 Provider 乱序提交防护

日期：2026-09-20

功能提交：`11c3f7980567f5ebfceab171da9c4ea82690f4ce`

## 问题

保存、连续输入、watcher 更新和按需查询可能同时启动多个独立 Symfony Provider 进程。普通文档编辑不会改变完整索引 generation；如果旧请求运行较慢，它可能在新请求之后完成，并把旧的容器服务、事件关系或 Controller/Twig 上下文重新写回，甚至在失败路径清除新结果。

## 实现边界

- 容器与事件 Provider 按 Composer 根和能力通道分配单调请求版本；只有当前版本能够提交或清除该能力的权威事实。
- 事件 Provider 在依赖类型 hydration 后再次检查版本，已被替代时不会继续启动外部进程。
- Controller 上下文按 PHP 文档记录版本。同一文件的旧结果会被拒绝，不同文件的并发请求互不取消。
- watcher 批量请求部分过期时，只跳过被更新文件，其余文件的当前结果仍会提交。
- 完整 Controller 快照若在执行期间出现新的文档级刷新，则不覆盖该较新状态。
- Provider 注册变化会使所有在途请求失效，防止旧 Provider 在重新配置后写回。
- 本次只收紧提交顺序，不改变 Provider 协议、Symfony 能力所有权或通用 PHP 类型系统。

## 精准回归

新增 stdio 生命周期测试使用真实隔离 Node Provider 进程：

1. 打开同一 Controller，Provider 收到 `slow.html.twig` 后延迟 300ms。
2. 确认旧请求已经启动，再发送版本更高的 `fast.html.twig`，该请求只延迟 10ms。
3. 等待两个进程都返回，查询 `phpCompanion/interop/contexts`。
4. 结果唯一为 `fast.html.twig`，证明最后完成的旧进程不能覆盖新上下文。

完整 Language Server 测试为 5 个测试文件、194 项全部通过。

## 验证

- Language Server build、TypeScript typecheck 和相关 ESLint 通过。
- 24 个 monorepo 组件从真实 tarball 在仓库外安装运行通过。
- 四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 在隔离 Profile 同时加载核心与独立 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过；JSON 报告为 `alpha-preflight-winstar-semantic-provider-ordering.json` 和 `alpha-preflight-corerepo-semantic-provider-ordering.json`。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-11c3f798/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `b59ef528fb296560310bfdfa7b31086f715943db3195006534463d6a5e9301db` |
| `php-companion-symfony-0.4.5.vsix` | `33a4409979e58ca0ac592a92df7d856701b6e70e443cdb0f6361f93545b9d706` |
| `php-companion-open-source-pack-0.4.5.vsix` | `ef81edb5d92907531f3b164c1a899a0099ef0f6930949b252eb2b0236204ff40` |
| `php-companion-recommended-pack-0.4.5.vsix` | `2dddc021aeeb20e81445c68cec99b55be1ce6d5e481fba4c704ea45b5dc03949` |

核心和独立 Symfony 候选已覆盖安装到 WSL RockyLinux8。构建与安装目录中的 `dist/language-server.js` SHA-256 均为 `bcb4fd798b500d2992ad7510e63a1954dd1c3d4e3fd384366b1bd6e7eb2452e1`，Controller Context Provider 均为 `9704dcee728fa7030e21572ea10460af2bb977f9e1816ede73d5a35257240f68`；语言服务器已由 Extension Host 自动启动新进程。

两小时真实编辑会话仍属于 Alpha 人工验收，不由自动化结果替代。
