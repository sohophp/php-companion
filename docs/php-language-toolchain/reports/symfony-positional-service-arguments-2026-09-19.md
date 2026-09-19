# Symfony 位置服务参数映射（2026-09-19）

## 目标

把 Symfony 服务配置中的位置参数精确映射到 PHP 构造参数序号，使显式服务引用参与 Hover、Definition 和类型推断，同时避免一个标量参数让整个服务的注入关系失效。

## 已实现边界

- `services.php` 支持 `arg(0, service('...'))`、数字字符串索引，以及 `args([...])` 中的顺序项、非负整数键、数字字符串键和 `$name` 具名键。
- `args()` 按 Symfony `setArguments()` 语义替换之前的显式参数集合；后续 `arg()` 只替换同一名称或序号。数组自动序号遵循已证明的非负整数键顺序。
- YAML `arguments` 同时支持 sequence、非负整数键、数字字符串键和 `$name` 键；XML `<argument>` 支持声明顺序、`index`、数字 `key` 与 `$name` key。
- 每项都区分服务引用和其他显式值。服务引用解析到已注册服务；标量、`null` 或无法静态证明的值只阻止该名称或序号回退到自动装配。
- 显式参数优先于 `bind`、`#[Target]`、具名 alias 和类型推断；即使服务自身 `autowire: false`，可证明的显式服务参数仍可导航。
- 语义层已有的 `ConstructorParameterInfo.parameterIndex` 直接进入 framework-symfony 解析器，没有按参数名猜测位置。Symfony 来源事实缓存升级到 `symfony-facts-v8`，旧缓存自动重建。

负数、动态索引、unpack、动态数组、参数占位符中的服务 ID 及无法证明的配置保持 unknown。位置参数只映射构造函数；方法调用和属性注入继续使用各自已有的确定性模型。

## 验证

- framework-symfony 单元测试覆盖 PHP/YAML/XML 的位置与具名参数、顺序推进、服务引用、标量抑制、`autowire: false` 和解析优先级。
- 真实 Language Server stdio 进程中，同一 `autowire: false` 服务的第 0 个构造参数显示 Symfony binding，第 1 个显式标量参数不显示 Symfony autowiring。
- 冷写入和热恢复缓存均保留 `parameterIndex`、显式参数来源及标量抑制事实。
- 对 `/var/www/php/8.5/winstar2024/vendor` 的当前只读快照，用“包含 `ContainerConfigurator` 且文本上返回 static closure”的固定筛选得到 96 个文件；96/96 完整解析，共提取 601 个服务、794 个位置参数事实，其中 499 个是静态服务引用，295 个是精确位置抑制事实。这是静态支持子集，不代表运行时容器总量。

完整验证通过：framework-symfony 32 项、Language Server 185 项、根扩展 39 项，全仓 TypeScript 与 ESLint、16 个隔离组件 tarball、三份 VSIX 内容与校验和。功能提交为 `7b8aead`，候选目录为 `artifacts/php-companion-alpha-0.4.5-7b8aead1/`；三份 VSIX SHA-256 依次为 `2a41cc7fa75c2108abb58b3260be2a8e67506b155292cd53e78c130d3e6f3e3f`、`f689e539b5469f757d910f9522bde0cabd6f0d2c1b95e68c31d1905c28f38d3c`、`7cefb5cc57e4eedc4936581bd3778b9c81b678d01059f766c0c43dd6cd52ca72`。候选语言服务器 bundle 已原子覆盖到 WSL 已安装的 0.4.5 扩展并以 `8c845dc1042b622d7a4ea6f4e8cdfbeb83f1b1d67412588d6847728086bcc445` 核对，Reload Window 后生效。
