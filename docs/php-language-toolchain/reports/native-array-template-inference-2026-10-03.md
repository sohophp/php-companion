# 原生 array 的模板推导修复

## 实现与范围

在 callTemplateArguments 的 bind 入口，把原生 array 已证明的 PHP 数组事实用于数组合同：键只能是 int|string，未知元素用 mixed。只在 T[] 或 array<K,V> 入口展开；直接模板 T 保留原生 array 表示，不因此新增列表顺序或非空事实，已有已知键／元素类型不改。

集中恢复 array_keys、array_unique、array_filter、array_replace、array_chunk、array_pad、array_diff、array_intersect 的裸 array 返回；array_values、array_reverse、array_slice、array_merge 与已修复 array_flip 的正确结果保持。array_count_values 的元素限制属于独立合同问题，尚未在本项修复。

## 当前证据

- 完整语义：1242/1242、66 文件、53.40 秒。本项四版本各十三入口正例与非法 scalar 反例；用户模板直接 T、array-key 界、string 键界和已知键值精度单独覆盖。
- 定向 stdio：4/4、两文件、6.47 秒，包含 array_flip 相邻回归。本项 PHP 7.2／8.5 各四入口 × 五种已知／原生／非法／恢复切换，共四十次未保存 Hover，磁盘不变。
- Linux Core 隔离宿主：四入口二十次未保存 Hover，非法 scalar 撤回数组返回后正确恢复，磁盘不变，退出 0。
- 语义包编译、当前 Core 构建、宿主测试打包和相关 lint 均退出 0。
- 单文件预热语义表达式查询各二百次：PHP 7.2 P95 4.16 ms、最大 6.54 ms；PHP 8.5 P95 3.64 ms、最大 4.83 ms。仅小样例语义查询，不替代完整项目或可见补全弹窗测量。

## 未关闭事项

当前完整 stdio 与完整 Core C2 尚未针对本次源码全跑；482 项旧集成属于 array_flip 与本项之前。真实 WSL 可见 UI 和长期使用单列，未打包、提交、推送或更新 Profile。

接着处理已审计 array_count_values 合同，再集中验证近期源码，保持同一分支。
