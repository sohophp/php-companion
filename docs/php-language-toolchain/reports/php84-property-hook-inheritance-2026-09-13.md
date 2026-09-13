# PHP 8.4 Property Hook 继承与引用边界验收

日期：2026-09-13。范围：接口与抽象属性契约、属性类型方差、独立 hook 继承、final 属性/final hook，以及 `&get` 对间接修改和引用操作的约束。

## 已实现行为

- Parser 结构化记录属性级 `abstract`/`final`、hook 级 `abstract`/`final` 以及 getter 的引用返回标志，并保留原有 hook 范围、setter 参数、backed/virtual 与局部作用域事实。
- Semantic 只在继承图完整且目标唯一时验证接口和抽象属性要求。get-only 契约允许返回类型协变，set-only 契约允许写入类型逆变，同时要求 get/set 时分别检查两个方向，因此保持不变性。
- 子类只覆盖显式声明的 hook；没有覆盖的父 hook 会进入子类有效成员，继续驱动读写能力、Definition 与操作诊断。
- `final` 属性禁止任何子类重声明；`final get`/`final set` 只禁止覆盖对应 hook。`private(set)` 按 PHP 规则作为隐式 final 属性处理。
- 数组下标赋值、复合赋值和自增减属于间接修改；有效 getter 不是 `&get` 时发布 `php.property.indirect-modification`，`&get` 正例保持静默。
- 直接从属性取得引用、把属性传给唯一解析且对应形参按引用的函数/方法，以及 `foreach ($object->property as &$value)` 都按间接修改处理；有效 getter 必须是 `&get`。
- `$object->property =& $source` 对任何 hooked property 都发布 `php.property.reference-assignment`，因为 PHP 不允许把引用赋给 overloaded object property。
- `foreach ($object as &$value)` 会检查唯一且完整的具体对象层级；所有当前作用域可读写的 hooked properties 都必须有效地以 `&get` 返回，否则发布 `php.property.reference-iteration` 并列出阻止引用遍历的属性。不可见属性不泄漏到诊断中。
- 非抽象类缺失接口/抽象属性发布 `php.property.missing-implementation`；类型、能力、可见性及 final 覆盖冲突发布 `php.property.incompatible-override`。
- 非法抽象/接口属性、virtual 默认值，以及 backed 属性同时声明 `&get` 与 `set` 会得到声明诊断。PHP 8.3 及更早目标不启用本批 PHP 8.4 语义诊断。
- Semantic snapshot 升至 schema 71，Language Server 持久缓存升至 `semantic-v42`。

## 官方与运行时依据

- [PHP Property Hooks 手册](https://www.php.net/manual/en/language.oop5.property-hooks.php)
- [PHP Property Hooks RFC](https://wiki.php.net/rfc/property-hooks)
- [PHP final 关键字手册](https://www.php.net/manual/en/language.oop5.final.php)
- [PHP 非对称属性可见性 RFC](https://wiki.php.net/rfc/asymmetric-visibility-v2)

Winstar `bin/php-runtime` 的 PHP 8.5.9 实际执行验证了 get-only 协变、set-only 逆变、双向类型不变、抽象属性的部分 hook 实现继承、final 属性、final 单 hook、`private(set)` 隐式 final、非法抽象组合、virtual 默认值、backed `&get`/`set` 冲突，以及普通 getter和 `&get` 对数组下标修改、直接取引用、按引用实参和属性 foreach 引用的不同结果。运行时还验证了向普通或 `&get` hooked property 赋引用都会失败，以及对象 foreach 引用在可见 hooked properties 全部有效 `&get` 时可执行。跨类型契约使用直接执行文件验证，因为 `php -l` 不会对所有链接期属性契约完成最终检查。

## 验证证据

- Parser 57 项全量测试通过；新增属性级标记和 `&get` 正反例。
- Semantic 244 项全量测试通过；新增接口缺失、抽象类部分实现、能力/可见性、协变/逆变/不变、final 与父 hook 合成，以及普通 getter/`&get` 下标修改、直接引用、唯一按引用实参和属性/对象 foreach 引用用例。
- Language Server 152 项全量测试通过；analysis 与 stdio 同时验证 PHP 8.3/8.4 版本门槛和稳定诊断代码。
- `pnpm check` 最终通过：15 个组件 590 项、根扩展 33 项，共 623 项；包含类型检查、ESLint、全部测试、三份 VSIX 打包及内容校验。
- `pnpm verify:packages` 通过；15 个组件 tarball 均在仓库外隔离消费者中完成真实安装和导入。
- 最终主 VSIX 在 VS Code 1.137.0 纯净 Profile 与七插件 Open Source Profile 中均以退出码 0 完成。宿主动态 fixture 精确验证 unreadable、unwritable、写入类型、非对称可见性、间接修改、直接引用、唯一按引用实参、属性/对象 foreach 引用、缺失属性、方差/final override 和 Definition。当前归档的纯净 Profile 日志：`/tmp/php-companion-cross-platform-runner-final-pure-logs-20260914-0010`；Open Source Profile 复跑日志：`/tmp/php-companion-cross-platform-runner-open-source-retry-logs-20260914-0000`。
- Open Source Profile 的 PHP/Symfony 语义使用 Winstar PHP 8.5.9；冻结 PHP CS Fixer 3.64.0 继续通过 PHP 8.2 wrapper 运行。
- 冻结第三方插件目录运行前后均为 1,370 个文件，聚合 SHA-256 均为 `1f5c87b2dffb64ed8801e6b303d728772b7978d181447ea1bd2ab5dd97a97aad`。
- 最终 VSIX SHA-256：主扩展 `cdc856c88918ea8a8e8ebc936476fead0de451846eba840cf5a0d60277b8ca4b`；Open Source Pack `1c239a7440ea9028845f83359576dfbb9ece6594e53d0c7ecacf3f341440132a`；Recommended Pack `c3b818de7ac0f0c8697e16d4055eb5b1bbe6e0231c4632520a3fac5374b18ec0`。
- 一个覆盖多组 switch/closure 返回合流的既有正确性测试在全量负载下以 5.04 秒越过 Vitest 默认 5 秒，单独复跑为 4.63 秒。该项与相邻同规模 closure-flow 测试统一使用既有 15 秒集成窗口；功能断言、产品分析预算和冻结索引性能门槛均未改变，随后完整门禁通过。

## 明确限制

- 动态属性名、动态或歧义调用、参数展开、继承图不完整、多个候选类型或冲突 Trait 属性继续保持 unknown，不输出猜测诊断。
- 本批不提供抽象 hooked property 或父 hook 的跨层级代码生成。
- 本轮只证明 Linux x64 / WSL；Windows 原生与 macOS 门禁仍待执行。
- 未执行 npm 或 VS Code Marketplace 发布。
