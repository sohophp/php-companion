# C1：Attribute 名称只建议已证明的 Attribute 类

日期：2026-09-27。仅修改 SoPHP 隔离工作树和独立 Composer/VS Code 夹具；没有修改业务项目或重新打包 VSIX。

此前 `#[C1Inheritance...]` 虽已排除 interface、trait 和 enum，仍会建议没有 `#[Attribute]` 的普通 class。按 [PHP Attribute 类声明规则](https://www.php.net/manual/en/language.attributes.classes.php)，类须以 `#[Attribute]` 声明才能作为实际 Attribute。现在解析器把直接附着在类头的 Attribute 原始名称保存在声明事实中，语义层按 namespace 和 `use` 别名解析到全局 `Attribute`；方法上的 `#[Attribute]` 不会误把所属类标成 Attribute。未打开的 Composer 类由按需索引只加载声明事实时，候选筛选仍有足够证据。

已审计的内建 Attribute 类使用全局名称白名单，避免简化的内建 stub 未写完整元数据时丢掉有效候选，也不会把内建普通 class 当作 Attribute。语义回归覆盖带别名和绝对名称的有效类、普通类、其它 Attribute 类、方法上的标记、声明层更新后的撤回与恢复，以及内建 `Deprecated` 与 `stdClass` 的边界。

验证：解析器 88/88、语义包 432/432、构建、测试入口 TypeScript、改动文件 ESLint 与 `git diff --check` 通过。VS Code 1.139.1 Linux x64 的当前 10 项 Open Source Pack C1 源码宿主，实际从未打开的 Composer PSR-4 文件建议带全局或别名 `#[Attribute]` 的类，排除同前缀普通 class；最终源码的宿主退出码 0，日志 `/tmp/sophp-c1-attribute-pack10-final-20260927.log`。

此筛选证明“是否为 Attribute 类”，尚未按当前位置核对 `Attribute::TARGET_*`、重复使用或 Attribute 构造参数。新源码也尚未进入 0.4.8 私有候选；真实 WSL Remote 与其它平台仍需验收。
