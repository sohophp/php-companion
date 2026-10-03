# C3 Extract Method：连续赋值加末尾 return

日期：2026-10-02。应用 [隔离准备](c3-extract-method-local-return-preparation-2026-10-02.md)。

## 改动

在现有顺序标量证明中识别最后一条 return，生成 `return $this->extractedMethod(...)`。临时变量与原始返回表达式进入新方法；参数仍从实际读取的原生标量输入确定。结果类型按证明生成，int 算术的溢出结果用 PHPDoc `int|float`，避免给 PHP 7.2 生成不支持的原生联合类型。原方法保留原返回合同，helper 不复制可能提前转换或改变错误来源的窄 caller 返回类型。

支持和拒绝矩阵见准备报告及 18 项测试。不扩大一般控制流、副作用、引用或未知类型范围，不关闭整个 F08。

## 当前产品验证

| 检查 | 结果 |
| --- | --- |
| 全量语义 | 32 文件、767/767，50.31 秒 |
| 定向真实 stdio | PHP 7.2／8.5 的末尾 return 与原局部依赖共四项通过、415 跳过，总数 419，11.64 秒；未知类型撤回与恢复、输出合同保持 |
| 构建、bundle、宿主编译、定向 ESLint | 均退出码 0 |
| 实际 PHP CLI 同一语义实现 | 产品 src／dist 与隔离副本各自 SHA-256 完全相同；三版本、三种 caller 返回合同、strict／非 strict 共 72 路径值或异常类型及消息一致 |
| 独立 C3 编辑器 | 退出码 0；七个场景覆盖分支输出列表、原局部依赖与新增 numeric／typed／string 末尾返回，预览、取消／应用、完整文本及一次 Undo/Redo 全通过 |

这是独立 C3 场景，不替代 [完整组合的未保存 Symfony 事件引用失败](c3-extract-method-local-chains-2026-10-02.md)。两种清理方案均没有使文档在短等待内关闭，停止重复尝试并保留证据；全套保留原引用断言。当前完整 stdio 419 未全跑，上次完整 415/415 为局部依赖和末尾 return 应用之前的结果。

源码 SHA-256 `28024973b90551594b978ae54cee48d68aa06bd3515295e405d1994a6c07c6a8`；semantic dist `1427e92b253fdb2dbd1e2a2b52de0c587d14fe0f37fc1afa8cc45a8008d3310e`。十项冻结基准 `/tmp/sophp-extract-local-return-product-inputs.sha256`，宿主终态后十项全部匹配；`/tmp/sophp-extract-local-return-product-final-inputs.log`。

日志 `/tmp/sophp-extract-local-return-product-semantic.log`、`/tmp/sophp-extract-local-return-product-stdio.log`、`/tmp/sophp-extract-local-return-product-build.log`、`/tmp/sophp-extract-local-return-product-bundle.log`、`/tmp/sophp-extract-local-return-product-host-compile.log`、`/tmp/sophp-extract-local-return-product-lint.log`、`/tmp/sophp-extract-local-return-product-host.log`。实际 PHP 数据见相邻 JSON。真实 WSL、其它平台未计验收；未打包、提交、推送或更新 Profile。
