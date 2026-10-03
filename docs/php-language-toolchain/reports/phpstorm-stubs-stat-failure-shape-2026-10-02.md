# phpstorm-stubs：stat／lstat 失败分支与数组键恢复

日期：2026-10-02。

## 已复现的缺口

原 PHP 8 声明的 PHPDoc 只有数组形状，原生返回为 array|false。定向语义测试证明原版本仍保留 false，但在 if ($metadata === false) return; 后未能恢复 size 键提示；PHP 7.2 的相同测试通过。不是已确认的 false 类型丢失问题。

本轮仅把两项 PHP 8 PHPDoc 补为原数组形状加 false，使其与原生合同一致；不更改 PHP 7 行为，不变更字段值或平台假设。依据：[固定上游 standard_7.php](https://github.com/JetBrains/phpstorm-stubs/blob/e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681/standard/standard_7.php)、[PHP 官方 stat 手册](https://www.php.net/manual/en/function.stat.php)。

## 验证

- 修改前定向测试：PHP 7.2 通过，PHP 8.5 在 false 保护后的键提示失败。
- 修改后 stat 与 pathinfo 定向语义四项通过；stat／lstat 均验证未保护时无确定键、排除 false 或 is_array 保护后出现 size。
- language-spec 全量 131/131、零跳过；所有支持版本的 stat／lstat PHPDoc 都含 false。
- PHP 7.2／8.5 真实 stdio 两项通过；两函数均验证未保存移除保护后撤回键、加入 is_array 保护后恢复，业务磁盘不变。439 项未选中；当前总量 441，不称全量通过。
- 隔离 Linux Core Extension Host 同样通过两个函数的三种保护状态，未保存编辑与磁盘不变均核对。检查实际 Provider，尚非真人可见弹窗验收。
- 本机 PHP 7.2／7.4／8.1／8.2／8.4／8.5 分别实际执行 stat 与 lstat：存在文件 size 为 3，所有现有命名字段为整数；不存在文件返回 false。仅使用独立临时文件。
- language-spec 和 Core 重建、Extension Host TypeScript、相关 ESLint、git diff --check 通过。

[结构化结果与输入哈希](phpstorm-stubs-stat-failure-shape-2026-10-02.json)。没有在这一两行修正后再次全跑语义集合；之前 1118 全量属于 pathinfo 状态。没有打包、提交、推送、发布或更新 Profile，路线图仍继续。
