# C1 classmap/files 命名空间导入补全

日期：2026-09-26。仅修改 SoPHP Core 源码、测试夹具和计划记录；未修改业务项目，未重新打包 VSIX。

Composer classmap/files 的文件路径不一定对应 PHP 声明命名空间。普通类导入现在对这些 autoload 根执行有界内容搜索，再解析实际类、接口、trait 和 enum 声明，生成 `use Leg` → `Legacy\`、`use Legacy\Bil` → `Billing\` 候选；`use Legacy\Billing\` 继续提供直接类。被 `exclude-from-classmap` 排除的文件及只有目录名相似、声明不匹配的文件不会产生模块建议。打开的未保存缓冲区参加同一判断，改名后旧建议撤销。

搜索最多解析 64 个候选文件；超限、搜索失败或输入太短时结果标记 incomplete。短输入仍可利用已打开的缓冲区。解析结果只在声明与当前路径相关时注入语义工作区。系统 `rg` 与便携 worker 搜索的独立 stdio 用例都通过；相关 PSR-4、PSR-0、classmap 类型回归合计 5/5。TypeScript 构建、ESLint 和差异检查通过。

VS Code 1.139.1 Linux x64 Core 源码宿主在默认 `onDemand` 模式下，实测 classmap 的 `Legacy\` 建议可被编辑器接受并正确替换 `use Leg`，下一层 `Host\` 建议可见；完整 C1 宿主退出码 0。宿主 `PHP auto` 使用本机 PHP 探测，不能据此声称多个目标版本或真实 WSL Remote 已验收。classmap 大规模文件下的输入到建议可见时间、安装候选及长会话仍需 C4 验收；本次源码增量不在冻结候选 `15a5254` 中。
