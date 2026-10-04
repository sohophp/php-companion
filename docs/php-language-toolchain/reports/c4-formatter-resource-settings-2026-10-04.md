# C4：格式化候选的多根 Workspace 配置隔离

日期：2026-10-04。继续源码路线图；未打包、更新用户 Profile、推送或发布。外部格式化所有者仍为 junstyle.php-cs-fixer，Core 不增加格式化器。

## 缺口与修复

锁定的 0.3.21 上游 bundle 在激活时调用不带 URI 的 getConfiguration，后续请求共享该配置对象。文件夹级 executablePath、config 和 PHP validate.executablePath 因此不能按当前文档读取。新增精确提取该 bundle 类的边界回归，原版返回 /WRONG/php，失败日志保留在 `/tmp/sophp-formatter-resource-red.log`。

开发候选准备脚本现在为请求建立独立配置快照，按当前 URI 读取 formatter、PHP、editor 和 HTML 配置。覆盖文档／范围格式化、format／fix／diff、排除项及自动修复入口；保存和自动修复事件的开关也按文档读取。异步 CLI 请求不修改激活单例，避免两个文件夹互相覆盖工具与临时目录。扩展注册和下载配置继续保持原来全局语义。

首次真实宿主发现另一个前置条件：上游配置未声明 resource scope，VS Code 拒绝写入文件夹配置。失败 `/tmp/sophp-formatter-resource-host.log` 保留。候选只为已列出的 13 个格式化设置补充 resource scope，保持扩展许可证和原始缓存不变。provider 注册及 lastDownload 的作用域未改。

原有成功但无变更的 stderr 处理分支保持；边界回归增加 informational stderr 接受、lint 错误与无效 JSON 拒绝。

## 验证

- 原始 index.js SHA-256：`0d94dba0ab92cfcee26a4fdbc49ef9da81289ee4124395940b1a3c76deeaa243`。新候选 index.js：`f19592bc739d3e8804f26de43417e3bf21a48d55f3d0c690de69c6f2b2418cf6`。manifest 的 resource scope 在生成材料和宿主语料中另作断言，bundle 哈希不代表 manifest 内容。
- 精确类边界测试通过两个文件夹的独立 PHP／PHAR／config／tmpDir／cwd，以及并发请求倒序完成；日志 `/tmp/sophp-formatter-resource-boundary-final.log`。VS Code 与 CLI 边界为 mock，不计真实编辑器或实际 CLI 验收。
- 实际 PHP 8.5.9 + PHP CS Fixer 3.95.27，Linux VS Code 1.140.0 隔离源码 Profile，扩展宿主 Node 24.21.0。定向宿主退出 0，日志 `/tmp/sophp-formatter-resource-host-verified.log`。
- 宿主从启动即打开两个独立 Composer 文件夹。第一个使用 PSR-12 空格缩进；第二个使用另一个绝对 config 路径与 Tab 缩进，通过含空格的可执行代理调用真实同一 CLI，代理轨迹确认实际运行。并发请求的两份编辑结果分别匹配预期。第一个项目原有 Format Document、一次 Undo／Redo、Format on Save、磁盘一致性及幂等检查继续通过。
- 中间一轮 `/tmp/sophp-formatter-resource-host-final.log` 失败于语料断言：第一个文件已格式化，VS Code 对零编辑结果返回 undefined，语料错误地要求非空。将第一个文档重新置为未格式化后再同时请求，两份结果都需要实际编辑；未改变产品逻辑来绕过失败。
- TypeScript 宿主编译、两个修改的宿主文件 ESLint、脚本语法、manifest scope 和 diff 检查通过。通过宿主后新增的 scope 断言已编译，并对同一生成材料单独执行；未为该断言再次启动宿主。

## 尚未关闭

最初双项目真实宿主只证明两个配置路径与实际执行选择；随后下述不同 PHP 运行程序补充已通过。Windows 路径、真实 WSL 窗口、自动修复事件 UI、长会话和错误通知仍需对应验收。先前 Windows no-change 错误处理证据属于旧候选哈希，本次不宣称已对新候选重跑 Windows。

本修补仍为可选开发候选，默认已安装 Profile 未变化。C4 整体资格和独立的 VS Code 批量输入异常保持未完成。

## 补充：两个真实 PHP 运行程序

宿主语料新增可选的 PHP_COMPANION_TEST_FORMATTER_SECOND_PHP。仅 formatter-only 隔离门禁把该运行程序与锁定 CLI 路径送入测试；未新增产品设置。两个项目各自设置 php.validate.executablePath，通过含空格的运行程序代理分别调用真实 PHP。每个项目使用一个 `.phar` 后缀的 PHP launcher，加载锁定的 Composer CLI，以覆盖上游按 `.phar` 后缀选择 PHP 程序的分支；这个 launcher 不是实际打包的 PHAR 分发物。

两份 config 分别把实际执行中的 PHP_VERSION 写入独立临时文件，再返回空格／Tab 格式化配置。断言同时核对精确格式化文本和实际版本，版本必须逐项等于直接执行各自配置 PHP 程序取得的 PHP_VERSION，并且两个版本不同。第二个独立 Composer 项目的最低 PHP 版本也按指定运行程序生成，避免项目要求与运行程序矛盾。

最终 Linux VS Code 1.140.0／Node 24.21.0 定向宿主退出 0，日志 `/tmp/sophp-formatter-runtime-host-final.log`：两个并发请求实际记录 **8.5.9／8.4.23**，各自配置与格式化结果一致。候选 bundle 哈希保持 `f19592bc739d3e8804f26de43417e3bf21a48d55f3d0c690de69c6f2b2418cf6`；此前 Format Document、保存格式化、Undo／Redo、幂等和 manifest resource scope 断言继续通过。初次验证 `/tmp/sophp-formatter-runtime-host.log` 也通过，但第二个 fixture 当时仍声明 PHP >=8.5；它只作为运行程序选择的初步证据，最终门禁使用已校正 Composer 的 fixture。

宿主 TypeScript 编译、两个修改的宿主文件 ESLint 与 diff 检查通过。此补充关闭的是 Linux 隔离宿主的 PHP 8.4／8.5 双项目运行程序选择，没有关闭其他 PHP 版本、实际 PHAR 分发物、Windows／Remote、真实 WSL 或整个 C4。
