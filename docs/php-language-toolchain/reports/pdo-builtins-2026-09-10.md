# PDO 内建目录验收

日期：2026-09-10。范围：PHP 7.2–8.5 的 PDO 核心连接、语句、异常和跨驱动稳定常量。

## 已实现契约

- `PDO` 覆盖构造、事务、错误信息、`exec`、属性、驱动列表、`lastInsertId`、`prepare`、`query`、`quote` 与 PHP 8.4 `connect`。
- `PDOStatement` 覆盖引用绑定、执行、游标、列信息、行数与结果抓取；PHP 8 使用真实 `string|int` 参数、nullable 参数和 variadic fetch 参数。
- `PDOException::$errorInfo` 保留 nullable array，`PDOStatement::$queryString` 在 PHP 8 保留 string。
- `prepare`、`query`、`exec`、`quote`、`fetchObject` 与 `getColumnMeta` 的 `false` 失败边界不被抹除；`fetch`/`fetchColumn` 保持 mixed，因为合法值与失败 false 不能仅从调用签名区分。
- `PDO::connect(): static` 只在 PHP 8.4+ 生成；`PDOStatement::setFetchMode()` 同期从 bool 收窄为 literal true。

## 保守边界

当前仅收录 PDO 核心跨驱动稳定契约。MySQL、PostgreSQL 和 SQLite 等驱动专属子类、常量与属性需要按已启用扩展目录独立生成；不会把某一机器安装的驱动符号冒充为所有项目均可用。`FETCH_CLASS` 等模式相关的行 shape 暂不根据动态选项猜测具体对象或数组结构。

## 当前验证

- language-spec 15 项测试通过，覆盖 PHP 7/8 参数边界、失败返回、PDOStatement 迭代契约、PHP 8.4 工厂与 literal true 返回。
- Language Server 111 项测试通过，覆盖 `prepare` 后的 false 守卫、语句成员、参数身份、常量和 PHP 8.4 工厂 Definition/Signature。
- 九套 PHP 7.2–8.5 完整生成 stub 均为 0 个 parser error。
- 本机 PHP 7.2、7.4、8.1、8.4 和 8.5 Reflection 探针核对核心类、方法、参数、返回、接口与属性；PHP 8.5 常量值另行逐项核对。
- `pnpm check` 通过：十五个组件 497 项测试与根包 33 项测试，共 530 项；生命周期修复后同一 530 项测试再次通过。
- `pnpm verify:packages` 通过：49 个 Changeset 形成十五个组件发布计划，十五个真实 tarball 在仓库外隔离安装运行通过。
- Extension Host fixture 验证 PDO 类型、方法、属性、常量和 PHP 8.4 工厂导航；同一主 VSIX 在纯净与 Open Source Profile 均以退出码 0 完成。
- Open Source Profile 的最终运行在退出阶段复现 Symfony Language Tools 0.20.0 的间歇性 EPIPE；堆栈来自第三方扩展，未阻止功能断言或退出码 0。PHP Companion 自身的关闭流错误在生命周期修复后未复现。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `338af4796bbca7f94f98552c32792b905a52f805b7b083e2983c5360ce4495c3` |
| `php-companion-open-source-pack-0.4.5.vsix` | `6e94147c76605a18de7606ee9e916eb1f5c5028808c3419cd6482e87e655b1e1` |
| `php-companion-recommended-pack-0.4.5.vsix` | `4cc01d830efefec46fc0408b171214d5098fb0b14d99837623933dd5ea3bfa6d` |

数据来源：[PDO](https://www.php.net/manual/en/class.pdo.php)、[PDOStatement](https://www.php.net/manual/en/class.pdostatement.php)、[PDOException](https://www.php.net/manual/en/class.pdoexception.php)与[PDO 常量](https://www.php.net/manual/en/pdo.constants.php)。

公开 npm 与 Marketplace 发布未执行。
