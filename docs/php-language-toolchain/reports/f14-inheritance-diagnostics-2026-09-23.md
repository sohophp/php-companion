# F14 继承与 Enum 诊断本地化

日期：2026-09-23。Language Server 现在按 LSP 客户端界面语言输出继承 final/readonly 类、类型关系不匹配、循环继承、Enum 与 readonly 类的 Trait 属性约束、Enum 接口约束及不可实例化目标的诊断。方法和属性 Override 的已知兼容性原因、缺失属性实现原因也会组合成完整中文消息。诊断代码、严重性、范围与默认英文消息保持原样。

真实 stdio 回归以 `zh-CN` 初始化 Language Server，并验证无效类型关系、循环继承、final 类、Enum Trait/UnitEnum、readonly Trait、不可实例化接口、final 方法覆盖及缺失属性实现的中文发布结果。现有英文回归固定相应消息；原因映射专项测试覆盖参数数目与类型、可见性、final Hook 和属性逆变。定向测试、TypeScript 构建、ESLint 与差异检查通过。全仓 `pnpm check` 通过：Language Server 272 项通过、1 项跳过，根扩展 58 项通过，四份 VSIX 内容校验通过。

语义层仍以英文原因字符串传递 Override 详情；当前所有已知格式在语言服务器边界翻译，未来新增原因格式须同步加入映射。Attribute、弃用、扩展可用性等诊断与 Provider 错误和代码操作标题仍待本地化；F14 最终验收继续开放。本轮只提交源码和验证记录，未冻结新的 Alpha 候选；当前可试用候选仍为 `ecf15e55`。
