# C2 当前源码集成回归

日期：2026-10-01。把 R07–R13 等近期增量放回现有协议与编辑器链验证；未打包、提交、推送、发布或更新 Profile。

## 当前结果

| 范围 | 当前证据 |
| --- | --- |
| 完整 stdio 协议 | `test/stdio.test.ts` 357/357，0 跳过，1140.02 s；设置 `PHP_COMPANION_TEST_REFERENCE_BUNDLE=/var/www/node/php-companion/dist/language-server.js`，启用通常跳过的 32 次跨进程引用缓存场景 |
| 语义当前基线 | 最新未再修改的语义源码为 16 文件、547/547，48.41 s；见一致重载参数增量日志 |
| 完整 C1 源码宿主 | Core-only，退出码 0；独立 Composer vendor、多根、未保存接收者切换，补全/参数提示/Hover/Definition/Implementation/References |
| C1 可见补全宿主 | Core-only，退出码 0；实际可见候选、交替项目类型、第三字母刷新、词中替换、Enter/Tab、模板占位符与 Undo |
| 完整 C2 源码宿主 | Core-only，退出码 0；跨文件未保存声明与实现、PHPDoc、classmap、Attribute、数组回调、属性排序、Elvis、值调用、引用返回、重载一致合同、URL 和字符串列表等既有链 |
| 完整 C3 源码宿主 | Core＋独立 Symfony，退出码 0；导入竞态/拒绝路径、生成、Safe Move、Symfony Rename、Extract Method、预览/取消/应用及一次 Undo/Redo |
| 静态检查 | 全仓 `pnpm lint`、根扩展 `tsc --noEmit`、language-server build、Symfony 源码 build 和 diff check 通过 |

357 项为整个 stdio 文件，不能称作所有组件包或整个仓库全部测试。其它包的独立测试、发布产物和真实 WSL Profile 仍使用各自证据。

## 性能与呈现

C1 的 12 次热命令样本：completion 中位 5 ms／最大 12 ms，Hover 4／8 ms，Signature 4／13 ms，Definition 3／6 ms，Implementation 4／36 ms，References 72／94 ms。此处为命令结果等待，不是可见弹窗等待，也不代替大型项目首次引用性能。

可见弹窗六次样本：236、231、246、228、254、240 ms；中位 238 ms、最大 254 ms。此采样与完整 stdio 进程并行，不能当作空闲机器或真实 WSL 窗口基准。

可见宿主仍记录 VS Code 1.140.0 的 `getItemsByProvider` renderer TypeError；相关可见列表、接受文本及 Undo 断言通过。该日志异常没有在本轮修复，不据此声称当前 UI 无异常。

## 首次 C3 配置错误

首次 C3 错把 `PHP_COMPANION_TEST_CORE_ONLY=1` 用于完整重构验收。它通过前半段后，在 Symfony Rename 的“必须存在独立扩展”前提检查失败，退出码 1。随后构建独立 Symfony，并使用 `CORE_ONLY=0` 完整复跑，退出码 0。没有修改或删除失败断言，也不把首次失败记录成源码回归。

## 复现与日志

`/tmp/sophp-completion-full-stdio-2026-10-01.log`

`/tmp/sophp-completion-current-full-c1-host.log`

`/tmp/sophp-completion-current-c1-visible-host.log`

`/tmp/sophp-completion-current-full-c2-host.log`

`/tmp/sophp-completion-current-full-c3-host.log`（配置错误）

`/tmp/sophp-completion-current-full-c3-host-corrected.log`（完整通过）

`/tmp/sophp-completion-current-{lint,extension-typecheck,lsp-build,symfony-build}.log`

冻结的 60 项、声明 D01–D30 和追加 R01–R13 保留各自正反例及映射。上述组合回归给当前源码提供集成证据；真实 WSL 人工使用、其它平台、长期会话、首次引用扫描和路线图尚未实现的支持域仍未关闭。
