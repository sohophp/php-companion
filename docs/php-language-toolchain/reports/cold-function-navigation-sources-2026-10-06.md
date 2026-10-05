# D125 函数返回对象的首次类型定义与实现跳转

日期：2026-10-06；源码起点 `c65ec454`，当前根 bundle SHA-256 `ed7230a3047858733c4809cab332ead858e34b8e27e4a15d19df28c42adfa672`。本批延续 D124 的首次查询来源加载。[结构化证据](cold-function-navigation-sources-2026-10-06.json)分别记录原失败、测试契约修正、最终协议、语义及宿主输入。

## 缺口与实现

独立 Composer 项目以显式 `autoload.files` 声明 `rows()`，返回 PSR-4 类 `Row`；`Child` 继承 Row 并覆盖 `name()`。直接把 Type Definition 或 Implementation 作为打开文件后的第一项请求，PHP 7.2／8.5 × onDemand／progressive 的原八个场景全部失败。

语言服务器让这两个入口复用 D124 的具名函数依赖读取。类型定义另外收集现有方法／属性返回类型、变量值类型或引用类型对应的源码依赖，再经已有类型加载链取得真实声明；依赖名称本身不构成跳转结果。实现跳转继续经过既有成员识别、方法名称候选和继承校验，只有真实子类的覆盖方法进入结果。

Composer 自动加载文件、PSR-4、加载限制、取消与文档版本保护保持。没有新增设置、PHP 执行、长期候选缓存或事实格式；语义／源码声明／wrapper／engine 仍为 88／6／12／v67。

## 自动化证据

- 新增 18 项语义覆盖方法／属性返回类、变量与合法捕获来源，以及动态调用、兄弟作用域、引用捕获、注释和 HTML 的反例。最终定向语义 46 项通过；完整语义 **129 文件／3179 项通过**，没有失败或跳过。
- 定向 LSP **3 文件／32 项通过**。其中冷函数查询 24 项覆盖六个首次查询入口、两版本、两模式，每项包含独立进程重启及未保存 `Row→Other→Row`。三个变量来源分别检查类型定义精确落点；Row 的实现落到 Child 方法，Other 不保留旧实现。磁盘仍为原文件。
- 原八个首次导航失败记录保留。初始语义测试错把既有返回的完整 TypeInfo 当作只含位置的对象，造成八个断言失败；修正测试以核对实际契约的全部字段，没有改变产品或弱化精确位置断言。最早一次生成脚本未成功写入，筛选结果没有执行新场景，单独保留且不计为原产品失败。
- 修改文件 ESLint、根与扩展测试 TypeScript、工具 Node 语法和 diff 检查通过。宿主工具的返回类型与 Location／LocationLink 联合类型检查问题已经修正，原检查失败不计入产品失败。

## 隔离宿主

复用 `scripts/check-cold-function-query-acceptance.mjs`，以 `SOPHP_FIRST_FUNCTION_QUERY=typeDefinition` 或 `implementation` 选择第一个显式语义 Provider 请求，严格一次成功，不重试空结果，不先请求其它 Provider。核对目标文件和类／方法名称的精确范围；随后复核 Hover、Definition、Signature Help 和另一种导航。

普通逐键输入 `na` 后，可见列表必须只有 name。分别按 Enter／Tab 核对接受文本、光标、Undo／Redo 和磁盘不变，指定 renderer 异常必须为零。补全之前已经请求了导航和 Hover 等其它 Provider，因此这部分不是完全冷补全证明。

PHP 7.2／8.5 × 两模式 × 两种首次导航，共 **八组宿主／16 次实际可见接受通过**；精确落点、光标、Undo／Redo、磁盘不变和指定 renderer 异常为零均通过。可见列表观察等待范围 184–403 ms，不是热查询 P95。

首次八组功能全过，但期间修正验收 suite 的 TypeScript 类型处理，输入一致性检查退出 1；保留这次混合输入及原结果，不冒称整个最初批次冻结一致。使用最终工具重新跑受影响的前两组，其余六组已经使用最终工具。产品 bundle 和其它宿主输入保持。Linux 隔离宿主与真实 WSL 使用分别报告，当前 Profile 未更新。

```bash
SOPHP_AUTOMATIC_COMPLETION=1 SOPHP_AUTOMATIC_INDEXING_MODE=onDemand \
SOPHP_VISIBLE_PHP_VERSION=7.2 SOPHP_FIRST_FUNCTION_QUERY=typeDefinition \
node scripts/check-cold-function-query-acceptance.mjs /tmp/function-navigation-host.json
```

## 保留边界

本批定向检查不能替代当前完整 LSP。D126 已启动当前 bundle 的一次完整组合，运行结果另行核对；旧 D122 的 981 项只绑定旧产品。普通连续编辑 155.06 ms、缓存规模内存、其它 PHP CLI／平台及真实 WSL 长期使用仍开放。保持原 C1–C4 范围，goal active；不打包、不更新 Profile、不推送或发布。
