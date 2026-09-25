# C3 全局命名空间 Safe Move

日期：2026-09-25。测试使用独立 Composer 项目中的空 PSR-4 前缀映射 `"": "src/"`，不修改业务项目。

## 结果

- 全局命名空间的 `src/C3GlobalMove.php` 移到 `src/Sub/C3GlobalMove.php` 时，计划在 PHP 开始标签后加入 `namespace Sub;`，并把使用方的类引用改为新完整名称。反向移动时删除分号形式的 namespace 声明。括号形式及不安全的混合内容保持拒绝。
- 语义层定向测试覆盖正反向移动、引用和协调计划；真实 stdio 测试覆盖 Composer 映射、文件重命名与使用方编辑。
- VS Code 1.139.0 隔离 C3 源码宿主完成预览、应用和一次 Undo/Redo；日志 `/tmp/sophp-c3-global-psr4-final-20260925.log`，进程退出码 0。测试等待新建嵌套 Composer 项目被语言服务器发现，再检查计划；最初立即发请求会误用父项目映射。计划响应使用 `edit` 字段。
- Pack manifest 定向测试 4/4、相关文件 ESLint、TypeScript 编译及 `git diff --check` 通过。

本结果证明当前 Linux 源码宿主的这一操作，不代表已冻结 0.4.5 候选或 WSL Remote 中的安装验收。生成新文件的一次 Redo 仍是独立 C3 阻断项。下一步按 [Pack 与 Core 起点](open-source-pack-next-core-2026-09-25.md)继续 C1/C2 日常编辑链，随后收口其它可复现的 C3 缺口。
