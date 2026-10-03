# 内置数组回调：稳定累加器的成员补全

日期：2026-10-03。沿用当前已接入的 phpstorm-stubs 数据，不增加配置。

## 可复现缺口与实现

`array_reduce($items, function ($carry, $item) { $carry->only; return $carry; }, new Carry())` 的累加器成员此前为空。裸返回累加器已有支持，但前置表达式使身份判定失效，回调自身的参数推断又依赖返回类型，因而不能证明稳定类型。

现在通过受限 AST 遍历证明前置简单成员读取／调用未替换局部参数绑定，再保留 carry 身份。遍历最多 256 个节点；没有扩大到分支或循环。赋值、引用逃逸、动态语法、未知函数调用接收 carry、unset、eval、闭包逃逸和共享参数保持拒绝。类型未知时不编造成员。还拒绝 extract／parse_str／mb_parse_str／assert／eval 的隐式局部变量改写，不能只依据按值参数判断这些函数安全。

`array_map` 的单数组、闭包／箭头、多数组等长、短数组 null 填充与非空保护，以及 `array_filter` 的值／键／双参数和未知 mode 同时纳入真实内置声明回归。显式回调参数类型保持优先。数据无需新增或改变缓存格式；类型证明在查询时由源码计算。

## 验证

- PHP 7.2／8.5，每版临时树／保留树各 24 个正反例，共 96 次语义成员查询。
- 三种缓存恢复路径各核对 14 个 reduce 正反例，共 42 次缓存查询；当前定向测试 5/5。
- 补充局部变量改写防护后完整语义 76 文件、1342/1342、53.19 秒。随后将 extract 反例加强为变量实参，重新跑定向测试；产品源码未再改变。
- 真实 LSP 两版各重复九个正反例，两轮共 36 次未保存更新与查询；2/2、6.68 秒，磁盘不变。
- Linux 隔离 VS Code 四次可见 Enter／Tab，接受为 `onlyCarry()`；无参数调用光标在闭括号后，精确文本、光标、Undo/Redo、磁盘不变均通过。弹窗测量 273／167／153／152 ms，包含可见列表读取开销，不等于 LSP 请求 P95。
- 四次可见接受在隐式局部改写过滤补充前完成；补充后由当前 LSP 正反例与性能验证，不声称重跑了 UI。
- 实际 PHP 7.2／8.5 六个预期结果：普通接收者调用保留 ArrayObject，extract 将 carry 替换为 null；7.2 的单实参 parse_str 替换为字符串，8.5 拒绝该调用。
- 当前真实 Composer 项目 200 次 A／B 累加器类型切换：正确候选首位，另一类型撤回、无 incomplete、磁盘终态逐字一致；往返 P95 18.07 ms、最大 65.16 ms，满足 150 ms 查询预算。RSS 220.64→236.23 MiB，仅是短样例采样，不代表长会话或 GC 后平台。
- 基准脚本新增显式 bundle／WASM 环境参数及磁盘终态校验，避免复制脚本或误测旧构建。
- Semantic／language-server 构建及 Core 源码 bundle 更新；宿主 TypeScript noEmit、定向 ESLint、diff check 通过。

首次 LSP 用例错误地检查了前一个同名前缀的位置，已改为标记光标对应的插入范围。首次 UI 用例错误地预期无参数调用的光标位于括号内，已按现有 `name()$0` 合同改为闭括号后；这两次是验证代码问题，未为它们改变产品行为。失败日志保留。

最新原始证据：`/tmp/sophp-array-callback-{semantic-final,cache-current,stdio-current}.log`、`/tmp/sophp-array-callback-project-verified.json`、`/tmp/sophp-array-callback-runtime.json`。原有失败与首次成功证据保留：`/tmp/sophp-array-callback-semantic.log`、`/tmp/sophp-array-callback-cache.log`、`/tmp/sophp-array-callback-ui-final.log`、`/tmp/sophp-array-callback-ui.json`；结构化结果见同名 JSON。

## 交付边界

没有为本批重复运行 24 分钟完整 stdio、Windows 或长期编辑门禁，不能引用上一批结果作为本批全部验收。尚未真人 WSL 验收。没有打包、提交本批 Git、推送或更新 Profile；此前独立 stubs 数据里程碑提交 2187f0f 保留，当前核心代码还依赖其它未提交开发改动。


## 当前 Windows 定向收口

2026-10-03，原生 Windows Node v24.16.0 启动隔离 Core；同一源码套件四次可见 Enter／Tab 通过，onlyCarry() 的完整文本、闭括号后光标、Undo/Redo 和磁盘不变均显式核对。可见列表读取等待 277／142／156／191 ms，不等于纯语言服务器请求时间。

20 项 Core 资产在复制前与终态分别核对 SHA-256，根构建及 Windows 副本均一致。临时单份 Core 已删除，suite／runner／日志留在 /tmp/sophp-array-callback-windows-*。新增 arrayCallbacks 宿主种类只服务验证，不改变产品。未安装 VSIX、更新用户 Profile 或推送。Windows 本批四个正例现在已有证据；本批完整 stdio 和真人 WSL 仍分别开放。
