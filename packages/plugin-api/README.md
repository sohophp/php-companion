# @php-companion/plugin-api

PHP Companion 独立扩展的版本化接入契约。插件通过 VS Code 的扩展 API 激活核心扩展，再注册由自身安装目录提供的语义或路由 Provider；核心统一负责生命周期、冲突处理、进程边界和 Language Server 同步。

```ts
import type { PhpCompanionPluginApi } from '@php-companion/plugin-api';

const core = vscode.extensions.getExtension<PhpCompanionPluginApi>('sohophp.php-companion');
const api = await core?.activate();
const registration = api?.registerIntegration({
  integrationId: 'vendor.symfony',
  semanticProviders: [{ providerId: 'vendor.symfony.services', command: process.execPath, args: [providerPath],
    requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesContainerServices: true }],
  routeProviders: [{ providerId: 'vendor.symfony.routes', command: process.execPath, args: [routeProviderPath],
    cacheUntilInvalidated: true }],
});
context.subscriptions.push(registration!);
```

`integrationId` 和所有 Provider ID 必须有相同命名空间。重复 integration、无效命令、越界超时或输出预算会在启动进程前拒绝。只有已安装扩展通过 bundled integration 注册的 Provider 可以声明权威替换框架事实；用户设置中的命令仍可贡献普通语义事实。路由 Provider 只有显式声明 `cacheUntilInvalidated: true` 才允许核心复用完整快照，普通动态 Provider 仍逐次执行。registration 支持可选的原子 `update()`：新贡献必须通过完整校验并保持原 integration 身份，失败时旧 Provider 集继续有效。旧 plugin API v1 核心没有 `update()` 时，插件可回退为撤销后重注册。卸载或停用插件时释放 registration，核心会撤销对应外部语义事实并刷新开放文档。

API v1 还可选提供 `requestLanguageServer<T>(method, params)`，只接受 `phpCompanion/` 命名空间内的请求。独立扩展可据此注册自己拥有的 VS Code Definition、References、Completion 或 Rename Provider，同时复用核心 Language Server 生命周期；旧 API v1 核心没有该方法时，插件应保留兼容降级。插件仍不能直接取得 Language Client，也不能发送任意 LSP 通知。项目配置仍不能自动发现或执行 Provider；独立 VSIX 的显式安装和激活构成信任边界。
