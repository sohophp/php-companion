# array_flip：返回键与值的合同修复

## 实现

固定 JetBrains phpstorm-stubs 修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 standard/standard_9.php 用于声明来源核对；运行时边界另由六套 PHP 实测，不直接照搬 TValue 为 string 就意味着输出键 string 的假设。

生成器增加宽静态重载，为未知原生 array 提供 array<array-key,array-key>；已知输入键则绑定 TInputKey 并成为输出值。条件返回保留已知整数输入值的 int 输出键；其他值允许 int|string，覆盖数字字符串转 int。参数元素用 mixed，合法数组中的不合法元素由 PHP warning 后跳过，不再因此丢失整个返回。

不猜测具体输出键名称、数组非空或重复值的最终数量；两份声明是静态分析重载，运行时仍是一个 PHP 函数。原生 array 参数、版本名称与 array 返回不变。

## 当前验证

- 版本规格全量：240/240，14 文件，24.72 秒。
- 语义全量：1237/1237，65 文件，59.76 秒；覆盖整数／字符串输入键与值、mixed、裸 array、非法非数组和缺参、用户同名函数、PHP 8 命名参数。
- 定向 stdio：4/4，含 array_column 相邻回归，5.44 秒。array_flip 自身两版各八次未保存 Hover，共 16 次，磁盘保持原样。
- 隔离 Core Linux 宿主：八次未保存 Hover 切换全部正确，磁盘保持原样，宿主退出 0。
- 正式运行时脚本 `scripts/check-array-flip-runtime.mjs`：PHP 7.2／7.4／8.1／8.2／8.4／8.5 全通过。包含数字字符串形式差异、五类跳过值及 warning、碰撞保留最后输入键。
- 当前 Core 构建、完整扩展测试编译、涉及文件 lint 均退出 0。

## 证据范围

完整 482 项 stdio 与完整 Core C2 通过的集中证据属于本修复之前的冻结版本。本项当前仅有定向协议与宿主，不能作为新源码全量协议或可见 WSL UI 证明。未打包、提交、推送或更新 Profile。

下一项按已完成隔离审计处理裸 array 在模板入口的共同推导缺口；array_count_values 的 mixed 输入限制已经六版运行时核对，单列合同接入。
