# C1 跨根内建声明导航

日期：2026-09-24。

## 问题与处理

两个 Composer 根分别使用 PHP 7.2 和 8.5 时，服务器按根选择内建声明，但 Definition 共用一个 `php-companion-builtin:/common-core.php` 虚拟 URI。VS Code 打开此 URI 时只能按当前全局设置重建内容，可能显示另一根的签名或错误行。

内建声明 URI 现在包含 PHP 目标版本和已禁用扩展集合。服务器在目标版本或扩展可用性变化时移除旧虚拟文档并装入新文档；内容 Provider 从 URI 还原同一份声明。旧无参数 URI 保留读取兼容。PHP 7.2 与 8.5 的 `sort` Definition 因而打开不同文档，分别显示 `bool` 与 `true` 返回类型。

## 验证与边界

- language-spec 单元测试 53/53，覆盖 URI 生成、解析、VS Code 查询编码与非法参数。
- language-server 全套 308 项通过、1 项跳过；TypeScript 类型检查、相关 ESLint 与差异格式检查通过。
- Open Source Pack manifest 测试 4/4，清单维持 Core、Symfony 加 8 个外部扩展。
- 隔离 VS Code Core 宿主 auto 双根通过：两个 Definition URI 不同且声明内容与各自 PHP 版本一致；切换第二根版本后，诊断和函数补全按新版本更新。
- VS Code 的文档词语建议可能返回同名普通文本候选。宿主断言以 `CompletionItemKind.Function` 识别 SoPHP 的函数补全，不把普通词语建议误判为旧语言服务结果。

这是自动化宿主证据；完整 Open Source Pack 组合、其它 Remote 环境及持续实际编码仍在后续门禁。此次源码增量没有生成 VSIX，也没有修改业务项目。
