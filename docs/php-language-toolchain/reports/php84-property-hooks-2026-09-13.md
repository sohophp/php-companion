# PHP 8.4 Property Hooks 验收

日期：2026-09-13。范围：属性 hook 的结构化事实、局部作用域、backed/virtual 读写能力、setter 写入类型、非对称写可见性、Definition 与高置信度诊断。

## 已实现行为

- Parser 记录每个 `get`/`set` hook 的精确范围、body、显式 setter 参数、`final`/`abstract` 和 backing storage 使用事实，并给每个 hook 建立独立词法作用域。
- 无显式参数的 setter 合成与属性类型一致的 `$value`；hook 内 `$this` 和 `$value` 不会被误报为未定义。短形式 `set => expression` 按 PHP 运行时规则视为把结果写入 backing storage。
- Semantic 区分虚拟 get-only、虚拟 set-only 和 backed hooked property。普通读取和直接写入、复合赋值及自增减会分别检查所需的读写能力。
- 显式 setter 参数可使用不同于读取类型的兼容写入类型；直接赋值诊断读取该 write type。Definition 在合法读取和写入位置解析到唯一属性声明。
- `public private(set)` 等非对称可见性只约束写操作；读取继续使用普通可见性。静态属性 hook、readonly 属性 hook，以及 write-only virtual property 的非对称写可见性得到明确声明诊断。
- 目标版本低于 PHP 8.4 时保留 `php.version.unsupported` 边界，不发布 PHP 8.4 hook 操作诊断。Semantic snapshot 升至 schema 70，Language Server 持久缓存升至 `semantic-v41`。

## 运行时依据

- [PHP Property Hooks 手册](https://www.php.net/manual/en/language.oop5.property-hooks.php)
- [PHP Property Hooks RFC](https://wiki.php.net/rfc/property-hooks)
- [PHP 8.4 发布说明](https://www.php.net/releases/8.4/en.php)
- [PHP 属性可见性手册](https://www.php.net/manual/en/language.oop5.visibility.php)

Winstar PHP 8.5.9 wrapper 实际执行确认：get-only backed property 可通过普通写入保存后读取；短 setter 会把表达式结果写入 backing storage；完整块且不访问自身的 setter 为 write-only virtual。独立对照同时确认 static 与 readonly property 不能声明 hooks。

## 验证证据

- Parser 57 项全量测试通过，覆盖 abstract hook、短/完整 setter、显式/隐式 `$value`、hook scope、backed/virtual 及非对称写可见性。
- Semantic 243 项全量测试通过，覆盖读取/写入 Definition、直接与复合操作、setter Union 写入类型、`private(set)`、普通魔术属性回归和未知边界。
- Language Server 151 项全量测试通过；真实 stdio 分别验证 PHP 8.3 版本拒绝和 PHP 8.4 的 unreadable、unwritable、写入类型及不可访问诊断。
- `pnpm check` 通过：15 个组件 588 项、根扩展 33 项，共 621 项；包含类型检查、ESLint、全部测试、三份 VSIX 打包及内容校验。
- `pnpm verify:packages` 通过；15 个组件 tarball 均在仓库外隔离消费者中完成真实安装和导入。
- 同一最终主 VSIX 在 VS Code 1.137.0 的纯净 Profile 与七插件 Open Source Profile 中均以退出码 0 完成。宿主现场创建 PHP 8.4 fixture，验证四类诊断、hook 局部变量无误报和读写位置 Definition。纯净日志：`/tmp/php-companion-php84-property-hooks-pure-final-logs-20260913-2008`；组合日志：`/tmp/php-companion-php84-property-hooks-open-source-final-logs-20260913-2027`。
- Open Source Profile 的 PHP 项目语义使用 PHP 8.5.9；冻结 PHP CS Fixer 3.64.0 按其支持边界使用 PHP 8.2.32。
- 冻结第三方插件目录含 1,370 个文件，组合验证前后聚合 SHA-256 均为 `1f5c87b2dffb64ed8801e6b303d728772b7978d181447ea1bd2ab5dd97a97aad`。
- 最终 VSIX SHA-256：主扩展 `2e409afe18e4410cf912be22049378dfa086f226bdb24548f4a5d91806e8f344`；Open Source Pack `de2535cb403bd8b82e9d91899bef90269ee409623923d8937903b08277563fa3`；Recommended Pack `95d54464c6610b3e11f77f13a12377f8e94eb71869d96e5fbfd89d0562309175`。

## 明确限制

- 本批不声明支持 hook 的引用返回、属性引用绑定、数组偏移等间接修改规则。
- abstract/final property 的完整继承实现检查、hook override 兼容性和跨层级生成仍待后续精准批次。
- 动态属性名、层级不完整或多目标类型继续保持 unknown，不生成猜测结果。
