import * as vscode from 'vscode';

const messages = {
  en: {
    requiresCore: 'SoPHP Symfony requires sohophp.php-companion.',
    unsupportedCoreApi: 'SoPHP plugin API {0} is not supported; expected version 1.',
    renameSourceChanged: 'A Symfony Rename source changed while edits were being prepared. Run Rename again.',
    statusWithWinstar: 'SoPHP Symfony is active; services, events, controller contexts, static routes, and Winstar routes are registered.',
    statusWithoutWinstar: 'SoPHP Symfony is active; services, events, controller contexts, and static routes are registered, and Winstar runtime routes are disabled.',
  },
  zh: {
    requiresCore: 'SoPHP：Symfony 扩展需要 sohophp.php-companion。',
    unsupportedCoreApi: '不支持 SoPHP 插件 API 版本 {0}；需要版本 1。',
    renameSourceChanged: '准备 Symfony 重命名时源文件已变化，请重新执行重命名。',
    statusWithWinstar: 'SoPHP Symfony 已启用；服务、事件、Controller 上下文、静态路由和 Winstar 路由均已注册。',
    statusWithoutWinstar: 'SoPHP Symfony 已启用；服务、事件、Controller 上下文和静态路由已注册，Winstar 运行时路由已关闭。',
  },
} as const;

export function t(key: keyof typeof messages.en, ...args: string[]): string {
  const template = vscode.env.language.toLowerCase().startsWith('zh') ? messages.zh[key] : messages.en[key];
  return template.replace(/\{(\d+)\}/g, (placeholder, index: string) => args[Number(index)] ?? placeholder);
}
