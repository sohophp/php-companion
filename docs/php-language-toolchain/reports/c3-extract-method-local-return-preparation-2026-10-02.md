# C3 Extract Method：连续赋值加末尾 return 的隔离准备

日期：2026-10-02。本报告保留隔离准备证据；随后应用产品源码，当前产品结果见 [末尾 return 报告](c3-extract-method-local-returns-2026-10-02.md)。

## 缺口与实现

当前产品对数值、常量及字符串临时变量加末尾 return 的三个正例均不提供提取；未知变量、引用赋值、除法三个拒绝符合预期。新实现复用已有顺序标量证明，对局部赋值后最后一条标量返回生成 `return $this->extractedMethod(...)`，不增加数组包装或改变原表达式。

提取方法按实际证明的结果类型生成签名；整数加减乘可能溢出到 float，使用 `@return int|float` 且不加原生联合签名，兼容 PHP 7.2。原方法的返回类型约束仍在原方法检查，避免把 caller 的窄 int 类型复制到 helper 后提前转换或改变错误来源。当前返回合同支持域与其它未证明边界在实现中保持明确；不宣称通用控制流、副作用或所有类型合同。

## 隔离验证

| 检查 | 结果 |
| --- | --- |
| 新矩阵 | 18/18；数值、字面量、字符串、bool、int 参数、float、括号及 int／float caller；引用、未知、重复、除法、作用域观察、void／不兼容合同拒绝 |
| 全量语义 | 32 文件、767/767，51.24 秒 |
| 构建、定向 ESLint | 退出码 0；测试正则按既有 lint 规则改为 `{8}` 空格量词 |
| 隔离真实 stdio | PHP 7.2／8.5 两项通过、417 跳过，总数 419，7.14 秒；numeric／typed／string、未知撤回及恢复 |
| 实际 PHP CLI | PHP 7.2／8.1／8.5 × 无类型／int／float caller × strict／非 strict × 四组输入，共 72 路径；值或异常类型及消息前后一致，包含整数溢出 |

没有产品 LSP、Extension Host 或真实 WSL 验收。下一步在当前 C3 资源清理验证终态后应用并验证；不在 C3 运行期间改变其源码或 bundle。

准备 `/tmp/sophp-extract-local-return-preparation`，补丁 `source.patch`，基准 `/tmp/sophp-extract-local-return-inputs.sha256`。初次准备因工作目录错误没有复制 src，继而缺依赖；明确改用绝对路径并补齐隔离 node_modules 后构建和实际测试通过，早期入口错误不算产品失败。

日志 `/tmp/sophp-extract-local-return-tests.log`、`/tmp/sophp-extract-local-return-full.log`、`/tmp/sophp-extract-local-return-build.log`、`/tmp/sophp-extract-local-return-lint-final.log`；实际 PHP 数据见相邻 JSON。未打包、提交、推送或更新 Profile。
