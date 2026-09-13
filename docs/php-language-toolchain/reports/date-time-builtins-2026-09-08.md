# Date/Time 内建符号验收

日期：2026-09-08。范围：PHP 7.2–8.5 的 Date/Time 核心类型、版本边界、DatePeriod 构造重载与迭代值传播。

## 支持范围

- 内建目录加入 `DateTimeInterface`、`DateTime`、`DateTimeImmutable`、`DateTimeZone`、`DateInterval` 与 `DatePeriod` 的已审计高频常量、方法、工厂、序列化回调和返回契约。
- `DateTime::createFromImmutable` 从 PHP 7.3 提供；`createFromInterface` 从 PHP 8.0 提供；`ISO8601_EXPANDED` 与 `DatePeriod::INCLUDE_END_DATE` 从 PHP 8.2 提供；Date/Time 专用异常树与 `DatePeriod::createFromISO8601String` 从 PHP 8.3 提供；timestamp factory 和 microsecond API 从 PHP 8.4 提供。
- `DatePeriod` 在 PHP 7.x 关联 `Traversable<int, DateTimeInterface>`，PHP 8.0 起关联 `IteratorAggregate<int, DateTimeInterface>`；foreach 值因此可安全使用 `DateTimeInterface` 公共成员。
- `DatePeriod` 的 recurrence、end-date 和 ISO string 三种构造形式分别建模。Signature Help 在尚未提供区分实参时保留全部合法候选，并按位置/命名参数和已证明类型选择最佳重载。

## 精准边界

目录只写入本轮逐项核对的 Date/Time API，不由当前 PHP 8.5 Reflection 反推旧版本。PHP 7.2–8.5 无法用同一原生声明表达的返回差异使用 PHPDoc Union；PHP 8.3 起会抛专用异常的 `modify()` 与 `createFromDateString()` 使用成功返回类型，避免继续传播已不可能返回的 `false`。

`DatePeriod` 的具体迭代对象会受构造输入影响，当前公共模型只承诺 `DateTimeInterface`，不猜测 `DateTime` 或 `DateTimeImmutable`。PHP 8.4 对 ISO string 构造形式的弃用状态尚未进入通用 deprecated 标签协议，但该仍可调用的签名继续可见。

## 验证

- language-spec 9 项、phpdoc 12 项、parser 41 项、project 6 项、index 7 项、type-system 17 项、interop 3 项、semantic-provider 5 项、semantic-provider-host 4 项、framework-symfony 20 项、framework-doctrine 2 项、semantic 180 项、refactor 6 项、Language Server 64 项、testkit 5 项全部通过；十五个组件共 381 项，加仓库既有 30 项共 411 项。
- 版本正反例覆盖 PHP 7.2、7.3、8.0、8.2、8.3 与 8.4；重载测试覆盖三个参数名集合、具名候选筛选、int recurrence 与 DateTimeInterface end-date 分支。
- 全部 PHP 7.2–8.5 生成 stub 均为 0 个 parser error；8.5 目录包含 64 个类型和 183 个 callable。
- TypeScript、ESLint 与 `git diff --check` 通过；十五个组件 tarball 从仓库外隔离 consumer 安装运行通过。
- 主 VSIX 内容校验通过，SHA-256 为 `d5f0c24709b2433224a0f2809f75f1bc99b6bda7236e62e5c2a6561280e9faa2`。
- 最终主 VSIX 在隔离 VS Code 1.136.1 Extension Host 中退出码为 0；真实编辑请求验证 DatePeriod foreach 值成员 Definition 进入只读内建文档，并在第三个 int 实参完成后选择 recurrence 构造重载。既有 Generator、异常和其他完整 Host 用例同时通过。
- 宿主日志未发现 AssertionError、超时、保存冲突、ENOENT、EPIPE 或 stream-destroyed。

宿主日志位于 `/tmp/php-date-time-vscode-logs-20260908-1757`。本轮只重建主扩展 VSIX；Open Source Pack 与 Recommended Pack 仅执行既有产物内容校验，没有重建，也没有公开发布。

## 审计来源

- [DateTimeInterface](https://www.php.net/manual/en/class.datetimeinterface.php)、[DateTime](https://www.php.net/manual/en/class.datetime.php)、[DateTimeImmutable](https://www.php.net/manual/en/class.datetimeimmutable.php)
- [DateTimeZone](https://www.php.net/manual/en/class.datetimezone.php)、[DateInterval](https://www.php.net/manual/en/class.dateinterval.php)、[DatePeriod](https://www.php.net/manual/en/class.dateperiod.php)
- [Date/Time 异常树](https://www.php.net/manual/en/datetime.error.tree.php)
- [DateTime::createFromImmutable](https://www.php.net/manual/en/datetime.createfromimmutable.php)、[DateTime::createFromInterface](https://www.php.net/manual/en/datetime.createfrominterface.php)、[DateTime::modify](https://www.php.net/manual/en/datetime.modify.php)
- [DateInterval::createFromDateString](https://www.php.net/manual/en/dateinterval.createfromdatestring.php)、[DatePeriod::createFromISO8601String](https://www.php.net/manual/en/dateperiod.createfromiso8601string.php)、[DatePeriod::getRecurrences](https://www.php.net/manual/en/dateperiod.getrecurrences.php)
