# C1：PSR-0 与无 ripgrep 的按需类型补全

日期：2026-09-26。仅修改 SoPHP 仓库；使用独立 Composer 夹具，未修改业务项目，也未生成 VSIX。

## 改动

- Composer PSR-0 映射现进入 `onDemand` 未打开文件的类型候选搜索。路径按 PSR-0 规则验证：命名空间分隔符和类名中的下划线映射到目录；不符合映射的声明不进入补全。规则依据：[Composer schema](https://getcomposer.org/doc/04-schema.md#psr-0)、[PHP-FIG PSR-0](https://www.php-fig.org/psr/psr-0/)。
- 增加只在测试模式启用的便携搜索开关，让类型候选绕开 `rg`，走现有目录扫描与独立 worker 回退，验证没有 `rg` 时的实际 LSP 请求。
- C1 VS Code 源码宿主夹具加入 PSR-0 未打开文件的导入建议和错误路径反例。

## 已验证

- 项目映射测试 12/12；Open Source Pack 清单测试 4/4。
- 真实 stdio 定向用例：PSR-4、classmap/files、PSR-0 的相邻回归 3/3；强制便携搜索下的 PSR-4、classmap、PSR-0 同链 1/1。
- `pnpm build`、扩展测试 TypeScript、语言服务类型检查、定向 ESLint 与 `git diff --check` 均通过。
- VS Code 1.139.1 Linux x64 Core 源码宿主的完整 C1 链退出码 0；新增 PSR-0 正反例随宿主通过。
- [按需补全基准脚本](../../../scripts/benchmark-ondemand-type-completion.mjs)新增 `psr0` 模式：在 1,000、9,982、49,902 个 PHP 文件的独立 Composer 夹具中，各启动三个独立语言服务器。首次请求分别为 `53/55/59`、`66/66/68`、`120/105/109` ms，中位数 55、66、109 ms；同进程重复请求中位数 7、5、5 ms。每次返回符合 PSR-0 路径规则的 `Domain_Target_RequestTarget`。
- 隔离 VS Code 1.139.1 Linux x64 的六轮跨命名空间类型建议弹窗均显示正确目标：输入到列表可见为 `262/275/246/249/255/255` ms，中位数 255 ms、最大 275 ms；输入进入编辑区为 `58/27/36/52/31/30` ms。完整 C1 UI 宿主退出码 0，另外六轮普通建议、六轮 vendor 建议和十轮未保存接收者切换也通过。
- [锁定的本地 Composer PSR-0 依赖](../../../test/extension/real-psr0/composer.lock)通过隔离临时目录的 `composer install` 与实际 PHP 自动加载。VS Code Core 源码宿主从 `vendor/` 中未打开的 `Legacy_Component_Widget` 取得一次补全和 `use` 编辑，Definition 指向已安装包的声明；完整 C1 宿主退出码 0。带 Workbench 观察器的同组合宿主在输入 `g` 后 237 ms 显示该建议，输入进入编辑区为 28 ms，退出码 0。
- 冷启动导航曾复现缺口：未触发补全时，`new \Legacy_Widget` 的 Definition 返回空，因为定向加载只解析 PSR-4。现在同一加载路径包含 Composer 项目及依赖的 PSR-0 映射；真实 stdio 正例跳到 `legacy/Legacy/Widget.php`，错误路径 `legacy/Wrong.php` 仍返回空。锁定的本地依赖宿主把 Definition 移到补全前执行，整个 C1 链退出码 0；相邻 PSR-4、classmap/files 定向回归 3/3 通过。

## 边界与下一步

这是 Linux 源码宿主，不是安装 VSIX 后的真实 WSL Remote 操作。PSR-0 的规模数据是合成夹具的 LSP 响应时间；六轮弹窗数据来自 PSR-4 跨命名空间类型。已安装 PSR-0 包是仓库内的本地 path repository 夹具，不是公开第三方包；其弹窗只测一次。当前源码也未进入冻结候选 `15a5254`。下一步检查较长会话、安装候选后的真实 WSL Remote 和跨平台行为；冻结新候选时才同批打包 Core、Symfony、Pack 三份 VSIX。
