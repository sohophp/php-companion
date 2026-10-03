# R37 未闭合数组键和值补全

日期：2026-10-02。主源码已应用，范围来自 [32 场景基线](c2-unfinished-shape-baseline-2026-10-02.md)。应用发生在 R36 完整 stdio 421/421、零跳过及十六项输入终态一致之后；该历史结果不能替代本批。

## 实现

- 数组键和值共用一个有界的临时语法树恢复过程，关闭当前引号及已存在的括号，查询后销毁树；不发布合成的文件事实。
- 使用恢复后的语法验证表达式位置，拒绝 selector、未知回调合同和错误括号造成的伪实参。保持 HTML 文本、注释及已完成字符串不参与括号扫描。
- 返回／参数赋值的恢复合同支持可证明的联合形状及可空形状，仍检查原生类型兼容；宽数组或未知分支不猜选形状。
- `=>` 紧接引号与有空格时使用一致的值补全。键替换范围被约束在实际文档末尾，临时闭合符号不会进入接受文本。
- 统一补全上下文增加内部 `quotedValue` 标记；语言服务器在字符串值位置返回适用的值候选，撤回无关函数、常量等通用建议。命名实参值、PHPDoc 和普通代码位置保持原路径，不增加用户设置。

保持 131,072 字符扫描、16 层括号恢复和既有类型预算。原始范围、workspace revision 与 snapshot 不变由测试核对。

## 已确认的证据

| 检查 | 结果 |
| --- | --- |
| 隔离全量语义 | 852/852，34 文件，51.50 秒，退出码 0 |
| 主产品全量语义 | 852/852，34 文件，50.40 秒，退出码 0 |
| 新定向语义 | 58 项；32 组正例、键和值负例、PHP/HTML 边界、保留／不保留语法树、预算、未保存撤回与字符串上下文 |
| 隔离真实 stdio | PHP 7.2／8.5 共 24 场景，退出码 0；不替代主产品协议 |
| 主产品定向真实 stdio | 6 项通过、417 跳过，总数 423，18.40 秒；包含新恢复、R36 联合形状和 R35 分支形状，退出码 0 |
| 完整 Core C2 | 退出码 0；新增实参／return／赋值／方法的键和值、精确候选、未保存更新及一次 Undo/Redo 与既有断言通过 |
| PHP 8.5 可见列表 | 退出码 0；新增 16 次等待 116–156 ms，精确 Tab 文本、临时括号隔离、Undo/Redo 通过 |
| PHP 7.2 可见列表 | 退出码 0；新增 16 次等待 111–144 ms，精确 Tab 文本、临时括号隔离、Undo/Redo 通过 |
| 热查询 | 小工作区及 2,300 背景文件共 600 次，最差场景 P95 11.34 ms；无错误候选、revision 改变；不是可见弹窗等待 |
| 编译、bundle、宿主编译、定向 ESLint | 退出码 0 |

源文件、编译语义与隔离版逐字节一致。隔离五项输入终态一致：`/tmp/sophp-unfinished-shape-ready-inputs.sha256`、`/tmp/sophp-unfinished-shape-ready-final-inputs.log`。

主产品日志：`/tmp/sophp-unfinished-shape-product-semantic.log`、`/tmp/sophp-unfinished-shape-product-stdio.log`、`/tmp/sophp-unfinished-shape-product-full-c2.log`、`/tmp/sophp-unfinished-shape-product-visible-85.log`、`/tmp/sophp-unfinished-shape-product-lint.log`。隔离原始协议与性能结果：`/tmp/sophp-unfinished-shape-protocol.json`、`/tmp/sophp-unfinished-shape-performance.json`。

## 排查与剩余集成

首轮恢复的负例揭示 selector 借用外层合同与错误括号被解析成独立语句的问题，已用恢复后的表达式位置核验修正。真实协议随后发现有限值之后混入通用函数／常量，已增加统一上下文标记，未删除精确列表断言。未闭合 PHPDoc 被误识别为字符串的负例也已保留并通过。临时目录相对路径和模块解析设置错误纠正后重新构建，不计作产品验收。

PHP 7.2 可见列表会话 69483 已退出码 0，日志 `/tmp/sophp-unfinished-shape-product-visible-72.log`。两版本宿主完成后的十九项输入一致，记录 `/tmp/sophp-unfinished-shape-product-host-final-inputs.log`。阶段记录：完整 stdio 423 会话 40247 当时正在运行，终态结果见下文，日志 `/tmp/sophp-unfinished-shape-product-full-stdio.log`。冻结十九项输入 `/tmp/sophp-unfinished-shape-product-inputs.sha256`，主源码和 bundle 保持不变，观察同一协议进程终态后再核验；宿主终态一致不代表完整协议已通过。

PHP 8.5 日志仍有此前独立复现的 VS Code `getItemsByProvider` renderer 异常，功能断言通过不代表它已修复。真实 WSL、完整 C3 Symfony 快照组合及整个路线图仍未完成。当前前缀只覆盖已验证的标识符样式，标点与转义字符串仍需单独核对；不声称所有未完成输入均支持。

未打包、提交、推送或更新 Profile。

## 完整协议终态

原会话 40247 已退出，退出码 0：423/423 通过、零跳过、1325.31 秒。十九项冻结输入终态全部一致。此结果对应 R37 已应用源码，不代替下一批字符串前缀源码的验证。
