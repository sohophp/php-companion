# Windows Move Member Undo 的有界诊断

2026-10-11。同一正常 ac114715 构建，Windows VS Code 1.141.0。原完整 C3 onDemand 的首轮失败保留；本轮没有修改产品源码、运行时、公开流程、原 Undo 命令或 300000ms 门槛。以下结果属于诊断，当前 Windows 完整资格仍未取得。

私有编译只在原两处调用文件 Undo 的前后增加同步快照，记录活跃编辑器和真实文档变化原因。首处失败再次出现：Undo 前后活跃 URI 均为调用文件，文本和版本 2 保持，用户注释未撤销，未观察到 reason=Undo 的文档变化。后续版本 3 的变化来自原 finally 清理，不计为 Undo 恢复。被动记录不能证明命令实际走到了文本模型，也不能证明产品重构造成了此问题。

独立编辑基线没有调用产品重构，分别覆盖先 applyEdit 后显示、先显示后 applyEdit、显示后额外聚焦编辑器组三种路径。三项只执行一次原 Undo，立即和 500ms 后均未恢复，文本/版本未变，真实磁盘保持；三项的活跃 URI 正确，但 window.state.focused 均为 false。因此单纯补等待或聚焦编辑器组尚未成为有效修复，当前现象也会出现在普通工作区编辑中。

另一次受控实验只匹配本次独立临时目录对应的 Windows Code 主窗口，尝试原生 AppActivate/SetForegroundWindow，并要求实际前台窗口匹配与扩展 window.state.focused 同时成立。该焦点门禁失败，未进入三项编辑场景；没有据此证明窗口焦点就是 Undo 的根因。首次 PowerShell here-string 结束符缩进错误在 parse-only 控制中保留，纠正后的脚本解析通过后才进入上述实际控制。

已检查该精确安装版本的 workbench 代码：Undo 先尝试有文本焦点的 code editor，再尝试 DOM input/textarea，最后尝试 active code editor；activeTextEditor 的 URI 本身不能确认实际命令接收者。保存了本地源文件 SHA-256 与原片段，这是路径推断依据，不是本次具体路由的运行时证明。

原流程观测与独立基线共 30,390 输入、106 文件归档；焦点控制另核对 30,264 输入、54 文件归档。原正常资产、源码、链接和两仓状态保持，自有 Linux/Windows 进程退出。结束本轮同类排查，保留限制和首次失败；下一项处理独立真实项目连续编辑性能，并完成正在运行的真实编辑两小时终态。Windows 原完整流程仍需在实际命令焦点可确认的环境继续。

176 编号 / 14 家族、26 未完成大项保持，完整 C1–C4/R4、P0–P9/F01–F14 范围继续。日常 Profile、安装、打包、提交、推送和发布未更新。

[原流程与独立编辑诊断审计](../../../.vscode-test/d2070-native-undo-diagnostic-terminal-audit.json)；[原生窗口焦点控制审计](../../../.vscode-test/d2075-focused-native-undo-terminal-audit.json)；[精确安装版本 Undo 路由源片段](../../../.vscode-test/d2076-installed-native-undo-routing-source.json)；[PowerShell 解析控制](../../../.vscode-test/d2073-focus-powershell-parse-controls.json)。
