# PHP 8.5 Clone With 类型传播验收

日期：2026-09-13。范围：普通 `clone` 与 PHP 8.5 `clone($object, [...])` 简单属性更新的对象类型传播。

## 已实现行为

- 普通 `clone $object` 保留可证明且非 nullable 的对象、Union、Intersection 与泛型身份。
- clone-with 对当前 grammar 兼容层允许的变量或成员链操作数保留同一对象类型。
- 每个更新必须使用无转义字符串字面量属性名；属性须已声明、在当前作用域可写，并且字面量值与属性类型兼容。
- 更新通过后，结果进入局部值模型，为成员 Completion 与 Definition 提供同一类型事实。
- nullable、标量、缺失或不可访问属性、动态/转义键、复杂值和不兼容更新保持 unknown。

## 依据

- [PHP 8.5 Clone With](https://www.php.net/releases/8.5/en.php#clone-with)
- [PHP RFC: Clone With v2](https://wiki.php.net/rfc/clone_with_v2)

PHP 8.5 规定 clone-with 在克隆期间按赋值规则更新属性，包含类型和可见性约束，并返回与操作数相同运行时类的克隆对象。本批只启用当前 parser 能完整验证的静态子集。

## 验证

- Semantic 覆盖普通 clone、合法 clone-with、成员链、缺失属性、不兼容值、nullable 与标量操作数。
- Language Server stdio 覆盖真实 PHP 8.5 Composer 项目的 Completion、Definition 和 nullable 负例。
- Extension Host fixture 覆盖最终打包 VSIX 的 Definition 正反例。
- PHP 8.5 wrapper 对真实 fixture 执行语法检查。

- `pnpm check` 通过：15 个组件 581 项、根扩展 33 项，共 614 项；包含类型检查、ESLint、组件/扩展测试、三份 VSIX 打包和结构校验。
- `pnpm verify:packages` 通过；15 个组件 tarball 均在隔离消费者中完成真实安装与导入。
- 同一最终主 VSIX 在 VS Code 1.137.0 的纯净 Profile 与七插件 Open Source Profile 中均以退出码 0 完成。纯净宿主日志：`/tmp/php-companion-php85-clone-with-pure-final-logs-20260913-1814`；组合宿主日志：`/tmp/php-companion-php85-clone-with-open-source-final-logs-20260913-1817`。
- fixture 增长后冷索引实测超过原同步诊断等待的 2 秒默认值；等待预算统一为既有异步 Provider 的 5 秒，诊断数量、代码、范围、消息及功能断言未放宽。
- Open Source Profile 包含 TwigPlus、Symfony Language Tools、Red Hat YAML、PHP Debug、PHPUnit、PHP CS Fixer 与 EditorConfig；冻结第三方目录运行前后均为 1,370 个文件，聚合 SHA256 均为 `1f5c87b2dffb64ed8801e6b303d728772b7978d181447ea1bd2ab5dd97a97aad`。
- 最终制品 SHA256：主扩展 `aeb74fc0a43bbf0a81a4aa6672bf0d2cf489f3525897ef25b36889a8a78f7ad2`；Open Source Pack `cd02020ac05ed8cc2ade0ff9688bb30962f3e4cc6197fb92b08218760c6b44f0`；Recommended Pack `71fe00770f52ce6762e2fcf4a6ac037bdb70102ea651a602600b2d1a9f978774`。
