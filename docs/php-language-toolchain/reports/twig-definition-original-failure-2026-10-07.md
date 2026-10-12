# D260：PHP→Twig 精确定义原始失败

日期：2026-10-07。在 D259 全量终态审计通过后，使用独立临时 Composer 项目、实际 Core `0680ad5a`、实际 Symfony Controller Provider 与已有 TwigPlus server bundle 进行诊断。原始 payload、结果、源码／构建摘要与归档见[机器记录](twig-definition-original-failure-2026-10-07.json)。

两仓运行期间没有修改，4394 个输入及 Node 保持，stderr 为空；3.28 秒退出 1。已有 Twig bundle 单独冻结，尚未声称全部 TwigPlus 源码与该构建一致；后续须正常构建和永久回归。TwigPlus 四份原未提交修改保留。

## 结果

15 项检查中 **3 项通过、12 项失败**。预期位置由夹具 PHP／Twig 文本独立计算；先核对 PHP payload 的精确来源，再比较真实 Twig `textDocument/definition`，没有用实现返回值代替预期。

| 检查 | 原始结果 |
| --- | --- |
| 实际 PHP Provider 来源 | 通过：两个模板的 `person` 均指向各自数组键，类型 `App\User` 及 getter 的范围正确 |
| 普通模板根变量 | 失败：返回 Controller 方法第 3 行第 0 列的空范围，预期为键第 4 行 43–49 列 |
| 普通模板 getter 成员 | 通过：`name` 指向 `User::getName` 第 3 行 20–27 列 |
| `@site/page.html.twig` 根变量／成员 | 两项失败：均返回空定义；PHP 产生端的该模板上下文与来源已通过独立检查 |
| 未知接收者成员、字符串／注释／HTML 根变量、数组键、过滤器名 | 六项失败：错误跳到 Controller 方法 |
| 字符串／注释／HTML 中的 `person.name` | 三项失败：错误跳到 PHP getter |
| Twig 局部变量遮蔽 | 通过：返回 Twig `set` 声明的精确位置 |

以上行列均为 LSP 的零起点。原始失败保留，不以 D259 全量通过覆盖。当前源码观察与结果一致：Definition 的根变量 fallback 取 `controllerContext.sources[0]`，未优先使用 `variableSources`；成员和 fallback 未要求相应引用角色；Controller 上下文索引未复用模板命名空间映射。

## 下一步与边界

先补永久精确范围和合法负例，再修复引用角色／变量来源以及按工作区隔离的模板匹配。已有隔离补丁草案尚未应用或验证；命名空间夹具另要求覆盖顺序、多根／嵌套根、未知别名、删除重建与带空格路径。完成正常构建、当前 Twig 回归及实际扩展组合后才能扩大资格，原诊断不是真人 Ctrl+点击、VSIX 或真实 WSL 验收。

Core 保持 `0680ad5a`；原 C1–C4／R4、P0–P9／F01–F14、性能／规模／平台／长期与真人范围继续，Goal active。未打包、更新 Profile、推送或发布。
