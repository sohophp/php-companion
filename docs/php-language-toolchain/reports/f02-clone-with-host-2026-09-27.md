# F02 clone-with 的编辑器 Problems 复核

日期：2026-09-27。使用隔离 VS Code 1.139.1 Linux x64 源码宿主、独立多根 Composer 夹具；未修改业务项目或重新打包 VSIX。

在 C1 宿主中打开包含 PHP 8.5 `clone(new C1CloneWith(), ['name' => strtoupper('b')],)` 的文件，读取编辑器 Problems。PHP 7.2、8.4 目标均显示 SoPHP 的 clone-with 版本诊断，8.5 不显示；三者均没有 SoPHP `php.syntax`。将覆盖值删成不完整输入后，SoPHP 语法诊断出现；执行一次编辑器 Undo 后撤回。三个完整 Core C1 宿主均退出码 0，且原补全、Hover、参数提示、定义、实现、引用、未保存类型切换、vendor 与多根链继续通过。日志：`/tmp/sophp-c1-clone-with-host-72-20260927.log`、`/tmp/sophp-c1-clone-with-host-84-20260927.log`、`/tmp/sophp-c1-clone-with-host-85-20260927.log`。

同一 PHP 8.5 场景在完整 10 项 Open Source Pack 源码 Profile 通过，日志 `/tmp/sophp-c1-clone-with-pack10-85-20260927.log`。外部成员来自固定隔离目录，Core、Symfony、Pack 与 TwigPlus 从源码加载；这证明本机源码组合的 Provider 路径，不代表已安装 VSIX、真实 WSL Remote 或其它平台。

另核对 VS Code 内建 PHP 校验：本机 PATH 默认 PHP 为 7.2。只在第一个根目录的文件夹设置中写 `php.validate.executablePath=/usr/bin/php85` 时，VS Code 内建校验仍对合法 8.5 clone-with 报 `syntax error, unexpected ','`，尽管按该文件读取配置显示 8.5 路径。检查 VS Code 1.139.1 随附 PHP 扩展实现，内建校验从无资源参数的工作区配置读取可执行路径。将 8.5 路径写入 `.code-workspace` 的工作区级 `settings` 后，完整 10 项 Profile 中合法输入没有该语法错误，原 C1 链仍通过；日志 `/tmp/sophp-c1-clone-with-pack10-85-aligned-cli-20260927.log`。多根混合 PHP 版本无法由这个单一内建 CLI 同时准确校验，使用说明已明确要求分开工作区验证。

以上宿主新增测试入口的 TypeScript 编译与 ESLint、差异检查通过。已冻结的 `248ee1f8` VSIX 不包含上一轮 clone-with 源码修复或这次宿主测试；R4 保持开放。
