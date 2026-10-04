# D62：自然键入的自动弹出与可见撤回

产品源码及生产 bundle 仍绑定 d8f16307；本批只增加验证入口、即时可见状态读取和测试输入同步。没有修改补全实现、设置默认值或安装 Profile。

## 当前证据

Linux VS Code 1.140.0，配置 PHP 8.5，通过普通逐字符 Workbench 输入检查六个连续流程、17 个列表阶段。没有事先调用 Completion Provider，没有手动 triggerSuggest。

| 流程 | 核对 |
| --- | --- |
| function | func／function 首项为关键字，function z 后旧列表清空 |
| class | clas／class 首项为关键字，class z 后不显示无关符号 |
| enum | enu／enum 首项为关键字，enum z 后不显示函数或常量 |
| 类成员 | pu 首项 public，继续输入 function __con 后首项 __construct，Enter 接受实际括号 |
| 类型 | Sh 保留两个匹配项目类型；替换为 Ot 后旧类型撤回；恢复 Sh 再加 o 后自动收窄 |
| 实参 | $f 的 bool 兼容变量优先；修改调用对象为 string 参数后重新输入 $f，string 兼容变量优先，另一候选继续保留 |

三处声明名称的可见空列表各继续观察至少 500 ms，防止短暂清空后重新出现。记录即时 DOM 状态转换及最终实际文本；六份磁盘原文不变。首个 func 从末字符到观察到结果为 638 ms；其它正例阶段为 13–229 ms。名称阶段的 517–544 ms 含人为稳定观察窗口，不当作延迟成绩；这些单次观察也不是 P95 门禁。

实际设置保持 VS Code／Core 当前默认：quickSuggestions.other 为 offWhenInlineCompletions，comments／strings 为 off；PHP wordBasedSuggestions off、snippetSuggestions none、php.suggest.basic false。func 可见的 function block 位于普通关键字之后，本批不把合法模板称作无关候选，也没有改变模板所有权。

原会话 13074 退出 0，严格工具在 stdout／stderr 完整行计数指定 getItemsByProvider 异常，零次。该检查只检测指定异常，不宣称没有所有类型的编辑器错误。原来的批量跨词输入异常仍未修复，不做更多等价版本试探。

## 初次失败与验证工具

原会话 83472 退出 1，实参替换输入 $ 时，预期 needText($)，实际 needText$($f)。Extension Host 的选择已变，CDP 输入仍落在调用名称尾部。增加 focusActiveEditorGroup 的命令往返，在每次选择替换前同步到渲染端；它不请求补全、不手动打开列表。修正后上述完整流程通过，保留原日志 `/tmp/sophp-d62-automatic-initial.log`；没有据此修改 Core。

沿用现有工具：`SOPHP_AUTOMATIC_COMPLETION=1 node scripts/check-comparison-condition-acceptance.mjs report.json`。默认模式仍使用原八次接受场景，本批另外核对原导入模式八次接受，原会话 64703 退出 0；日志 `/tmp/sophp-d62-legacy-mode.log`。宿主 TypeScript noEmit、定向 ESLint 和 diff 检查通过。产品哈希未变，不重复后端全集或性能测量。

## 新发现的源码缺口

new Sh 的可见列表仍含 Shmop。实际 PHP 8.5.9 中，Shmop、GdImage、CurlHandle 和 Generator 的 ReflectionClass::isInstantiable() 为 true，但直接 new 均抛出禁止直接构造错误；Closure 也不可直接构造，ArrayObject 可正常构造。只测试自己的空构造表达式，未调用工厂或使用文件、网络、数据库。

因此，new 候选不能只靠 Reflection 的 isInstantiable 判定；需要按已有 stubs／数据来源核对内建类型的构造限制，并保留类型声明、导入和 instanceof 的正常引用。这是待修复的产品缺口，当前六流程结果不证明全部 new 候选都合适。实际运行时审计只覆盖当前 8.5.9，不外推其它 PHP 版本。

[完整观察、初次失败、兼容检查和运行时证据](completion-automatic-input-2026-10-04.json)。连续编辑 150 ms 预算、恢复长度上限、全部场景／平台／运行时／长会话／延迟旧请求及真人 WSL 仍开放。收口本批验证后推进内建构造限制，不打包、推送或更新 Profile，goal active。
