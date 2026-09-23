import type { DiagnosticLanguage } from './diagnosticMessages.js';

const messages = {
  configuredSource: ['configured', '配置的'],
  bundledSource: ['bundled', '内置的'],
  invalidSemanticProvider: ['Ignored invalid {0} semantic provider configuration.', '已忽略{0}语义 Provider 的无效配置。'],
  reservedSemanticProvider: ['Ignored {0} semantic provider {1}: the identity is reserved.', '已忽略{0}语义 Provider {1}：此标识已保留。'],
  duplicateSemanticProvider: ['Ignored duplicate {0} semantic provider {1}.', '已忽略{0}语义 Provider {1} 的重复配置。'],
  configuredSymfonyCapability: ['Ignored authoritative Symfony capability from configured provider {0}; only bundled integrations may replace core Symfony facts.', '已忽略配置的 Provider {0} 提供的权威 Symfony 能力；只有内置集成可替换核心 Symfony 事实。'],
  bundledSemanticIdentity: ['Ignored configured semantic provider {0}: the bundled identity is reserved.', '已忽略配置的语义 Provider {0}：内置标识已保留。'],
  invalidRouteProvider: ['Ignored invalid {0} route provider configuration.', '已忽略{0}路由 Provider 的无效配置。'],
  duplicateRouteProvider: ['Ignored duplicate {0} route provider {1}.', '已忽略{0}路由 Provider {1} 的重复配置。'],
  bundledRouteIdentity: ['Ignored configured route provider {0}: the bundled identity is reserved.', '已忽略配置的路由 Provider {0}：内置标识已保留。'],
  multipleContainerProviders: ['Multiple authoritative container providers were registered; Symfony container facts are unavailable.', '注册了多个权威容器 Provider；Symfony 容器事实暂不可用。'],
  containerSnapshotSkipped: ['Semantic provider {0} was skipped because its bounded project snapshot could not be completed; Symfony container facts are unavailable.', '语义 Provider {0} 的有界项目快照未能完成，已跳过；Symfony 容器事实暂不可用。'],
  containerSnapshotIncomplete: ['Semantic provider {0} returned no complete container snapshot; Symfony container facts are unavailable.', '语义 Provider {0} 未返回完整容器快照；Symfony 容器事实暂不可用。'],
  containerProviderFailed: ['Semantic provider {0} failed ({1}); Symfony container facts are unavailable: {2}', '语义 Provider {0} 失败（{1}）；Symfony 容器事实暂不可用：{2}'],
  multipleEventProviders: ['Multiple authoritative event providers were registered; Symfony event relations are unavailable.', '注册了多个权威事件 Provider；Symfony 事件关系暂不可用。'],
  eventSnapshotSkipped: ['Semantic provider {0} was skipped because its bounded project snapshot could not be completed; Symfony event relations are unavailable.', '语义 Provider {0} 的有界项目快照未能完成，已跳过；Symfony 事件关系暂不可用。'],
  eventSnapshotIncomplete: ['Semantic provider {0} returned no complete event snapshot; Symfony event relations are unavailable.', '语义 Provider {0} 未返回完整事件快照；Symfony 事件关系暂不可用。'],
  eventProviderFailed: ['Semantic provider {0} failed ({1}); Symfony event relations are unavailable: {2}', '语义 Provider {0} 失败（{1}）；Symfony 事件关系暂不可用：{2}'],
  multipleControllerProviders: ['Multiple authoritative controller-context providers were registered; controller contexts are unavailable.', '注册了多个权威 Controller 上下文 Provider；Controller 上下文暂不可用。'],
  semanticSnapshotSkipped: ['Semantic provider {0} was skipped because its bounded project snapshot could not be completed.', '语义 Provider {0} 的有界项目快照未能完成，已跳过。'],
  controllerSnapshotIncomplete: ['Semantic provider {0} returned no complete controller-context snapshot; controller contexts are unavailable.', '语义 Provider {0} 未返回完整 Controller 上下文快照；Controller 上下文暂不可用。'],
  controllerProviderFailed: ['Semantic provider {0} failed ({1}); controller contexts are unavailable: {2}', '语义 Provider {0} 失败（{1}）；Controller 上下文暂不可用：{2}'],
  genericProviderFailed: ['Semantic provider {0} failed ({1}); retained its previous facts: {2}', '语义 Provider {0} 失败（{1}）；已保留之前的事实：{2}'],
  routeProvidersConflict: ['Static Symfony routes are unavailable because multiple authoritative route providers are configured.', '配置了多个权威路由 Provider；静态 Symfony 路由暂不可用。'],
  routeSnapshotSkipped: ['Route provider {0} was skipped because open route document snapshots exceeded the bounded request.', '路由 Provider {0} 的打开文档快照超过有界请求上限，已跳过。'],
  routeProviderFailed: ['Route provider {0} failed ({1}); ignored this query: {2}', '路由 Provider {0} 失败（{1}）；已忽略本次查询：{2}'],
  routeAuthoritativeIncomplete: ['Authoritative route provider {0} returned an incomplete snapshot; ignored this query.', '权威路由 Provider {0} 返回不完整快照；已忽略本次查询。'],
  routeSnapshotIncomplete: ['Symfony routes are unavailable because a route provider returned an incomplete snapshot.', '路由 Provider 返回不完整快照；Symfony 路由暂不可用。'],
} as const;

export type OutputMessageKey = keyof typeof messages;

export function outputMessage(language: DiagnosticLanguage, key: OutputMessageKey, ...args: string[]): string {
  const template = messages[key][language === 'zh' ? 1 : 0];
  return args.reduce((value, argument, index) => value.replaceAll(`{${index}}`, argument), template);
}

export function outputProviderSource(language: DiagnosticLanguage, source: string): string {
  return source === 'configured' || source === 'bundled' ? outputMessage(language, source === 'configured' ? 'configuredSource' : 'bundledSource') : source;
}
