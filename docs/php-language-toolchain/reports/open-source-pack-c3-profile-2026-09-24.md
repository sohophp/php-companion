# Open Source Pack 的 C3 源码组合复核

日期：2026-09-24。对象是独立临时 Composer 项目中的 SoPHP Core、SoPHP Symfony、Open Source Pack 源码及冻结 Profile 的 9 个外部成员。没有修改 Winstar 项目，也没有生成 VSIX。

## 结果

- 完整 11 项源码组合的既有格式化、导航、调试、测试门禁通过；C2 未保存标量切换 10 轮 P95 为 139 ms，联合形状反馈通过。宿主退出码为 0。
- 新增 `test:extension:c3:open-source-profile`，沿用 C3 宿主操作并检查 11 项成员及唯一通用 PHP Language Server。明确配置 `phpunit.xml` 仅收集 `tests/*Test.php` 后，Rename、Safe Move、导入、Extract 和撤销相关的现有 C3 门禁通过；宿主退出码为 0，未观察到目标路径 `C3GroupedType.php` 的未处理读取错误。
- 负例：不提供 `phpunit.xml` 时，同一完整 Pack 的 C3 Rename/Undo/Redo 会触发 6 次 `ENOENT`，路径是已移走的 `src/Service/C3GroupedType.php`，严格断言失败。堆栈指向冻结的 `recca0120.vscode-phpunit` 3.9.40 的 `parseFile`/`parseTests`/`change`。其源码在没有 PHPUnit 配置时默认扫描项目内 `.php` 文件；文件 watcher 发起异步解析但未处理该读取失败。

## 使用边界与下一步

日常项目应提供准确的 `phpunit.xml`/`phpunit.xml.dist` 测试套件目录。这样能让测试扩展只监视测试文件，也避免普通 `src` 类重构触发上述错误；仍不能推断“重命名测试文件”或没有配置的项目已安全。测试文件重命名、快速撤销/重做与无配置项目留在组合回归清单。SoPHP Core 的 C3 结果按独立宿主和已配置 Pack 宿主分别报告；不能把外部扩展的未处理异常算作 Core 重构本身通过或失败。

源码 Profile 验证不等于已安装候选、WSL Remote 或跨平台验收。Core 下一步优先完成高频 C3 编辑的完整预览与 Undo/Redo，尤其是生成文件的 Redo；C1/C2 长会话、C4 实际安装及运行位置随后按[核心计划](../future-core-plan.md)推进。
