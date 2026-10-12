# @php-companion/semantic-provider-host

为用户显式配置的 SoPHP 语义 Provider 提供一次一进程的 JSON 协议主机。主机限制运行时间和标准输出，仅在完整响应通过 schema、请求 ID、`providerId` 与 generation 校验后返回快照。它隔离崩溃和失败，但不是操作系统安全沙箱；只应配置可信可执行文件。

```ts
import { runSemanticProvider } from '@php-companion/semantic-provider-host';

const result = await runSemanticProvider(
  { providerId: 'vendor.framework', command: '/opt/vendor-provider', args: ['--stdio'], timeoutMs: 5000, requiresProjectTypes: true },
  { rootUri: 'file:///workspace', rootPath: '/workspace', generation: '42', phpVersion: '8.5', environment: 'dev', projectTypes: [] },
);
if (result.ok) semanticWorkspace.replaceExternalFacts(result.contribution);
```

宿主使用 `spawn` 且关闭 shell，每次请求后进程退出。默认超时 5 秒、stdout 上限 4 MiB、stderr 诊断最多保留 8 KiB。调用方只应在 `ok: true` 时提交；失败时保留旧快照。成功的空完整快照会清空该 Provider 的旧事实。

第三个参数可传入 `{ signal: controller.signal }`。请求有效但信号已取消时，主机返回 `code: 'cancelled'`，不启动进程；运行中取消则终止直接启动的 Provider，并等待进程关闭后返回失败。成功响应已经返回后，再取消信号不会改变该响应。

取消、超时和 stdout 超限时先发送 `SIGTERM`，25 ms 后仍未退出则发送 `SIGKILL`。失败返回前回收直接进程；Provider 自行创建的后代进程不在本接口的终止范围内。

对于 schema、请求 ID、Provider 身份和 generation 均匹配、但 `complete: false` 的容器响应，失败结果可携带 `containerInputEvidence`（读取 URI、配置 URI、输入证据完整性）。它只供缓存输入校验使用，不包含可提交的语义贡献。`complete` 在此描述输入证据，不代表服务事实完整；身份不匹配、无效协议、超时或崩溃均不提供该证据。调用方还须检查请求是否仍为当前请求，并保留证据中的缺失文件路径。
