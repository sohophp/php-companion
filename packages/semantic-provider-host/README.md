# @php-companion/semantic-provider-host

为用户显式配置的 PHP Companion 语义 Provider 提供一次一进程的 JSON 协议主机。主机限制运行时间和标准输出，仅在完整响应通过 schema、请求 ID、`providerId` 与 generation 校验后返回快照。它隔离崩溃和失败，但不是操作系统安全沙箱；只应配置可信可执行文件。

```ts
import { runSemanticProvider } from '@php-companion/semantic-provider-host';

const result = await runSemanticProvider(
  { providerId: 'vendor.framework', command: '/opt/vendor-provider', args: ['--stdio'], timeoutMs: 5000 },
  { rootUri: 'file:///workspace', rootPath: '/workspace', generation: '42', phpVersion: '8.5' },
);
if (result.ok) semanticWorkspace.replaceExternalFacts(result.contribution);
```

宿主使用 `spawn` 且关闭 shell，每次请求后进程退出。默认超时 5 秒、stdout 上限 4 MiB、stderr 诊断最多保留 8 KiB。调用方只应在 `ok: true` 时提交；失败时保留旧快照。成功的空完整快照会清空该 Provider 的旧事实。
