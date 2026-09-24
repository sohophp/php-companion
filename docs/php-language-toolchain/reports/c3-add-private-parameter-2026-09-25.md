# C3 私有方法新增参数的完整编辑链

日期：2026-09-25。对象是独立 Composer 工作区内的私有方法。此轮没有修改业务项目或生成 VSIX。

新增 `SoPHP: Add Private Parameter with Preview` 命令。用户在私有方法名上执行命令，输入新参数名、`int|string|bool|float` 类型及现有调用要传入的兼容标量字面量。语义计划同时更新方法声明、已有 `@param` PHPDoc、可证明的位置参数和命名参数调用；编辑器显示差异预览，确认前后检查源码快照，支持取消、应用和一次 Undo/Redo。

同日后续已将命令扩展并更名为 `SoPHP: Add PHP Method Parameter with Preview`；当前源码还支持[已索引工作区内的方法家族](c3-add-method-family-parameter-2026-09-25.md)。本报告记录最初的私有方法门禁。

当前支持域有意明确：只处理唯一声明的普通私有方法，新参数附加在末尾；默认参数、可变参数、解包调用、动态调用、间接 callable、调用内省或不兼容值会拒绝生成计划。其它方法家族、复杂表达式值及参数插入到中间位置仍属于后续 Change Signature 工作。初次隔离宿主发现全局语法错误检查把 VS Code 虚拟内建声明中的同名方法也算作项目风险；现只检查目标文件的语法，并保留动态与间接调用的独立拒绝门禁。

验证：语义包 338 项测试全部通过，包含声明、PHPDoc、两种调用、空参数表及间接 callable 反例；Semantic/Language Server 构建、扩展测试 TypeScript 和相关 ESLint 通过。隔离 VS Code 1.139.0 Linux C3 宿主验证计划、取消、应用、Undo/Redo，退出码 0；当前 11 项 Open Source Pack 的 C3 源码 Profile 复测退出码 0。日志为 `/tmp/sophp-c3-add-private-final-host.log` 和 `/tmp/sophp-c3-add-private-pack-host-retry.log`。

这项证据不等于跨接口方法家族的参数新增、删除和重排已完成，也不代表已安装 0.4.5 候选、WSL Remote 或长期使用通过。下一步扩展签名计划到可证明完整的方法家族，并在不同参数名、位置/命名调用及外部使用边界上建立拒绝反例。
