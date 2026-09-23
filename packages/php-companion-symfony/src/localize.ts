import * as vscode from 'vscode';

const messages = {
  en: {
    requiresCore: 'SoPHP: Symfony requires sohophp.php-companion.',
    statusWithWinstar: 'SoPHP Symfony is active; services, events, controller contexts, static routes, and Winstar routes are registered.',
    statusWithoutWinstar: 'SoPHP Symfony is active; services, events, controller contexts, and static routes are registered, and Winstar runtime routes are disabled.',
  },
  zh: {
    requiresCore: 'SoPHP：Symfony 扩展需要 sohophp.php-companion。',
    statusWithWinstar: 'SoPHP Symfony 已启用；服务、事件、Controller 上下文、静态路由和 Winstar 路由均已注册。',
    statusWithoutWinstar: 'SoPHP Symfony 已启用；服务、事件、Controller 上下文和静态路由已注册，Winstar 运行时路由已关闭。',
  },
} as const;

export function t(key: keyof typeof messages.en): string {
  return vscode.env.language.toLowerCase().startsWith('zh') ? messages.zh[key] : messages.en[key];
}
