# Symfony resource 服务声明刷新

日期：2026-09-20

功能提交：`954dfc4622574aaf8ae9a264d9912e44e7d855a3`

## 问题

Symfony 的 `App\\: { resource: '../src/' }` 等服务原型依赖完整项目类型目录展开。普通 `src/*.php` watcher 只更新 PHP/Doctrine/Controller 事实时，类新增、删除、改名或移出 resource 范围不会刷新权威服务目录，`#[Autowire(service: ...)]` 补全、服务导航和依赖注入分析可能继续显示旧服务。

## 实现边界

- watcher 确认 PHP 声明发生变化或文件删除后，将对应 Composer 根加入容器刷新集合；只修改方法体不会刷新服务 Provider。
- 同一 watcher 通知中的多个 PHP 声明变化按根目录合并，只执行一次权威容器 Provider。
- Symfony 配置文件与 PHP 声明位于同一批次时使用同一个刷新集合，不会先后重复执行。
- Container Provider 在所有 PHP 增量和 Controller 上下文批量提交后运行；`[index:delta] complete` 只在新服务目录提交后发布。
- 打开文档的声明变化使用现有 debounce；未保存源码快照继续覆盖磁盘，关闭或删除未落盘类型时也安排刷新。
- 完整项目索引尚未建立时不以不完整类型目录展开 resource；既有索引完成门禁保持不变。

## 精准回归

新增 stdio 生命周期测试，以 Provider 的项目类型输入模拟 resource 展开。初始 `App\\Service` 出现在 `#[Autowire(service: "App…")]` 补全中；关闭文件经 watcher 改为 `App\\RenamedService` 后，Provider 计数恰好增加 1，delta 完成后的补全包含新服务且不再包含旧服务。

## 验证

- Language Server 5 个测试文件共 193 项通过。
- Language Server TypeScript 与相关 ESLint 通过。
- 24 个 monorepo 组件从真实 tarball 在仓库外安装运行通过。
- 四份 VSIX 内容门禁通过；VS Code 1.138.0 打包 Extension Host 同时加载核心与 Symfony 扩展，退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 确定性预检通过；对应 JSON 报告随本次证据提交保存。

## 候选与安装

候选目录：`artifacts/php-companion-alpha-0.4.5-954dfc46/`

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `bb6bb41de29f31341ddba2993b6a61ad04ba9e67e4f6b8f9c9581e4b9c29b642` |
| `php-companion-symfony-0.4.5.vsix` | `3882a86cb51c0c42d04c3ffae02936b132f6bce7017ffbc1a051db1f1451aabf` |
| `php-companion-open-source-pack-0.4.5.vsix` | `e4f3c4b6817b1bb92e485485e0f34ef960efc8688fd9cc959a469e90de4e2227` |
| `php-companion-recommended-pack-0.4.5.vsix` | `ac80650a35bb7b8df4fa6c91c409083bf5eb309ec7dd3b9d9188ba5070d18ad0` |

核心和 Symfony 候选已覆盖安装到 WSL RockyLinux8。构建与安装目录中的 `dist/language-server.js` SHA-256 均为 `bb978ea9b7b98bac8062495cee8277336cf8e77006399b227529b8bb820fc6e5`；只重启语言服务器后，当前 Extension Host 已自动启动新进程。

本次修复 resource 展开服务目录的声明生命周期，不扩展动态 factory、条件服务或无法静态证明的 Symfony 配置。
