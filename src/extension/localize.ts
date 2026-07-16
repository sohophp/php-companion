import * as vscode from 'vscode';

const messages = {
  en: {
    auto: 'Auto',
    redetect: 'Re-detect PHP versions',
    settings: 'Open workspace settings',
    detectedFrom: 'Detected from {0}',
    noWorkspace: 'Open a workspace folder to use PHP Companion.',
    indexed: 'Indexed {0} PHP files.',
    renamePrompt: 'New name for {0}',
    renameFailed: 'PHP Companion rename failed: {0}',
    invalidName: 'Enter a valid PHP class-like name.',
    conflict: 'The target file already exists: {0}',
    duplicate: 'Cannot safely rename duplicate symbol: {0}',
    syntaxError: 'Cannot safely rename because a related PHP file contains syntax errors: {0}',
    pasteImports: 'Paste with PHP imports',
    reportTitle: 'PHP Companion Compatibility Report',
  },
  zh: {
    auto: '自动检测',
    redetect: '重新检测 PHP 版本',
    settings: '打开工作区设置',
    detectedFrom: '检测来源：{0}',
    noWorkspace: '请先打开工作区目录再使用 PHP Companion。',
    indexed: '已索引 {0} 个 PHP 文件。',
    renamePrompt: '输入 {0} 的新名称',
    renameFailed: 'PHP Companion 重命名失败：{0}',
    invalidName: '请输入有效的 PHP 类名称。',
    conflict: '目标文件已经存在：{0}',
    duplicate: '存在重复符号，无法安全重命名：{0}',
    syntaxError: '相关 PHP 文件包含语法错误，无法安全重命名：{0}',
    pasteImports: '粘贴并添加 PHP import',
    reportTitle: 'PHP Companion 兼容性报告',
  },
} as const;

type MessageKey = keyof typeof messages.en;

export function t(key: MessageKey, ...args: string[]): string {
  const language = vscode.env.language.toLowerCase().startsWith('zh') ? messages.zh : messages.en;
  return args.reduce((value, argument, index) => value.replace(`{${index}}`, argument), language[key] as string);
}
