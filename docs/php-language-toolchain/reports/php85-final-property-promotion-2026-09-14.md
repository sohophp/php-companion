# PHP 8.5 final 提升属性验收

日期：2026-09-14

## 目标与版本边界

PHP 8.4 支持普通 `final` 属性，但构造器属性提升中的 `final` 直到 PHP 8.5 才可用。PHP Companion 现在把以下声明同时建模为构造器参数、提升属性和 final 属性：

```php
class Account
{
    public function __construct(public final string $id) {}
}
```

目标 PHP 8.4 会产生稳定的 `php.version.unsupported` 诊断，并抑制依赖该无效声明的属性覆写级联；目标 PHP 8.5 接受该声明。子类再次声明 `$id` 时，语义层产生 `php.property.incompatible-override`，原因与普通 final 属性一致。PHP 官方依据为 [PHP 8.5 发布说明](https://www.php.net/releases/8.5/en.php) 和 [Final Property Promotion RFC](https://wiki.php.net/rfc/final_promotion)。

## 实现

当前 `tree-sitter-php` 0.24.2 会把提升参数中的 `final` 保留在可恢复的 `ERROR` 子树，而提升参数、类型和变量范围仍然完整。解析器兼容层从完整提升参数文本恢复该修饰符；未来语法包提供正式 `final_modifier` 节点时，现有分支会优先直接消费节点。该兼容仅作用于已经识别为 `property_promotion_parameter` 的节点，普通参数不会被提升为属性。

恢复后的 `final` 进入既有 `ParsedPropertyDeclaration`，因此复用索引、缓存、继承层级和属性覆写诊断，不增加平行语义规则。覆写结果携带 PHP 8.5 最低版本，Language Server 只在目标版本达到 8.5 时发布该条语义诊断。

## 验证

- PHP 8.4 运行时拒绝合法形状的 final 提升属性：`Cannot use the final modifier on a parameter`。
- PHP 8.5 运行时接受相同声明；子类覆写时拒绝并报告 `Cannot override final property`。
- parser 回归断言提升属性具有 `final: true`。
- semantic 回归断言跨父子类的提升 final 属性不可覆写。
- Language Server 的 PHP 7.3–8.5 版本矩阵断言该语法仅在 8.5 目标可用，并确认 8.5 下没有兼容层伪装的语法错误。
- 真实 stdio Language Server 分别以 8.3、8.4、8.5 目标运行：8.4 仅保留版本错误，8.5 才发布 final 提升属性覆写错误；同一文件中的合法 8.4 Property Hook 诊断不受影响。

验证命令：

```bash
/usr/bin/php84 -l /tmp/php-companion-final-promotion-valid.php
/usr/bin/php85 -l /tmp/php-companion-final-promotion-valid.php
/usr/bin/php85 -l /tmp/php-companion-final-promotion-override.php
pnpm --filter @php-companion/parser test
pnpm --filter @php-companion/semantic test
pnpm --filter @php-companion/language-server exec vitest run test/analysis.test.ts
pnpm check
```

`pnpm check` 最终通过：十五个组件共 590 项测试、根扩展 33 项测试，以及三份 VSIX 的内容校验均成功。`pnpm verify:packages` 另行从隔离仓库外消费者安装并验证十五个组件 tarball。打包后的主扩展在隔离 VS Code 1.137.0 配置中完成 Extension Host 全套用例并以退出码 0 结束。

本地候选产物 SHA-256：

- `php-companion-0.4.5.vsix`：`c0ecbdcbde3431dd6f4be5b90762566435adb5774f0569f8d809b51b2f9c1bc2`
- `php-companion-open-source-pack-0.4.5.vsix`：`7c526ed7cb638175778118728aa2617049c6d9a73c19e70a1386fac1dab6a56b`
- `php-companion-recommended-pack-0.4.5.vsix`：`60cf6b8def2e0c736e6ba16507b6a749bab74c9cf8533bc48608d6bf641bf87f`

## 明确边界

- 兼容层只恢复 `final` 属性事实，不尝试接受其他未知或非法参数修饰符。
- 目标版本仍由工作区 PHP 配置或 Composer 约束决定；运行语言服务器所用 Node/PHP 环境不会改变项目语法版本。
- 动态生成的类和未完整索引的继承层级继续遵守现有保守策略，不发布无法证明的覆写诊断。
