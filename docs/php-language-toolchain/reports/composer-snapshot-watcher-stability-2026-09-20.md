# Composer 快照与文件监听稳定性

日期：2026-09-20

功能提交：`bad3c0b957d106d17e7439f427ace6a6ddca9819`

## 问题

真实 Winstar 会话中的完整 PHP 索引已在 71.348 秒后结束，但旧语言服务器进程随后仍持续处理普通文件监听事件。运行约 2 小时 10 分钟后，该进程占用约 95% CPU 和 1,375,528 KiB RSS；打开的文件描述符反复指向 `vendor/*/composer.json`。

原因是每个 PHP watcher 事件都会重新执行 `loadComposerProject(root)`，递归读取根项目和依赖的 Composer 元数据。一次保存、生成文件或批量变更会产生多个事件，使已经结束的语义索引之后仍重复解析完整 Composer 图。一个 watcher 批次中的多个 Symfony 配置文件也会逐文件刷新同一工作区的容器事实。

## 修复边界

- Language Server 现在按工作区根缓存不可变 `ComposerProject` 快照，并共享进行中的加载 Promise；索引、References 候选扫描、PSR-4 namespace、声明水合、Safe Move 和文件增量更新复用同一快照。
- 只有 `composer.json` 或 `composer.lock` 变化才使快照失效；普通 PHP 文件创建、修改、删除或移动不会重读依赖图。
- `ProjectIndex` 可接受调用方已经取得的 Composer 快照，因此同一轮完整索引不会再次加载项目。
- 工作区根移除时同时释放快照。一个 watcher 通知中的 Symfony 配置变化按根目录合并，只触发一次容器事实刷新。
- 首次由语义查询触发的完整索引仍可能出现；本次修复针对索引结束后由文件监听导致的重复 Composer 图加载和持续高资源占用。

## 自动验证

- `@php-companion/index` 26 项和 Language Server 191 项测试通过；新增生命周期回归证明普通 watcher 事件保持一次 Composer 快照加载，Composer 文件变化后才增加到第二次。
- TypeScript、ESLint、24 个隔离消费者 tarball 和四份 VSIX 内容门禁通过。
- VS Code 1.138.0 打包 Extension Host 同时加载核心与独立 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过，报告随本次证据提交保存。

真实 Winstar 根目录的独立 stdio 压力探针一次发送 500 个 watcher 变化，2,947.45 ms 完成；Composer 快照只加载 1 次，进程 RSS 为 143.6 MiB，只产生目标缺失文件的一条增量完成日志，没有启动完整索引。

## 安装后运行证据

候选核心与 Symfony VSIX 已覆盖安装到 WSL RockyLinux8。构建与安装目录中的 `dist/language-server.js` SHA-256 均为 `3902428bb11bb0c345e5959cf66ff6fda2fad7e62617d996cf390e5da2d46271`。

只终止旧语言服务器后，现有 VS Code Extension Host 自动拉起新进程。新日志在启动时记录一次 `Loaded Composer project snapshot for /var/www/php/8.5/winstar2024.`；运行 2 分 15 秒时 RSS 已回落到 137,800 KiB，3 秒采样只消耗 0.020 CPU 秒，且未出现新的完整索引启动。旧进程的高占用和新进程的稳定状态因此属于同一真实工作区、同一 Extension Host 下的前后对照。

## 候选产物

候选目录：`artifacts/php-companion-alpha-0.4.5-bad3c0b9/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `e0a238621f10aa7109429717e6aa9fce1a2ba87754add5e09462727407d1c099` |
| `php-companion-symfony-0.4.5.vsix` | `3764ddec6dcd12f81864e139817554fb64921ccabb31f6d3c0ed4cf868b79927` |
| `php-companion-open-source-pack-0.4.5.vsix` | `c7f6d88e0ab26afa5b898c36b1d1fb6b319ec947f9f88e374120f1154a879ea5` |
| `php-companion-recommended-pack-0.4.5.vsix` | `37315482b1b2fea339066f137c9962cd60de4fe5a920e085d865ddae8e774178` |

这次结果关闭普通 watcher 事件重复读取 Composer 图的缺陷。Alpha 的两小时 Winstar/CoreRepo 连续编辑验收仍需按预检清单完成，不能由独立压力探针替代。
