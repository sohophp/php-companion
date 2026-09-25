import type { DiagnosticLanguage } from './diagnosticMessages.js';

const messages = {
  typeQueryCancelled: ['Type query cancelled.', '类型查询已取消。'],
  serviceReferencesCancelled: ['Symfony service reference search cancelled.', 'Symfony 服务引用搜索已取消。'],
  controllerContextCancelled: ['Symfony controller context search cancelled.', 'Symfony Controller 上下文搜索已取消。'],
  typeHydrationBound: ['PHP type hydration exceeded its lookup bound; References are incomplete.', 'PHP 类型加载超过查询上限；引用结果不完整。'],
  referencesCancelled: ['Reference query cancelled.', '引用查询已取消。'],
  controllerNavigationCancelled: ['Symfony controller navigation cancelled.', 'Symfony Controller 导航已取消。'],
  serviceCompletionCancelled: ['Symfony service completion cancelled.', 'Symfony 服务补全已取消。'],
  documentChangedReferences: ['Document changed during reference query.', '引用查询期间文档已更改。'],
  routeReferencesCancelled: ['Route reference query cancelled.', '路由引用查询已取消。'],
  projectIndexIncomplete: ['Project index incomplete; this is not a zero-reference result.', '项目索引不完整；不能将此结果视为零处引用。'],
  implementationIndexIncomplete: ['Implementation search incomplete; some project or installed dependency sources were not scanned. Check SoPHP output and indexing settings.', '实现查找未完成：部分项目或已安装依赖源码未被扫描。请检查 SoPHP 输出与索引设置。'],
  routeDocumentChanged: ['Document changed during route reference query.', '路由引用查询期间文档已更改。'],
  referenceReceiverIncomplete: ['Reference receiver closure is incomplete; this is not a zero-reference result.', '引用接收者集合不完整；不能将此结果视为零处引用。'],
  referenceReceiverBound: ['Reference receiver closure exceeded its bound; this is not a zero-reference result.', '引用接收者集合超过上限；不能将此结果视为零处引用。'],
  routeDocumentsChanged: ['Route documents changed during reference query.', '引用查询期间路由文档已更改。'],
  referenceInputsChanged: ['Reference inputs changed during query.', '查询期间引用输入已更改。'],
  referencesUnavailable: ['PHP references are unavailable: the project index is incomplete or disabled. See SoPHP output.', 'PHP 引用暂不可用：项目索引不完整或已禁用。请查看 SoPHP 输出。'],
} as const;

export type ProtocolMessageKey = keyof typeof messages;

export function protocolMessage(language: DiagnosticLanguage, key: ProtocolMessageKey): string {
  return messages[key][language === 'zh' ? 1 : 0];
}
