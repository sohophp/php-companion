# Safe Move 移动后收敛验收

日期：2026-09-15。范围：资源管理器 PHP 文件移动后的 namespace、import 和语义引用协调。

## 触发证据

框架事实证据封板提交的首次 [CI 34863223263](https://github.com/sohophp/php-companion/actions/runs/34863223263) 中，Ubuntu 打包 Extension Host 在 `Service → Contact` 资源管理器移动后收到一次未知工作区错误；文件操作已经完成，但 30 秒内磁盘 namespace 仍为 `App\Service`。同一 SHA 的失败任务重跑成功，Windows、macOS 及前一实现提交的 Ubuntu 任务也成功，因此该结果证明移动后路径存在瞬时竞争，不能证明稳定失败。

## 实现

- 移动前继续冻结旧文件源码、目标身份和受影响文件集合，原有未保存文件、语法、PSR-4 和声明冲突门槛保持不变。
- 移动后最多执行三次协调。每次都让 Language Server 从当前开放文档或磁盘重建语义编辑，应用编辑，并保存移动文件与所有受影响开放文档。
- 每次应用后直接读取目标文件，要求声明 namespace 精确等于 Composer 目标 namespace；随后再次请求协调，要求不再存在 namespace、import 或语义引用编辑。任一后置条件未满足就从当前状态重试。
- 尝试间隔按 100 ms、200 ms 有界退避。每次失败记录尝试序号与具体原因；三次仍不能收敛时保留最终错误，并显示现有用户可读警告。

## 本地证据

- 新增纯异步故障注入单测：前两次失败、第三次成功必须返回成功；连续失败必须严格停在配置次数并保留最后错误。
- TypeScript、ESLint、16 个组件 624 项测试和根扩展 35 项测试通过，共 659 项。
- 三份 VSIX 内容验证通过。主 VSIX SHA-256：`da548988f655f462f909060a38fea2e333f590c751aea8e7c901934f3eb29cf3`。
- VS Code 1.137.0 隔离 Profile 从重新打包的 0.4.5 VSIX 完成 Safe Move 命令、Undo/Redo、Explorer 双向移动和其余 Extension Host 回归，退出码为 0。

## 尚待门禁

Linux、Windows、macOS CI 将在提交候选后补入本报告。多扩展真实 Profile 与连续高频批量移动仍属于后续长会话验证范围。
