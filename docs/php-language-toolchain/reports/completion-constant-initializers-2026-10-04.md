# D45 常量初始化表达式的类型补全

## 范围

继续 D44，处理带原生类型的类常量与 backed enum case 值。PHP 8.3 起支持类常量类型，枚举的 backing 类型为 int／string，依据 [PHP 类常量文档](https://www.php.net/manual/en/language.oop5.constants.php)和[backed enum 文档](https://www.php.net/manual/en/language.enumerations.backed.php)。

语义查询在 const_element／enum_case 的值范围取得声明契约：类常量读取 const_declaration 的 type，多个常量共享类型；枚举读取所在枚举的 enumBackingType，不能用 case 的枚举对象身份替代 scalar。未声明类型的常量不从当前值猜契约。运算符和内层调用沿现有边界处理，不把声明类型传给每个运算操作数。关键词位置将值识别为 expression，不误当 class-member。

补充注释边界：const_element 没有 value 字段，namedChildren 中包含 comment；读取值节点时跳过注释，覆盖 `const bool VALUE = /* value */ tr`。

这批不统一常量表达式的合法候选过滤；旧版本的函数调用、PHP 8.5 callable 引用、全局／类常量 new、attribute 和 static local 的位置规则仍需继续实现。可见 true 场景仍有普通函数候选，证据保留，不将相关性增量写成整体完成。原 60 场景、全部版本／平台、未完成声明、性能和真人 WSL 继续开放。

## 过程与验收

- Baseline `/tmp/sophp-constant-initializer-baseline.log`：22 项中 14 失败／8 通过，复现类型缺失及 backing 候选未排序。
- 第一版完整语义 83 文件／1473 项通过；7 项定向 stdio 通过、499 项未选中。注释补充后的最终摘要另列。
- 初次可见宿主 `/tmp/sophp-constant-initializer-visible-host.log` 退出 1：上一个样例同前缀、同类型的全局常量合法参与了下一样例补全，首位断言受污染。给每个样例唯一前缀后八次可见接受通过，失败记录保留；没有修改产品排序规则来排除合法的其它文件常量。
- [可见与编译证据](completion-constant-initializer-visible-2026-10-04.json)：隔离 Linux VS Code 1.140.0／PHP 8.5，四场景 × Enter／Tab。真实弹窗首位、精确文本、光标、一次 Undo／Redo 和磁盘不变；真实 `/usr/bin/php85 -l` 编译接受文本，只编译、不执行业务代码。注释补充后的最后宿主结果另列。

D45 独立完成时源码仍未提交；现与 [D46 初始化候选](completion-initializer-legality-2026-10-04.md)合为同一分支必要源码检查点。不打包、推送或更新 Profile。之前 `4d52f320` 的 58 文件／845 通过／1 条件跳过是上一源码检查点的完整 LSP，不能替代这批的定向验收；[完整回归终态](completion-declaration-defaults-2026-10-04.md#4d52f320-的默认完整-lsp-回归已结束)已单列。

## 最终组合结果

- 完整语义 `/tmp/sophp-constant-initializer-final-semantic.log`：83 文件／1475 项通过，62.65 秒；本文件 24 项，保留／临时树均覆盖。
- 定向真实 stdio `/tmp/sophp-constant-initializer-final-protocol.log`：7 项参数化测试通过、499 项未选中，21.61 秒。PHP 8.3／8.5 的类常量及枚举 backing 值共 12 次未保存查询，加上原 D44 的 58 次查询，合计 70 次；词中光标的完整 true 替换范围、去重、首位及类型切换撤回断言通过。
- 语义／服务器构建和生产 bundle 成功；最终定向 ESLint 与 diff 检查通过。没有重新跑整套 LSP 或性能采样。
- 最终可见宿主 `/tmp/sophp-constant-initializer-comment-visible-host.log` 退出 0，含值前注释的四场景 × Enter／Tab 八次通过；[结构化证据](completion-constant-initializer-visible-2026-10-04.json)已更新为本轮接受文本，八份真实 PHP 8.5.9 编译全部退出 0。可见等待样本为 130–246 ms，是 Provider 就绪后显式触发，不作为自动弹出、P95 门禁或真人 WSL 验收。

下一项是按位置／PHP 版本过滤非法初始化候选，并保护静态闭包体和 PHP 8.3+ static 局部变量的普通表达式能力。已有性能超预算单列，不重复已撤回的 readonly 微调。
