# 完整扩展组合中的PHPUnit编辑器任务验收

2026-10-11。在原完整12扩展源码Profile增加持久`phpunitTasks`场景，通过VS Code `ProcessExecution`和`TaskGroup.Test`实际执行PHPUnit。带空格测试路径、项目cwd及环境参数在实际子进程中验证；三次依次为通过、真实断言失败、再次通过，退出码为0/1/0，运行时见证值为42/41/42。失败场景先写运行见证再执行断言，避免把工具未启动误判为预期失败。

Linux VS Code1.140.0、PHP8.5.9、PHPUnit11.5.56。每次记录实际task process启动PID，等待process与task结束；PHPUnit子进程另记录PHP_BINARY、版本、cwd、SAPI和PID。三次结果及源码逐字归档，终态核对所有任务和运行时子进程均结束，没有遗留自有任务。这里只验证编辑器Tasks，不构成Test Explorer、自定义Core runner、真人UI或全版本平台验收。

严格测试编译和定向Lint通过。新增一个helper和index import/调用；旧94个资格依赖完整保留，其中93个逐字不变，新增后95个；全部102编译文件中仅index改变并增加helper。正常产品、八运行时资产及既有1,488项LSP资格保持。原真实Xdebug断点/变量/step/continue、格式化保存/失败恢复及其它完整组合检查保持。本轮原50/30轮反馈P95为87/111 ms，150 ms门槛通过；原165 ms失败和性能根因未证明仍保留。

31,472运行输入、185链接和两仓库保持；84文件运行归档。新增F12-PHPUNIT-02，163编号增至164，14家族、未完成大项26保持。原C3、Windows/createFile、真实WSL、当前VSIX、长期和全部原范围继续，日常Profile未更新。精确任务/运行时/终态与资格边界见[机器报告](profile-phpunit-editor-tasks-2026-10-11.json)。
