# F14 Symfony 扩展激活错误本地化

日期：2026-09-23。独立 SoPHP Symfony 扩展在核心插件 API 版本不兼容时，激活异常现按 VS Code 界面语言显示，并保留收到的实际版本号。英文默认错误文本保持原样；缺少 Core 的提示和扩展状态文案已由此前的运行时本地化覆盖。

验证：Symfony 扩展 TypeScript 类型检查、4 项定向单元测试及相关 ESLint 通过。此次没有运行真实 VS Code 激活或打包 VSIX；F14 的旧 Profile 升级与完整交付验收仍开放。
