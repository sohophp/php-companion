# SPL 目录迭代器内建报告

日期：2026-09-13。范围：PHP 7.2–8.5 的 `DirectoryIterator`、`FilesystemIterator`、`RecursiveDirectoryIterator` 与 `GlobIterator`，以及真实编辑器中的迭代、成员、签名和导航。

## 已完成

- 四个目录迭代器的完整公开成员、继承接口和十二个 Filesystem flags 进入共享规格。
- `DirectoryIterator::current()` 与 foreach 值保留实际 iterator 对象；`RecursiveDirectoryIterator::getChildren()` 保留实际子类。`FilesystemIterator::current()` 可由运行时 flags 切换，因此返回保持 `string|SplFileInfo|static`，不会把 pathname 或自定义 info class 错报成固定对象。
- PHP 7.2–7.4 的 `$path`、`$position`、`$allow_links` 和无原生类型参数，与 PHP 8 的 `$directory`、`$pattern`、`$offset`、`$allowLinks` 分别生成。PHP 8.1 tentative returns 和 flags 位值变化、PHP 8.4 typed constants 同样按目标版本选择。
- `FOLLOW_SYMLINKS`/`OTHER_MODE_MASK` 在 PHP 7.2–8.0 为 `512/12288`，PHP 8.1–8.5 为 `16384/28672`；规格保留这一运行时可见边界。

## 依据

公开 API 依据 PHP 官方四个类的手册页。PHP 7.2、7.3、7.4 的参数和 flags 核对 php-src 对应分支 `ext/spl/spl_directory.c`/`.h`；PHP 8.0、8.1、8.2、8.4、8.5 的声明核对 `ext/spl/spl_directory.stub.php`/`.h`。逐项链接记录在 `packages/language-spec/SOURCES.md`。

本机 `/usr/bin/php72`、`php74`、`php81`、`php82`、`php84` 与 `php85` 已核对 Reflection 参数、tentative returns、常量类型和值，以及三种 Filesystem current mode、Directory current 自身身份和 recursive child 子类保留行为。本机缺少 PHP 7.3 与 8.0，相关边界由官方源码和相邻运行时交叉确认。

## 验证

- `pnpm check` 通过：language-spec 44 项、semantic 237 项、language-server 140 项；十五个组件共 563 项，根扩展 33 项，合计 596 项。TypeScript、ESLint、组件测试、根测试、三份 VSIX 打包和内容检查全部通过。
- `pnpm verify:packages` 通过：十五个组件 tarball 均从隔离消费者安装并验证。
- PHP 8.5 fixture lint 与 Extension Host TypeScript 编译通过。VS Code 1.137.0 的纯净 packaged Profile 和含七项第三方能力的 Open Source Profile 均以退出码 0 完成；新增目录对象/foreach/recursive child Definition、版本化 Signature Help 和 builtin navigation 由真实 Provider 验证。
- Open Source Profile 同时启用 EditorConfig 0.18.2、PHP CS Fixer 0.3.21、PHPUnit 3.9.40、YAML 1.24.0、TwigPlus 1.3.7、Symfony Language Tools 0.20.0 与 PHP Debug 1.40.1；冻结第三方目录的 1,370 个文件在运行前后 SHA-256 清单完全一致。
- 主扩展 VSIX SHA-256：`036adc398cbf5b38950db5ee987b522ef49acbeb058770e71225ecd8f0202f58`。
- Open Source Pack VSIX SHA-256：`a3a56f030ed85b2cd3fdfffd72a995153656097d18cb72d39dd3d66d93c232f8`。
- Recommended Pack VSIX SHA-256：`d24ad86aea6e0d30225612449ad4b68131d4b34405f8fed7fbc70ae166b1bd32`。

## 边界

Filesystem flags 可在构造后由 `setFlags()` 修改，静态模型不会把一次构造参数永久当作对象状态；current 保持安全 Union。`setInfoClass()` 可改变 file-info 实例的具体类，当前以 `SplFileInfo` 边界表达。glob 可用性仍受平台和 PHP 构建能力约束。

公开 npm 与 VS Code Marketplace 发布未执行。Windows、macOS 和 R4 的 P0–P9/F01–F14 完整验收仍保持开放。
