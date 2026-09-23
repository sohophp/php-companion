# F09 Symfony 服务导入完整性

日期：2026-09-23。独立服务 Provider 现在区分可省略的默认配置入口与配置文件中显式声明的导入。显式导入缺失、越出允许的项目/Bundle 根，或导入路径无法静态解释时，Provider 不再发布权威完整快照。YAML、XML 和 PHP Configurator 中的动态 `%...%` 导入由框架解析层标记不完整；已支持的字面量相对导入仍正常解析。PHP 静态数组服务配置此前已拒绝动态导入。

验证：Framework Symfony 全包 59 项测试、服务 Provider 9 项测试、两包类型检查、F09 服务/路由真实 stdio 定向回归及相关 ESLint 通过。当前 Winstar2024 `dev` 环境的只读 Provider 探针返回 `complete=true`、`inputEvidenceComplete=true`、4665 条服务事实和 90 个已尝试输入文件；探针使用空项目类型目录，因此不代表完整编辑器验收。

本轮只构建相关源码包进行验证，没有生成 VSIX。Bundle 变体、其他动态配置形态和实际 WSL Remote 编辑仍需在 F09 最终矩阵中继续核验。
