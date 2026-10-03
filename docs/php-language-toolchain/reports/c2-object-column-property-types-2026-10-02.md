# C2：array_column 的公开属性类型传播

日期：2026-10-02。R26；源码增量，未打包、提交或更新 Profile。

## 缺口与修改

原 `builtinArrayColumnResultType` 通过 `memberReturnClass` 读取对象行的公开属性，只能保留普通对象类名。`string`、`int`、`bool` 或有元素类型的集合属性会退回未知，后续 foreach 的变量说明、类型排序和可证明参数诊断缺失。

改为复用 `memberDiagnosticType`，保留完整的已声明属性类型。仍要求唯一、公开、非静态、可读、非 synthetic／virtual 的真实属性，动态列键和不可证明的属性继续拒绝专门推断。没有新增内置函数名称、修改 PHP 版本边界或更换 PHPDoc 解析器。

## 验证

| 范围 | 结果 |
| --- | --- |
| 修改前严格类型语义反例 | string／int／bool 三项均失败，原实现未给出可证明的实参类型差异 |
| 新语义用例 | 4/4；三种标量、属性类型修改与恢复、合法调用，公开 list 属性嵌套 foreach 成员，以及私有／静态／魔术属性和动态键反例 |
| 原对象列回归 | 与三项标量用例合跑 4/4；原 17 种对象／数组列与负例断言保留 |
| 全量语义 | 20 文件、562/562、47.45 秒 |
| 真实 stdio | PHP 7.2／8.5 两项新用例与原 array_find／array_column 综合用例，共 3/3、388 跳过（总 391），10.21 秒 |
| 隔离 Core C2 宿主 | ELVIS_ONLY 子集退出码 0；新增对象列的 Hover、补全 detail、严格参数诊断、未保存修改与 Undo/Redo 同步刷新；原调用／缓存／泛型链保留 |
| PHP 运行时对照 | 本机 php72 与 php85 的真实对象 text／number／flag 列分别返回 string／integer／boolean |
| 构建与静态检查 | semantic build、生产源码 bundle、Extension Host 测试编译、相关 ESLint 与 diff check 通过 |

新增测试初版未启用 strict_types，弱类型调用不报错符合既有策略；修改测试为严格类型后再次恢复旧实现，三项红例才作为本报告的修复前证据。协议初版写错诊断 code，纠正为现有 `php.argument.type-mismatch` 后通过；没有为满足测试改动诊断策略。

日志 `/tmp/sophp-array-column-properties-{red-final,green-final,green2,full-semantic,lsp-final,host,build,bundle,test-build,lint-final}.log`。`green2` 对应原对象列回归；正式新增 4 项见 `green-final`。

本次没有重新运行完整 391 项 stdio，上一批完整 389 项只对应其冻结的 R23–R25 输入。没有新的整体性能、跨平台或真实 WSL UI 结论；泛型行的类型参数替换、动态魔术读取和 property hook 仍不由此增量证明。
