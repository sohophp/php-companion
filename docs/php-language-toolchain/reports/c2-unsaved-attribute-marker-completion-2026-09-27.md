# C2：未保存 Attribute 声明跨文件刷新

日期：2026-09-27。仅修改 SoPHP 隔离工作树中的测试与文档，没有修改业务项目、安装用户 Profile 或打包 VSIX。

`#[Attribute]` 类身份已成为按需声明事实。新宿主回归在独立 Composer 夹具中打开声明文件和使用文件，然后在**不保存声明文件**的情况下，把 `#[\Attribute] class C2LiveAttribute` 改成普通 class，再恢复标记。使用文件中的 `#[C2LiveAttr]` 补全依次包含、排除、重新包含 `C2LiveAttribute`。这验证了打开缓冲区的声明变化能刷新另一文件的候选，不会继续展示已失效的 Attribute 类。

验证：`pnpm exec tsc -p test/extension/tsconfig.json` 退出码 0；VS Code 1.139.1 Linux x64 的 10 项 Open Source Pack C2 **源码宿主**退出码 0，日志 `/tmp/sophp-c2-attribute-pack10-20260927.log`。宿主命令使用 `PHP_COMPANION_TEST_C2_ONLY=1`、`PHP_COMPANION_TEST_C2_OPEN_SOURCE_PROFILE=1` 与隔离扩展目录 `/tmp/sophp-pack-c1-template-20260927`。

本次只新增跨文件未保存刷新回归，未改变语言服务器实现。后续 [目标位置补全](c1-attribute-target-completion-2026-09-27.md)已补充 `Attribute::TARGET_*` 的可证明子集和对应未保存切换；重复使用、构造参数、真实 WSL Remote、已安装 0.4.8 候选及长会话仍待单独验收。
