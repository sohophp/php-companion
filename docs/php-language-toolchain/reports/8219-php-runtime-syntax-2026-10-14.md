# 8219 当前真实PHP语法与诊断对照

**已执行并通过**：原 `packages/language-server/test/php-runtime-syntax.test.ts` 显式提供原九个PHP7.2–8.5 CLI，实际命令退出0，10项通过，失败/跳过/待办均0。九个真实CLI对照及一个静态void-cast检查均执行，不使用空配置的条件跳过。

保留原20个语法样例及全部版本接受/拒绝断言，包括调用尾逗号、箭头函数、具名参数、联合/交集类型、nullsafe、match、enum、first-class callable、readonly class、typed/dynamic class constants、property hooks、asymmetric visibility、PHP8.5 void-cast、pipe及clone-with；同时保留缺失void操作数的注释/嵌套错误检查，以及8.5有效注释/字符串恢复反例。逐版本实际 `php -l` 接受结果与当前分析器诊断一致。

原用例和分析器入口虽与旧记录相同，Parser及语言规范依赖已变化，旧资格不直接转移。本次为当前依赖重新取得原限定范围资格。解释器与私有JSON包装沿用前一项已核对入口，无系统安装、测试或产品代码修改。

冻结输入、完整结果/日志摘要、原进程与进程组退出、全部临时语法测试目录移除及归档副本核对通过。实际版本、10个用例身份、输入数与归档数见[机器报告](8219-php-runtime-syntax-2026-10-14.json)。正常候选8219保持。

范围限Linux上这些既有语法样例与诊断对照，不代表完整九版本协议/编辑器/能力矩阵或远程CI。复杂Controller原500ms、真人WSL和其它环境资格仍开放，完整目标未完成，新增功能暂缓。
