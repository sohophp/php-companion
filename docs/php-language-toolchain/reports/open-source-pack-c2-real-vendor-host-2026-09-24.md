# Open Source Pack：真实 vendor 与大型项目的编辑反馈

日期：2026-09-24。范围为独立临时 Composer 项目，不含业务项目。隔离 VS Code 1.139.0 Linux Extension Host 加载完整 11 项 Open Source Pack 源码 Profile，嵌套项目含 1,029 个冻结 vendor PHP 文件及 9,100 个生成 PHP 文件，共约 10,131 个 PHP 文件。默认索引模式为 `onDemand`。没有打包 VSIX。

新增可选门禁 `PHP_COMPANION_TEST_PROFILE_REAL_VENDOR=1`：在完整组合工作流后，将真实 vendor 复制进测试项目，连续 50 次未保存地切换跨文件方法的 `string/int` 返回类型。每次同时核对使用方局部 `$value` Hover 与参数类型诊断；每 10 次及末次核对 Definition 和 Signature Help。门禁记录从提交编辑到 Hover 与诊断一致的等待，以及 Definition 查询次数。

| 运行 | 编辑反馈 | Definition |
| --- | --- | --- |
| 完整 Pack，9,100 个生成文件，50 轮 | P50 110 ms，P95 119 ms，最大 388 ms；宿主退出码 0 | 六次检查的等待为 1,404/5/5/11/7/9 ms；首次需 3 次请求，其余一次 |
| 重复完整 Pack，50 轮，曾尝试收紧 Symfony 转发 | P50 108 ms，P95 125 ms，最大 402 ms；宿主退出码 0 | 六次检查的等待为 1,392/4/5/5/7/8 ms；首次需 18 次请求，其余一次 |
| 无生成文件，2 轮 | P50 96 ms，最大 341 ms；宿主退出码 0 | 第一次一次成功、6 ms；第二次需 21 次请求、1,550 ms |
| 同样约 10,131 文件的真实 stdio | 首次编辑后诊断约 87 ms、Hover 约 2.7 ms | 首次 Definition 一次成功、约 4.4 ms |

**未关闭问题：** 在完整 Pack 宿主的未保存返回类型切换后，Definition 偶尔先返回空数组，约 1.4–1.6 秒后才得到正确声明。延迟也在没有生成文件时出现，且可落在第二次切换；不能归因为项目规模或仅归因为冷启动。曾尝试在 Symfony 扩展只转发 PHP 字符串位置的 Definition；延迟仍存在，该未证实的改动已撤销。当前门禁允许有界重试并记录次数，故退出码 0 只证明最终结果与编辑反馈一致，**不证明首次跳转已经可靠**。下一步应记录 Core LSP 接收的文档版本、每次 Definition 的返回及宿主 Provider 结果，定位空结果发生在请求到达前、Core 内部还是 VS Code 合并阶段，再修复并把门禁收紧为首次请求成功。

本轮仅用源码 Profile 和本机 Extension Host。WSL Remote、Windows/macOS、长期实际操作与 R4 验收仍需独立证据。
