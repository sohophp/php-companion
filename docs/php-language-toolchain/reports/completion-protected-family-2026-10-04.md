# C2：父类作用域中的子类 protected 成员

日期：2026-10-04。这是冻结 S03／S04 的可见性补充，不增加产品设置或新的补全类别。保留上一批生成预览改动，同一分支未提交；未更新 Profile、打包、推送或发布。

## 缺口与实现

[PHP 官方可见性规则](https://www.php.net/manual/en/language.oop5.visibility.php)允许声明类、子类和父类访问 protected 成员。原 members 过滤和 memberVisibilityAllowed 只检查访问类是否为成员声明类的子类，漏掉父类访问子类成员的方向。

最小运行程序在本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 均执行成功：父类方法接收子类对象，读取子类 protected 实例方法／属性、静态方法／属性及类常量，结果均为 mps23。PHP 8.5 的兄弟类访问子类自己声明的 protected 方法抛出 Error；不因共享祖先就把这类成员公开给兄弟类。

两个过滤入口现在复用双向父子关系判定。private 仍仅允许声明类自身，public 保持原规则。兄弟类可以读取共同祖先声明的 protected 成员，但不能读取另一兄弟类自己声明的 protected 成员。未修改 readonly 初始化的版本规则。

## 证据

- 初次语义回归 3 失败／4 通过，父类的实例、静态、静态属性三个入口均为空；保留 `/tmp/sophp-protected-family-red.log`。
- 修复后扩大回归时静态两个断言失败，`/tmp/sophp-protected-family-semantic-final.log`。语义 completeMembers 的既有契约返回全部可见静态成员，静态属性也以不带 $ 的成员名返回；原断言错误地要求只有一个静态类别。修正语料为既有 API 契约，仍精确检查成员集合和 private 缺席；没有改产品来绕开此失败。LSP 另检查实际 $childCounter 标签。
- 最终专门语义 **8 项通过**，`/tmp/sophp-protected-family-semantic-fixed.log`。七个补全场景分别核对实时、仅声明及恢复缓存来源；父类场景撤去 extends 后候选撤回、恢复快照后再出现。另一项核对补全与不可访问诊断一致，private／兄弟类禁止项仍报告。
- 全量语义 **1,363 项／79 文件通过**，52.98 秒，`/tmp/sophp-protected-family-full-semantic.log`。
- 真实 LSP 的 PHP 7.2／8.5 **2 项通过、488 未运行**，7.18 秒，`/tmp/sophp-protected-family-protocol.log`。每版本覆盖父类实例与静态正例、兄弟类／无关类反例，以及未保存修改回到父类作用域后正确刷新。
- Linux VS Code 1.140.0 隔离 Core 宿主，通过协议候选及实际可见列表的父类→兄弟类→无关类→父类四次未保存变化，private 成员不出现，磁盘文件始终为原始短文本。日志 `/tmp/sophp-protected-family-host-final.log`，退出 0，此路径没有指定 getItemsByProvider 异常。
- 首次 UI 语料 `/tmp/sophp-protected-family-host.log` 将包含类型说明的完整可见文本与纯名称比较，失败时实际候选正确。最后按既有 helper 输出，精确检查候选数量及“名称或名称后接已知类型说明”，未丢弃多余候选或忽略私有成员。
- 语义／语言服务构建、扩展 bundle、根 TypeScript、宿主编译、五文件 ESLint 与 diff 检查通过。新宿主环境变量仅选择既有 C2 的定向分支和隔离调试端口，不是产品配置。

这些材料没有关闭全部冻结补全矩阵、组合 LSP 性能、其它平台或用户真实 WSL 验收。此路径未测量可见等待分布；全量语义通过不替代完整 LSP 或真人验收。
