# Symfony / Doctrine 派生事实持久化验收

日期：2026-09-14。范围：P3 的每文件框架派生事实缓存、开放文档优先级、热启动恢复和单条缓存损坏恢复。

## 实现

- Language Server 缓存升级为 `semantic-v44-php-<version>`。每个条目用 SHA-256 同时校验 schema 72 语义快照、Symfony Controller/Twig 上下文与 Doctrine repository/association 事实。
- 恢复前验证 URI、源码范围、序列化类型结构、Doctrine 字段和封装校验值；Controller/Twig 来源位置的 `snapshotVersion` 会重设为当前索引 generation。
- 冷索引仅对包含框架候选标记的 PHP 文件运行对应 analyzer。热索引直接恢复已经验证的事实，不再逐文件重复 Symfony/Doctrine PHP 分析。
- 如果编辑器中的开放文档与缓存源码不同，该条目拒绝恢复并使用开放内容重建；开放内容与磁盘内容不同时不会写入以磁盘时间戳和大小为键的缓存。

## 精准性证据

- Language Server 单元测试覆盖 Controller/Twig 与 Doctrine 事实往返、generation 重设、事实篡改、URI 不匹配、开放源码不匹配和封装 schema 不匹配。
- 1,000 与 10,000 文件进程级基准均确认冷索引只分析 2 个框架候选文件；热启动恢复全部文件，PHP 解析数与框架分析数均为 0，同时保留 Controller 上下文、Doctrine 关联和跨文件构造器事实。
- 修改基类后，恢复的反向依赖图会失效消费端派生构造器事实。篡改单个缓存条目后只有该文件重新解析，声明仍保持唯一。

## 10,000 文件 Linux x64 基准

命令：

```bash
pnpm benchmark:persistence -- 10000
```

结果：冷索引 16,932.74 ms；热恢复 3,897.67 ms；热/冷比 0.2302。热启动恢复 10,000/10,000 个条目，PHP 重新解析 0，框架 PHP 分析 0。机器可读结果见 [persistent-framework-facts-10000-linux-x64-2026-09-14.json](persistent-framework-facts-10000-linux-x64-2026-09-14.json)。

## 本地发布门禁

- TypeScript、lint、16 个组件 624 项测试和根扩展 33 项测试通过，共 657 项。
- 16 个组件 tarball 在仓库外隔离消费者中安装验证通过；三份 VSIX 内容验证通过。
- VS Code 1.137.0 的隔离 Profile 从打包主 VSIX 启动 Extension Host，测试进程退出码为 0。
- 主 VSIX SHA-256：`3b49330c482bdbc9055ea2eca9e5118185109c9c315fe379517c91114f7de1ce`。

Linux、Windows 和 macOS 的 v44 CI 结果将在提交候选后补入本报告。

## 边界

本增量只持久化从单个 PHP 文件稳定派生的框架事实。Symfony YAML、编译容器 XML、Composer 和外部 semantic provider 仍按项目刷新；Callable 调用依赖及声明/方法体更细粒度磁盘拆分仍在 P3 后续范围。合成项目基准不代替 Remote 或真实项目长会话验收。
