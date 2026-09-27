# C3 新目录生成的可重做暂存移动

日期：2026-09-27。仅修改 SoPHP 隔离工作树和独立 Composer/VS Code 夹具；未修改 Winstar 或重新打包 VSIX。

## 问题与修复

生成类、接口或测试文件时，目标 PSR-4 子目录可能尚不存在。系统临时目录移动失败后，工作区同级目录也可能不可写。原第三条暂存路径只在目标目录已存在时尝试，因此这类情况直接进入 WorkspaceEdit.createFile；在已测 VS Code 中，最终创建路径的一次 Undo 会删除文件，Redo 却不恢复它。

新增 C3 宿主用例先强制前两条移动失败，在不存在的目标目录生成类，并要求第三条移动从最近已存在的目标父目录暂存。修复前该断言失败；修复后仅在工作区根内向上寻找第一个已存在的目录，将隐藏的非 PHP 暂存文件放在那里，再以单次 WorkspaceEdit.renameFile 移入目标。不存在的目标子目录仍由资源编辑创建；暂存文件的独占创建和失败清理规则保持不变。

## 验证与限制

- VS Code 1.139.1 Linux x64 隔离 C3 源码宿主：生成后 Undo 删除目标并恢复暂存文件，Redo 恢复 PHP 文件并移走暂存文件；退出码 0，日志 /tmp/sophp-c3-missing-ancestor-green-20260927.log。
- 完整 10 项 Open Source Pack 的定向 C3 源码宿主再次通过同一 Undo/Redo，并强制第三条移动失败，核对最终创建兜底的完整 PHP 内容和被拒绝暂存文件的清理；退出码 0，日志 /tmp/sophp-c3-missing-ancestor-pack10-final-20260927.log。
- 同一 10 项 Pack 的完整 C3 源码宿主还完成类型生成及其它预览、Rename、Safe Move、Extract 等既有操作链，退出码 0，日志 /tmp/sophp-c3-missing-ancestor-full-pack10-20260927.log。这一次通过不排除此前记录的偶发 Canceled。
- 根扩展及测试入口 TypeScript、相关 ESLint 与差异检查通过。

成功移动后若用户执行 Undo 而不执行 Redo，隐藏暂存文件仍须保留供撤销栈恢复。所有移动都失败、非 file URI 或工作区根不可写时仍可落到 createFile；其一次 Redo 缺口没有关闭。真实 WSL Remote、其它平台和已安装候选仍待 C4 验收。
