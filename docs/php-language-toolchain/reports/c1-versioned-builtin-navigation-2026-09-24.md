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

## 2026-10-01：运行时事实较多时的 URI 往返

`phpstorm-stubs` 接入更多按运行时选择的声明后，C1 双根宿主发现 `sort` 的内置定义文档为空。失败 URI 约 40 KB：VS Code 对 LSP URI 的查询串解码一次再序列化，原先按原始字符串比较的解析器因此拒绝了内容相同的快照。现按解析后的规范化参数比较，仍拒绝多余、重复或无效参数。

失败 URI 本身已复核：能够还原 PHP 8.5 快照，并生成含 `function sort(array &$array, int $flags = 0): true` 的文档。language-spec 120 项测试、C1 隔离宿主完整编辑工作流和 C2 隔离宿主回归均通过。实际 WSL 窗口仍需在候选验收时确认；未打包或更新 Profile。

同轮复核 Winstar 所需的 23 个上游扩展目录：PHP 8.5 函数名审计的未分类项和本机运行时未覆盖项均为 0。唯一新增分类是 `read_exif_data`，它在本机 PHP 7.2／7.4 存在、PHP 8.1–8.5 不存在；SoPHP 原有声明已按此边界生成。
