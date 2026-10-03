# 魔术方法修饰符与声明注释补全

日期：2026-10-03。源码、完整语义、定向协议与 Linux 可见编辑器通过。

## 修改

- 明确 static 的方法只建议适用的 __callStatic／__set_state；private／protected 位置仅保留合同允许的构造、析构和 clone 名字，保留现有版本、枚举、去重和继承 final 过滤。
- 未写 static 时仍可选择需要它的方法，同一 LSP CompletionItem 通过 additionalTextEdits 在 function 前补上。已有 static 不重复插入，不修改已有参数、注释或可见性。
- 声明上下文取得可靠的 static、visibility 和 function 原文位置；按已解析 commentRanges 遮蔽注释，保留 UTF-16 长度及 CR/LF。声明关键字与名称之间的换行或注释可识别；导入、成员引用、匿名类引用和字符串反例保留。
- 注释文本一次拼接。首个独立原型逐条重复制头部，242 KB／1500 注释样例 P95 379.29 ms，超预算；线性拼接原型约 35.83 ms。当前构建同样例仅声明上下文 P95 50.61 ms。

## 证据

| 门禁 | 结果 |
| --- | --- |
| 完整语义 | 69 文件、1299/1299，47.31 秒，4 worker |
| 当前 Core 定向 stdio | 4 文件、10/10，10.59 秒；PHP 7.2／8.5 各 9 修饰符场景，并回归枚举、去重及继承 final |
| 1500 注释真实协议热查询 | 两版各 20 热样本；P95 106.15／101.43 ms，均满足 150 ms 门槛；每次核对候选和 static 编辑 |
| Linux VS Code 1.140.0 | 8 次 Enter/Tab，类／枚举／已写 static／注释，准确文本、光标、Undo/Redo、磁盘保护通过 |
| 可见列表等待 | 8 次显式触发后首次观察为 144.94–217.51 ms；已预查询 provider，包含 CDP 轮询，不是按键到自动弹出的等待 |
| 构建和检查 | Semantic／Server／Core、根 tsc --noEmit、扩展测试 tsc --noEmit、定向 lint 退出 0 |

PHP 实际加载和独立原型历史见[审计](completion-magic-static-audit-2026-10-03.md)。接口、Trait、匿名类、大小写、引用声明和不同注释位置含在新增 31 项语义正反例中。编译首次指出可选捕获组的类型保护缺失，补齐后构建通过；语义分组本身要求捕获至少一个修饰符，运行行为不变。

规则依据 [PHP 魔术方法](https://www.php.net/manual/en/language.oop5.magic.php)的正常声明合同。旧 PHP 有些不合适的 static 声明仅警告或可加载，实际记录保留；补全不推荐这些旧式声明，也不擅自改变 private/protected。本次提供名称、括号与修饰符补齐，已有参数由用户继续编辑；没有扩展为完整魔术方法签名模板系统。

此前完整协议 494 项／Core C2 65 条属于本次修饰符修改之前。本次没有重跑当前完整协议或 C2，Windows 与真人 WSL 单列；注释密集独立样例也不能代表大 Composer 项目。未打包、提交、推送或更新 Profile。

后续[当前集中集成](completion-modifier-integration-2026-10-03.md)已完成本修饰符产品输入下的完整协议 496/496（零跳过）、完整 Core C2 65、正式夹具修正后的标准 Core／Symfony C3 68、三版 C1 操作链及当前重启／冷父类竞态。原本节的“未重跑”是定向批次时点，不能据此误读为当前仍缺集中结果；真人 WSL 与完整平台矩阵继续单列。
