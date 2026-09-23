# F04 Core 编码链 Extension Host 验证

日期：2026-09-24。运行 `pnpm test:extension:c1`，先构建源码，再以 VS Code 1.139.0 Linux x64 隔离 Extension Host 执行 `test/extension/suite/c1.ts`。测试复制本仓 `test/extension/baseline` 到临时 Composer 工作区，将索引模式设为 `onDemand`，以开发扩展方式加载 SoPHP Core；外部扩展被禁用，VS Code 内建扩展仍可运行。没有构建或安装 VSIX，没有读取或修改业务项目。初次启动的目标 PHP 版本为 `auto`；随后复用已编译源码，分别以 `PHP_COMPANION_TEST_C1_PHP_VERSION=7.2`、`8.1`、`8.5` 运行同一测试入口。

用例在临时工作区写入接口、实现类、无关同名类及 Consumer，通过真实 VS Code 命令调用 Completion、Hover、Signature Help、Definition、Implementation 和 References。六项均返回预期成员或位置；同一编辑器文档未保存地把接收者从接口改为无关同名类后，再次 Definition 只落到新类声明。测试检查文档仍为 dirty。四次扩展宿主均以退出码 0 结束。

| 目标 PHP 版本 | 首次补全单次观测 | 编辑链结果 |
| --- | ---: | --- |
| auto | 479 ms | 六项请求及未保存 Definition 通过 |
| 7.2 | 195 ms | 同上 |
| 8.1 | 222 ms | 同上 |
| 8.5 | 188 ms | 同上 |

这些数值是各次从首次补全命令发起到得到期望候选的单样本，包含启动就绪轮询，不是热查询 P95，也不证明长期等待时间。三个版本使用相同的通用 PHP 语法，只证明各版本设置下的基础编码链，不能证明版本特有语法边界。测试验证了 VS Code 命令可见结果；它没有证明打包 VSIX、完整 Open Source Pack、Remote Extension Host 归属、Windows/macOS 或持续人工编码体验。具体用例代码和重跑入口保留在仓库，后续 C1 修复可以复用同一宿主门禁。

查询版本保护修改后，`pnpm test:extension:c1` 对重新构建的 Core 再运行一次 auto 配置：六项请求和未保存 Definition 仍通过，首次补全单次观测为 180 ms，宿主退出码 0。这次复测不扩展前述版本矩阵或性能结论。
