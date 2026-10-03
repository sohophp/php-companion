# C2：签名恢复后撤回旧按值调用证明

日期：2026-10-02。当前分支源码修复；未打包、提交、推送或更新 Profile。

## 复现与修复

调用文件保持不变：`$value = null ?: new Repo(); observe($value); $value->rea` 先查询得到 ready。通过合法快照把另一文件中的 observe 参数改为 `&$value` 后，仍错误保留 ready；直接 update 同样的定义则正确返回空列表。原始只读探针保留于 `/tmp/sophp-restored-signature-repro.json`。

恢复路径之前仅清理新前缀语法缓存，没有撤销已有 valueParameterCallCache 中的按值证明。函数和普通类的精确构造接收者方法均能复现。

现在以 clearLocalProofCaches 统一清理前缀语法、按值调用与内置 parse_url 只读调用三类布尔证明缓存；普通更新、删除、外部事实更新、工作区释放及成功的完整／声明快照恢复复用同一处理。保留递归 in-progress 防护；未改变恢复 API 的 revision 语义、快照 schema 或 PHP 类型规则。非法快照被拒绝时不替换当前事实。

## 验证

| 范围 | 结果 |
| --- | --- |
| 红绿矩阵 | 函数／方法两个 it 修改前均失败；修复后连同前缀测试 4/4 通过。分别覆盖 restore、restoreDeclaration 的按值→引用→按值替换、重复热查询及非法快照拒绝 |
| 当前全量语义 | 19 文件，558/558，47.45 s |
| 真实 stdio 定向 | 6/6，101.88 s；两个 PHP 7.2／8.5 等长前缀反馈，按需方法候选 reload、传递工厂事实热启动、symbol-only source cache 命名参数重建与跨进程引用缓存／错误输入拒绝；启用 REFERENCE_BUNDLE，无该用例跳过 |
| 隔离 Core C2 宿主子集 | 退出码 0；调用文件内容和干净状态不变，另一文件函数／方法签名的未保存引用编辑令成员撤回，Undo/Redo 往返正确；原前缀、字符串、引用返回、重载和泛型链通过 |
| 十调用 100 轮 | ready 首位／完整空列表每轮正确；总 P50 18.12 ms、P95 26.73 ms，按值侧 P95 81.87 ms、引用侧 19.49 ms，首轮 81.87 ms、最大 91.05 ms；低于 150 ms 热预算，不由此保证所有项目同样等待 |
| 构建与检查 | semantic build、源码 bundle、宿主测试编译及相关 ESLint、任务文件 diff check 均退出码 0 |

[压力结果](c2-restored-signature-ten-calls-2026-10-02.json)。日志 `/tmp/sophp-restored-signature-{red,green,full-semantic,lsp,host,build,bundle,test-build,lint,host-lint}.log`。

当前 stdio 文件仍为 389 项，本轮仅跑六项，383 项未执行；前批完整 383 项继续对应其冻结的旧源码。快照签名替换的旧结果由语义矩阵直接证明；宿主验证实际跨文件编辑，两者不混称为同一触发路径。真实 WSL 可见列表、其它推断缓存和跨平台仍按各自范围核验，不能从本轮宣称全部缓存问题关闭。
