# C2：泛型对象行的 array_column 类型

日期：2026-10-02。R27；沿用集合类型传播范围，未打包、提交或更新 Profile。

## 缺口与修改

`list<Row<Item>>` 的元素在现有类型系统中是 generic，原对象列分支只接受 named，因此已证明的 `@var T` 属性仍不能提供 foreach 成员。整行提取的 null 列分支也拒绝 generic。

在原函数内复用 `objectType`、`templateArgumentsFor` 与 `members`：验证泛型参数的数量、已知类型和约束，再将参数映射传入成员解析。已有继承泛型映射负责父类属性；null 列可保留验证后的泛型行类型。原公开、非静态、可读、非魔术／virtual 的属性限制保持原有判断，动态列键不新增推断。

## 验证

| 范围 | 结果 |
| --- | --- |
| 修复前 | 直接与继承泛型行都缺少 onlyItem；别名行的属性列先修复后，null 整行与带索引整行仍失败 |
| 定向语义 | 同文件 6/6；标量、集合与原反例保留；新增直接泛型、继承、未知类型、object 约束违例、参数数量错误、跨 namespace 别名、整行及索引整行 |
| 全量语义 | 20 文件、564/564、47.62 秒 |
| 真实 stdio | PHP 7.2／8.5 × 普通／泛型属性四项，加原集合回归，共 5/5、388 跳过（总 393），14.92 秒 |
| 隔离 Core C2 宿主 | ELVIS_ONLY 子集退出码 0；普通与泛型属性的 Hover、completion detail、严格参数诊断、未保存修改及 Undo/Redo 通过 |
| 100 轮交替输入 | 已知 Item 的 ready 首位，未知类型完整空列表；P50 16.73 ms、P95 35.14 ms、最大 82.05 ms，无 incomplete；[原始 JSON](c2-generic-object-column-benchmark-2026-10-02.json) |
| 构建与静态检查 | semantic build、生产源码 bundle、Extension Host 测试编译、相关 ESLint 与 diff check 通过 |

继承输入使用标准多行 PHPDoc 的独立 template／extends 标签；最初混在同一行的测试注释未被当作继承事实，本轮没有修改 PHPDoc 解析语法。协议测试调用的换行仅作 ESLint 格式修正，产品与输入场景未变。

日志 `/tmp/sophp-generic-column-{red,green3,complete-red,complete-green,full-semantic,lsp,host,build,bundle,test-build,lint-final}.log`。性能在独立 Composer 临时项目与当前标准 stdio 入口测量，未修改业务项目。首轮 82.05 ms 也保留在总统计；此样本不是大型 vendor 项目或可见弹窗等待。

本次没有再次运行完整 393 项 stdio；R23–R25 的完整 389 项仍只证明其冻结源码。复杂或未知泛型边界、真实 WSL UI 与跨平台继续单列，未扩展为全 PHP 泛型支持。
