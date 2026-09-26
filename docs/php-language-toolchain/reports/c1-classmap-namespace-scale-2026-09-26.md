# C1 classmap 命名空间建议规模门禁

日期：2026-09-26。仅修改 SoPHP 源码、可复现基准和报告；未修改业务项目，未重新打包 VSIX。

用 `SOPHP_BENCH_GROUPS=20,100 node scripts/benchmark-ondemand-type-completion.mjs classmapNamespace` 建立约 1 万、5 万个 PHP classmap 文件的独立 Composer 夹具，查询 `use Dom`，每个规模用三个新语言服务器进程，各做首次和重复 LSP Completion。结果为毫秒中位数：

| classmap 文件 | 改进前首次 | 改进前重复 | 本轮最终首次 | 本轮最终重复 |
| ---: | ---: | ---: | ---: | ---: |
| 约 1 万 | 248 | 241 | 141 | 3 |
| 约 5 万 | 795 | 850 | 142 | 3 |

改动限制 `rg` 只返回前 64 个匹配路径；达到上限时仍标记 incomplete，让继续输入的前缀触发更窄的查询。基准还在约 5 万文件下继续输入 `use Domain\Tar`，确认较窄查询找到末尾的 `Target\`，不把宽前缀的前 64 个路径当作完整命名空间集合。按根、搜索词及失效世代缓存这些有界路径；在没有打开的 classmap/files 缓冲区时，再按语义工作区身份缓存精确查询结果。文件事件、Composer 元数据变化和 classmap 文件关闭会清除缓存；打开的未保存缓冲区绕过最终结果缓存，并优先于磁盘候选。

这组数字只计 LSP 请求往返，不等于编辑器输入到建议列表可见时间。宽前缀超过 64 个匹配文件时，结果明确为 incomplete，某些命名空间需继续输入才能出现；真实 WSL Remote、不同系统及长会话仍需 C4 验收。相关独立 stdio 回归含系统 `rg` 与便携搜索、未保存改名及磁盘文件事件，5/5 通过；TypeScript 构建、ESLint 和差异检查通过。优化后再次运行 VS Code 1.139.1 Linux x64 Core 源码宿主的 C1 链，classmap 建议接受及嵌套命名空间检查通过，宿主退出码 0。
