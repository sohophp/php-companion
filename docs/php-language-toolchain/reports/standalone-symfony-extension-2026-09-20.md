# 独立 Symfony 扩展首项迁移

日期：2026-09-20

## 交付行为

新增可单独安装的 `sohophp.php-companion-symfony` VSIX，扩展 manifest 只依赖 `sohophp.php-companion`。激活时显式取得核心 plugin API v1；版本不兼容会拒绝启动，不会猜测内部协议。

`phpCompanion.symfony.winstarRoutes.enabled` 开启时，Symfony 扩展注册 `php-companion.symfony.winstar-routes`，进程入口和全部依赖随自身 VSIX 打包。设置关闭、工作区变化或扩展停用会撤销 registration。核心发现独立 Symfony 扩展已安装时不再注册原有 `php-companion.winstar-routes`，从而只有一个运行时路由所有者；未安装独立扩展时保留原 Alpha 回退。

Open Source Pack 暂不引用尚未公开发布的 Symfony 扩展 ID，避免安装 Pack 时向 Marketplace 获取不存在的依赖。Alpha 候选 schema 2 改为四份本地产物，并明确按核心、Symfony、Pack 的顺序安装；预检继续兼容三产物 schema 1 历史候选。公开发布后再把 Symfony 扩展加入 Pack。

## 精度证据

单元测试覆盖注册一次、幂等同步、撤销、API 版本拒绝及核心回退所有权选择。四份 VSIX 内容门禁检查 Symfony 身份、唯一核心依赖、扩展入口、Winstar provider 入口及没有遗留 workspace runtime import。

VS Code 1.138.0 打包 Extension Host 同时加载核心和 Symfony 两份 VSIX，验证核心 API v1、Symfony API v1，以及设置切换导致 provider 注册后再撤销；既有完整 PHP 编辑、导航、Rename、Safe Move 和 Undo/Redo 用例继续通过。

独立 Symfony VSIX 中的实际 provider bundle 对真实 `/var/www/php/8.5/winstar2024` dev Router 执行成功，返回 provider 身份 `php-companion.symfony.winstar-routes`、完整 generation 和 362 条可定位模块路由。前三项为 `admin.AdminGroups.actions`、`admin.AdminGroups.add`、`admin.AdminGroups.addSubmit`。

## 剩余迁移

核心仍直接组装静态 Symfony 服务、注入、事件、标准路由和 Controller/Twig 上下文分析。后续需要扩展框架中立事实契约并逐项迁移；在对应双扩展测试通过后删除核心路径。当前成果证明独立安装、激活、版本协商、provider 所有权和首项真实能力已经工作，不代表 Symfony 全部能力完成拆分或已经公开发布。

## 发布门禁

功能提交为 `8dbf60e`。全仓 TypeScript、ESLint 与 `git diff --check` 通过；20 个组件 715 项、独立 Symfony 扩展 2 项、根扩展 43 项测试通过。20 个组件 tarball 通过仓库外安装与导入，四份 VSIX 内容门禁和 VS Code 1.138.0 核心+Symfony 打包 Extension Host 均通过。

候选目录为 `artifacts/php-companion-alpha-0.4.5-8dbf60eb/`：

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `9495a1066a52a0a9255a15006352e7adcb2f7645c70113f301de4c26053efd0f` |
| `php-companion-symfony-0.4.5.vsix` | `6da6b9102546a6739c90b488a6de00d742072323e071252bbb2e002cb31d06b9` |
| `php-companion-open-source-pack-0.4.5.vsix` | `efc5f16e9b7b764e0878e444ad5d3607481618070c3096a195940c1de68a7350` |
| `php-companion-recommended-pack-0.4.5.vsix` | `6350eaa3f05fbb6678509fa11416b00cd1834d7fe3ced0225834f2d37d68d36d` |

`sha256sum -c SHA256SUMS` 四项均为 OK，Winstar PHP 8.5 和 CoreRepo PHP 7.2 的 schema 2 候选预检均通过。核心与 Symfony VSIX 已依次安装到 WSL RockyLinux8，安装文件与构建输出哈希一致：

- 核心 `dist/extension.js`：`edf98ad5b97e7a9993ab0800a14ac1ccab2a7ffe1e175c0e3fabcfc00cc50551`
- 核心 `dist/language-server.js`：`79c28a48fd84483ec6de28aa9589d3568eba8884b3c9e72a93756d9e8f5114bc`
- Symfony `dist/extension.js`：`2998e6950537e7a68dae8653278f69c8dc73d71acc83eb409babe1710e373e79`
- Symfony `dist/winstar-route-provider.js`：`c1ac36f6008f46f1f9dcc0101b28ccbaff3db5eff6965efb5e89ee2779c6a226`

已安装 Symfony provider bundle 再次执行真实 Winstar 探针，仍返回完整 362 条路由。Alpha Profile 需要执行 `Developer: Reload Window` 才会加载新安装的两份扩展。
