import type { DiagnosticLanguage } from './diagnosticMessages.js';

const messages = {
  prepareReferences: ['Preparing PHP references', '准备 PHP 引用'],
  indexSymbols: ['Indexing PHP symbols', '索引 PHP 符号'],
  discoverProjects: ['Discovering Composer projects', '发现 Composer 项目'],
  indexRoot: ['Indexing {0}', '正在索引 {0}'],
  indexState: ['{0}: {1}/{2} files, {3} cached', '{0}：{1}/{2} 个文件，{3} 个已缓存'],
  projectPhase: ['project', '项目源码'],
  dependenciesPhase: ['dependencies', '依赖'],
  indexReady: ['PHP symbol index ready', 'PHP 符号索引已就绪'],
  prepareQuery: ['Preparing PHP symbol query', '准备 PHP 符号查询'],
  findCandidates: ['Finding candidate files', '查找候选文件'],
  fileCount: ['{0}/{1} files', '{0}/{1} 个文件'],
  findServiceReferences: ['Finding Symfony service references', '查找 Symfony 服务引用'],
  scanServiceUsages: ['Scanning project PHP service usages', '扫描项目 PHP 服务用法'],
  findControllerContexts: ['Finding Symfony controller contexts', '查找 Symfony Controller 上下文'],
  scanControllerContexts: ['Scanning controller template contexts', '扫描 Controller 模板上下文'],
} as const;

export type ProgressMessageKey = keyof typeof messages;

export function progressMessage(language: DiagnosticLanguage, key: ProgressMessageKey, ...args: string[]): string {
  const template = messages[key][language === 'zh' ? 1 : 0];
  return args.reduce((value, argument, index) => value.replaceAll(`{${index}}`, argument), template);
}
