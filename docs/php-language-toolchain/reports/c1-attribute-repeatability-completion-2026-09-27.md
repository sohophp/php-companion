# C1：Attribute 重复使用时的补全

日期：2026-09-27。仅修改 SoPHP 隔离工作树和独立测试夹具；没有修改 Winstar、打包 VSIX 或安装用户 Profile。

PHP 的 Attribute 类默认只能在同一声明上使用一次；声明标志含 `Attribute::IS_REPEATABLE` 时才允许重复。[PHP 官方说明](https://www.php.net/manual/en/language.attributes.classes.php)也指出此规则在反射实例化时验证。原先 SoPHP 已按 Attribute 类身份和目标位置筛选，却仍会在 `#[Once, On...]` 中再次建议已使用的不可重复类。先添加失败的语义用例，再在同一声明已出现该类、且其标志可证明不含 `IS_REPEATABLE` 时过滤建议。可重复类和动态未知标志继续保留；正在编辑的第一个名称、其它声明上的同名 Attribute 不受影响。未闭合的同组输入也读取组内已完整输入的名称。

验证：语义包 14 个测试文件、434/434 项通过；语义包与扩展测试 TypeScript、相关 ESLint、差异检查通过。重建 Core 源码 bundle 后，隔离 VS Code 1.139.1 Linux x64 C1 Extension Host 运行实际补全链并以退出码 0 结束，日志 `/tmp/sophp-c1-attribute-repeat-host-20260927.log`。随后以现有冻结外部扩展目录启动完整 10 项 Open Source Pack 的源码 Profile，同一 C1 宿主先断言 Core、Symfony、Pack 与八个外部成员齐全、没有竞争的 PHP/Symfony Language Server，实际补全链也以退出码 0 通过；日志 `/tmp/sophp-c1-attribute-repeat-pack10-20260927.log`。这些是隔离源码组合证据；真实 WSL Remote、已安装候选和其它平台仍待操作，新源码未进入已冻结 0.4.8 VSIX。
