# PHPDoc 可空模板属性精度验收

日期：2026-09-21。范围：PHP 核心类级模板属性与泛型 mixin 返回链。

`@template T of object` 配合 `/** @var T|null */ public ?object $value` 时，语义层现在保留 `T|null`，泛型实例的空安全成员链可解析为具体实参类型。模板必须声明于该属性所在类，bound 必须精确匹配原生非空基类型；`/** @var T|null */ public object $value` 不会把非空原生声明扩大成可空。泛型 mixin 的模板转发 `@mixin Delegate<U>`、PHPDoc 目标/实参 Definition、目标类 References 和缓存恢复也增加了正反断言。

语义快照升级至 schema 80，索引缓存升级至 v61，避免相同源码从旧快照恢复出宽泛的 `object` 类型。

验证：定向样例、全仓 821 项测试、`pnpm typecheck`、`pnpm lint`、24 个隔离消费 tarball 通过。四份 VSIX 内容与 SHA-256 已校验；VS Code 1.138.0 打包宿主在隔离 Profile 中以退出码 0 完成；Winstar PHP 8.5 和 CoreRepo PHP 7.2 确定性 WSL preflight 通过。真实 WSL Remote Alpha Profile 持续编辑仍须人工验收，不计入自动门禁。

功能提交 `4647ef97282d55c2f819c32c16468598f999a394`。候选目录：`artifacts/php-companion-alpha-0.4.5-4647ef97/`。主扩展 SHA-256 为 `63c71e586b2a073095a76685e93f945fbfac551e7dba64624bd6a5eb92794c92`；独立 Symfony 扩展为 `fd8d20e952fb9f11bdea1066ec7df85836b18386c6bd3989eff078fc744866a7`；Open Source Pack 为 `856cf5cdfe3c552ab3e3b6c234319554f8ef675841ccaa54b122a11610061217`；Recommended Pack 为 `91930a4365a7ee557316d27f9701e9f15cd21818bd39526398002ee6c1698184`。

预检原始记录：[Winstar PHP 8.5](alpha-preflight-winstar-nullable-template.json)、[CoreRepo PHP 7.2](alpha-preflight-corerepo-nullable-template.json)。
