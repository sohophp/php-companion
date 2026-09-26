# C3 Symfony Rename 只检查受影响文档的版本

日期：2026-09-27。SoPHP 隔离源码分支；未修改业务项目，未打包 VSIX。

Symfony 跨 YAML/XML/PHP Rename 在收到服务端编辑后，原先会要求查询开始时所有已打开文档的版本都不变。无关文档中的输入也会让 Rename 返回失败。现在只对本次 `WorkspaceEdit` 将修改的文档检查打开缓冲区版本；这些文档仍须通过现有的来源文本摘要、磁盘摘要和未保存磁盘快照验证。关闭了原先打开的受影响文档，或改变任何受影响文档，仍会拒绝旧编辑。

完整 10 项 Open Source Pack 的源码 C3 宿主暂停 Symfony 服务 Rename，在无关且已打开的 PHP 文档中插入未保存文本后释放查询；返回的编辑仍包含关闭状态的 XML 引用。现有关闭 XML 外部改写及未保存 XML 背后磁盘改写的拒绝测试继续通过，宿主退出码 0；日志 `/tmp/sophp-c3-rename-affected-sources-20260927.log`。Symfony 扩展的 10 项单元测试、扩展和宿主测试 TypeScript、相关 ESLint、差异检查通过。

复核时把受影响文档的版本判断保留在全部异步磁盘读取之后，以防读取期间发生修改。改动后的完整 10 项 Pack C3 宿主再次退出码 0，包含无关编辑可继续 Rename、关闭 XML 外部改写拒绝及未保存 XML 背后磁盘改写拒绝；日志 `/tmp/sophp-c3-rename-affected-final-pack10-20260927.log`。TypeScript、ESLint、10 项 Symfony 单元测试及差异检查再次通过。

这修正了明确的无关文档误拒绝，不能据此归因或关闭此前偶发的 VS Code `Canceled`；类型生成最终 `createFile` 路径的标准 Redo 缺口也仍开放。真实 WSL Remote 和安装后的 VSIX 未在本轮验证。
