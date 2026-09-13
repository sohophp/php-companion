# PHP 8.5 属性 Override 验收

日期：2026-09-14

## 支持范围

PHP 8.5 将内建 `#[\Override]` 的目标从方法扩展到属性。PHP Companion 仅在名称按 namespace 和 `use` 规则解析为全局内建 `Override` 时应用规则；项目自定义的同名 Attribute 不会被误判。

完整继承图可证明时，以下属性会检查同名的非私有父类或父接口属性：

- 普通实例与静态属性；
- 构造器提升属性；
- 接口继承中的属性；
- 匿名类属性；
- 直接或嵌套 Trait 组合进类后的属性。

父级 public/protected 属性满足存在性要求，private 属性不满足。PHP 8.5 目标在缺少匹配时发布 `php.attribute.invalid-override-property`；继承图缺失或歧义时保持静默，避免猜测。

PHP 8.0–8.4 目标在 Attribute 名称处发布属性目标的 `php.version.unsupported`；PHP 7.x 已由 Attribute 自身的 PHP 8.0 版本边界拒绝，因此不叠加第二条错误。所有旧版本均抑制依赖 PHP 8.5 语义的缺失祖先属性错误。PHP 8.5 中 Trait 自身不立即检查匹配关系；Trait 被组合进具体类时才在该消费类的 `use Trait` 位置验证。

规则依据为 [PHP 8.5 发布说明](https://www.php.net/releases/8.5/en.php)和 [Override on properties RFC](https://wiki.php.net/rfc/override_properties)。

## 运行时对照

PHP 8.4.23 拒绝属性目标，错误为 Attribute 只能用于方法。PHP 8.5.9 接受普通、静态、提升、接口、匿名类以及具备匹配父属性的 Trait 组合。

缺少匹配属性的 Trait 文件在 PHP 8.5 单独 lint 时通过；执行包含消费类的文件时，运行时在该类组合 Trait 的位置报告 `Consumer::$missing` 没有匹配父属性。这证明检查属于组合后的类，而不是 Trait 声明本身。

```bash
/opt/remi/php84/root/usr/bin/php -l /tmp/php-companion-override-property-valid-full.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-override-property-valid-full.php
/opt/remi/php85/root/usr/bin/php -l /tmp/php-companion-override-property-trait-invalid.php
/opt/remi/php85/root/usr/bin/php /tmp/php-companion-override-property-trait-invalid.php
```

## 自动验证

semantic 正反例覆盖普通、静态、提升、接口、匿名类、private 父属性、import alias、自定义同名 Attribute、不完整父级以及直接/嵌套 Trait。真实 stdio Language Server 测试分别验证 PHP 8.4 只有版本错误，PHP 8.5 只有缺失匹配错误，并验证 Trait 合法与非法组合。

`pnpm check` 最终通过：十五个组件共 596 项测试、根扩展 33 项测试和三份 VSIX 内容校验成功。十五个组件 tarball 从隔离仓库外消费者安装验证通过，打包主扩展也在隔离 VS Code 1.137.0 配置中完成 Extension Host 全套用例并以退出码 0 结束。

本地候选产物 SHA-256：

- `php-companion-0.4.5.vsix`：`f842d22469a6ec94ade545d4604e1894216a6a3a82aabbb3fa48d56ee23e1b76`
- `php-companion-open-source-pack-0.4.5.vsix`：`c3e0071501754fef441d831d1ebc12e59ad1a9ea066eaff9ff3b60d038ff46a3`
- `php-companion-recommended-pack-0.4.5.vsix`：`eacab0619981d9e0246a4151f8f1da10981b5fe6dfcdf1425c525d1407282fa0`
