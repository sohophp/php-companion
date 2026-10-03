# P7 / C3 接口提取：晚期静态返回契约

日期：2026-10-02。原 extractInterface 一律拒绝 static 类型；现在只允许目标 PHP 8 且位于原生方法返回类型中的合法 static，原样保留其晚期绑定语义，不替换成具体类或新接口。self 和可解析 parent 继续改写为原声明身份。PHP 7、未知目标、static 参数、static 常量默认值和含 static 的交叉类型仍拒绝。语言服务器将当前文档目标 PHP 版本传入语义提取。

[PHP 官方类型声明](https://www.php.net/manual/en/language.types.declarations.php)说明 static 自 8.0 起只用于返回类型，不能用于交叉类型；实际生成和子类行为另由运行时验证。

## 当前验证

- 两项定向语义测试通过，493 跳过：原提取的 self/parent/import/名称冲突保护，以及普通、nullable、union、abstract 和静态工厂返回，字符串 static 不改写；非法上下文、PHP 7 和未知目标拒绝。
- 三项真实 LSP 用例通过，434 跳过：PHP 7.2／8.0／8.5 的实际 PSR-4 项目，在未保存 static → self → static 变化中检查版本门槛、生成签名、createFile、原文件版本及磁盘不变。
- 实际 PHP 8.1.34 和 8.5.9 编译并运行生成接口及改写类，子类实现、nullable／union fluent 返回与静态工厂均保持 ChildBuilder 身份；接口反射返回类型仍为 static。
- 当前重建 Core 的 Linux 隔离 VS Code 1.140.0 宿主实际应用预览计划，Undo 恢复原类并删除新文件，Redo 同时恢复类和接口；退出 0。
- 语义和语言服务器构建、宿主 TypeScript、涉及源码 ESLint 通过；未知目标保护加入后重新运行定向语义、LSP 与宿主。

## 范围

关闭的是原 P7 接口提取中这一上下文返回类型缺口，移动成员、复杂提取和整体 C3 仍按原范围继续。定向结果不是全量集成：此前 434/434 对应本修改前构建，不当作当前新构建的全量证据。未做真人 WSL 或新构建的 Windows 完整组合验收。

证据：[归档 JSON](c3-extract-interface-static-return-2026-10-02.json)，原始日志 /tmp/sophp-extract-static-semantic.log、/tmp/sophp-extract-static-stdio.log、/tmp/sophp-extract-static-host.log。保留所有原有工作区修改；未打包、提交、推送或更新 Profile。
