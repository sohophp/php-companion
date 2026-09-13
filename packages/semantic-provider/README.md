# @php-companion/semantic-provider

框架无关、可独立发布的 PHP Companion 语义事实提供器契约。提供器以一次完整快照提交方法、属性和“字面量参数决定返回类型”的事实；语义工作区按 `providerId` 原子替换或撤销快照，避免增量刷新期间混用新旧事实。

```ts
import { semanticFacts, type SemanticFactsContribution } from '@php-companion/semantic-provider';

const contribution: SemanticFactsContribution = semanticFacts('vendor.framework', 'config:42', {
  methods: [{ ownerFqcn: 'App\\Repository', name: 'find', returnType: 'App\\Entity|null', uri: 'file:///config', start: 0, end: 3 }],
});
```

契约只接受带来源位置的确定性事实。`complete: false` 只传达本次提供器输入不完整，不能作为“成员不存在”的依据。该包不依赖编辑器、解析器、框架运行时或语义实现。

独立进程 Provider 使用 `SEMANTIC_PROVIDER_PROTOCOL_VERSION`、`SemanticProviderRequest` 与 `SemanticProviderResponse`。进程从 stdin 读取一个 JSON 请求，并向 stdout 写出一个 JSON 响应；诊断文字应写到 stderr。响应必须原样返回请求 `id`，并以请求中的 generation 生成同身份完整快照。运行时校验器同时供 Provider 与宿主复用。
