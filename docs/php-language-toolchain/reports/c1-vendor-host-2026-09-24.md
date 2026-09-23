# C1 Composer vendor 编辑链

日期：2026-09-24。隔离 VS Code 1.139.0 Core 宿主在复制的独立 Composer 项目中写入 `composer.lock`、`vendor/composer/installed.json` 和一个 PSR-4 vendor 接口 `Acme\C1\VendorContract`。项目内的 `VendorPrinter` 实现该接口，Consumer 通过 `use` 引入接口，并包含一个有同名方法、签名不同的无关类。

在 Consumer 的未完成 `$value->renderVen` 输入上，Completion 仅返回一个归属 vendor 接口的 `renderVendor(int $count): string` 候选。完整调用的 Hover 和 Signature Help 返回同一签名；Definition 精确指向 vendor 文件；Implementation 精确指向项目实现；References 包含 Consumer 的接口调用，不包含无关类的同名调用。测试直接调用 VS Code 编辑命令，自动、PHP 7.2、8.1、8.5 四种设置串行运行，四次退出码均为 0。TypeScript 与 ESLint 检查通过。

这证明一个小型已安装 Composer 依赖的可见查询链。它不覆盖大型 vendor 树、多根工作区、真实建议弹窗显示时间、Remote 或完整 Open Source Pack 组合；这些仍属于 C1 与后续组合验收任务。此次未打包 VSIX，未改业务项目代码。
