# C2：readonly 初始化的 PHP 版本与类族权限

日期：2026-10-04。同一开发分支，保留生成预览及 protected 补全改动。本批不更新 Profile、打包、推送或发布。

## 已确认的缺口

[PHP 官方属性规则](https://www.php.net/manual/en/language.oop5.properties.php)指出 readonly 在 PHP 8.4 前隐含 private-set，8.4 起隐含 protected-set，也允许显式覆盖。原 readonly 分析把子类初始化一律放过，父类初始化一律报错，且未尊重显式 private(set)。

实际执行独立 PHP 程序：本机 PHP 8.1 拒绝父类与子类初始化，PHP 8.4／8.5 均允许；PHP 8.4 父类写子类 public protected(set) 属性也成功。8.3 本机运行程序不存在，没有把协议结果称为该版本运行时验证。

## 实现

- 语义结果增加可选 maximumPhpVersion，隐含 protected-set 在非声明类的合法类族首次写入只在 8.1–8.3 报错；语言服务同时检查最小和最大版本。
- 两处 readonly 写入权限复用成员可见性判定，父子双向关系有效，private 与显式 set visibility 仍受限。
- 重复写入、引用修改、枚举和 PHPDoc 只读成员保持原拒绝规则，不用“允许初始化”放过已证明的修改。
- 首次隔离宿主失败还证明默认 onDemand 模式将此诊断关在全项目准备之后。将只读属性检查移出全局 completeRoots 门槛，保留无语法错误及完整继承依据条件；不为该检查触发整项目索引。缺失父类的定向语义反例仍不推断错误。
- 语义结果仍是版本条件事实，不把目标版本加入持久缓存或构造初始化摘要。现有仅检查外部写入的用例明确过滤版本条件项，另精确断言旧版本的子类初始化错误。

## 验证

- `/tmp/sophp-readonly-family-red.log`：新增定向语义 1 失败／原有 8 通过，确认原实现缺口。
- `/tmp/sophp-readonly-family-fixed.log`：专门语义 9 项通过，包含父类、子类、显式 private(set) 和外部访问。
- `/tmp/sophp-readonly-family-full.log`：全量语义 1,364 项／79 文件通过，53.88 秒。
- `/tmp/sophp-readonly-family-protocol.log`：PHP 8.1／8.3／8.4／8.5 四项初始化权限协议，加既有 readonly-class 版本回归，共 5 项通过、489 未运行。逐项检查诊断行，未把其他诊断过滤后的数量视为完整文件正确性。
- 最终 `/tmp/sophp-readonly-family-protocol-final.log`：四项初始化权限改为默认 onDemand，既有 readonly-class 版本检查保留实验完整索引路径；共 5 项通过、489 未运行。
- `/tmp/sophp-readonly-family-host.log`：初次隔离宿主失败，PHP 8.1 期望三处只读错误却得到空列表，定位为完整索引门槛而非测试比较错误。
- `/tmp/sophp-readonly-family-host-final.log`：Linux VS Code 1.140.0 Core 隔离宿主退出 0。protected 四次可见列表回归仍通过；未保存 readonly 文件切换 PHP 8.1→8.5→8.1，诊断行分别为 [1,3,4]→[4]→[1,3,4]，磁盘仍保持原文，没有指定 getItemsByProvider 异常。
- `/tmp/sophp-readonly-family-incomplete.log`：增加缺失父类反例后，专门语义 9 项通过。全量语义数据对应此前相同实现，后加反例由此定向结果证明。
- 语义／语言服务构建、最终扩展 bundle、根 TypeScript、定向 ESLint、宿主编译与 diff 检查通过。真实 WSL、全量协议与组合性能门槛保持开放；此处不报告未经测量的性能通过。

## 重复赋值的版本条件升级

后续检查复现同一子类方法 `$this->id = 1; $this->id = 2;` 的第二次写入在 PHP 8.4+ 漏报。扫描先记录两处仅旧版本非法的初始化；控制流随后证明第二处属于重复写入，但原去重直接跳过，未撤销 maximumPhpVersion。`/tmp/sophp-readonly-repeated-red.log` 为 1 失败／9 通过。现在按位置保存诊断对象，后续明确证明修改时移除版本上限，不产生重复诊断，也不线性扫描整张结果列表。引用遍历诊断保留单独去重语义。

本机 PHP 8.4／8.5 实际执行同一例子，首次赋值成功、第二次赋值均抛出 Error。最终证据：

- `/tmp/sophp-readonly-repeated-fixed.log`：10 项专门语义通过。
- `/tmp/sophp-readonly-repeated-full.log`：全量语义 1,365 项／79 文件通过，58.05 秒。
- `/tmp/sophp-readonly-repeated-protocol.log`：四版本 onDemand 用例加入继承属性的重复赋值；PHP 8.1／8.3 两次均错误，8.4／8.5 仅第二次错误；另保留 readonly-class 版本回归，共 5 项通过、489 未运行。
- `/tmp/sophp-readonly-repeated-host.log`：隔离 Linux VS Code 1.140.0 退出 0，未保存文件 PHP 8.1→8.5→8.1 的诊断行分别为 [1,3,4,5,5]→[4,5]→[1,3,4,5,5]，磁盘未改；protected 可见列表仍通过。
- 最终语义构建、扩展 bundle、根 TypeScript、宿主编译、定向 ESLint 与 diff 检查通过。本批没有新增性能测量或真实 WSL 验收。

生成预览竞争声明保护、protected 类族补全及本节 readonly 诊断整理为一次必要的本地 Core 源码里程碑。历史“未提交”文字记录各批当时状态；该提交不表示 C1–C4 整体通过，不打包、更新 Profile、推送或发布；goal 保持继续。
