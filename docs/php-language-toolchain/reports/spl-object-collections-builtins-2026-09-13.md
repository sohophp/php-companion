# SplObjectStorage / SplFixedArray 内建报告

日期：2026-09-13。范围：完成 PHP 7.2–8.5 的 `SplObjectStorage` 与 `SplFixedArray` 公开契约、泛型传播、静态工厂模板反推、版本边界和真实打包编辑器验证。

## 已完成

- `SplObjectStorage<TObject,TInfo>` 保留对象键、附加信息、`Iterator<int,TObject>`、`ArrayAccess<TObject,TInfo>`、序列化成员和完整公开方法。`current()`、`getInfo()`、`offsetGet()` 与 foreach 会分别传播对象或可空附加信息类型。
- PHP 7.2/7.4 的参数名和 magic serialization 差异、PHP 8 的原生参数与 tentative return、PHP 8.4 `SeekableIterator::seek()`，以及 PHP 8.5 `attach()`/`contains()`/`detach()` 弃用均由目标版本选择。
- `SplFixedArray<TValue>` 把初始化槽位建模为 `TValue|null`，并通过 offset、foreach、`toArray()`、`getIterator()` 与 `jsonSerialize()` 传播。PHP 8.0 从 `Iterator` 切换为 `IteratorAggregate`，PHP 8.1 增加 JSON，PHP 8.2 增加 magic serialization，PHP 8.4 标记 `__wakeup()` 弃用。
- `SplFixedArray::fromArray([new Item()])` 可从无键对象数组字面量反推 callable 模板并产生 `SplFixedArray<Item>`。共享语义修复受 256 节点和既有控制流深度预算约束；显式键、unpack、未知值或超预算结构保持 unknown。

## 依据

公开成员、接口与迁移边界依据 PHP 官方 [`SplObjectStorage`](https://www.php.net/manual/en/class.splobjectstorage.php)、[`seek()`](https://www.php.net/manual/en/splobjectstorage.seek.php)、[`SplFixedArray`](https://www.php.net/manual/en/class.splfixedarray.php)、[`fromArray()`](https://www.php.net/manual/en/splfixedarray.fromarray.php)、[`setSize()`](https://www.php.net/manual/en/splfixedarray.setsize.php)、[`__wakeup()`](https://www.php.net/manual/en/splfixedarray.wakeup.php)、[PHP 8.0 SPL 迁移说明](https://www.php.net/manual/en/migration80.incompatible.php#migration80.incompatible.spl)与[PHP 8.5 弃用清单](https://www.php.net/manual/en/migration85.deprecated.php)。

`/usr/bin/php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 Reflection 输出逐版本核对接口、方法、参数、原生类型、tentative return 和弃用状态。当前 PHP 手册的 `SplFixedArray` 类 synopsis 仍列出 PHP 8 已移除的直接 Iterator 方法，因此接口转换以实际运行时和迁移说明交叉确认。

## 验证

- language-spec：37/37；semantic：232/232；language-server：133/133。十五个组件共 544 项，根扩展 33 项，总计 577 项。
- `pnpm check` 在一次既有 stdio 用例的 6 秒响应抖动后单独复跑通过，并由第二次完整执行通过；TypeScript、ESLint、全部测试、三份 VSIX 构建和内容检查成功。
- `pnpm verify:packages` 从仓库外隔离消费者验证十五个真实组件 tarball。
- 最终主 VSIX 在 VS Code 1.137.0 纯净 Profile 与 Open Source Profile 中均以退出码 0 完成；真实请求覆盖对象/info/固定槽位/工厂返回的 Definition，以及关键成员 Signature Help。Open Source Profile 的 1,370 个第三方文件前后 SHA-256 清单一致。
- 主 VSIX SHA-256：`869fe8eb0a1ae15342b9678b50301c731c5159ad4d313ac7d6334003ad792427`；Open Source Pack：`f0219a99e6643d26f8f8cdfcc7c8f52eeb9d9c9160d132db9d046d7f66c3d6ce`；Recommended Pack：`dff0ef037fe8291cfc4619b29308d806d054dbe9e2a59994543ac8039815eef0`。

## 边界

`SplObjectStorage` 的 info 默认值为 null，`SplFixedArray` 新槽位同样为 null，因此公共模型保留可空分支。当前不根据运行时 `setInfo()` 调用历史改变整个 storage 的模板，也不从带显式键、unpack 或动态数组构造猜测 `fromArray()` 的模板实参。PHP 8.5 的 alias 弃用按声明展示；调用者仍可导航并获得签名。

Open Source Profile 使用 Symfony Language Tools 0.20.0；它在合成无 `vendor/` fixture 中仍打印已记录的 destroyed-stream 上游日志，但全部 Companion 断言及宿主退出码通过。真实 Winstar source-index-ready 证据由独立 Symfony 报告覆盖。

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
