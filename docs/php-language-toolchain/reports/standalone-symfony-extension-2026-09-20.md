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
