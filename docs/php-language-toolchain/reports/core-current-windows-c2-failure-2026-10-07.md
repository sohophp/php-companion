# D169：当前 Windows 完整 C2 的真实失败

## 结论

当前 Windows 完整 C2：**未通过**。原实际编辑器运行退出 1，耗时 28.522 秒；在两条路径打开同一文件的场景，非当前所有者标签页丢失未保存方法 `realOnly` 的 Hover。最终完整 C2、设置恢复和零意外关闭/重启证明均未执行到，不能判为通过。

当前正式 Core bundle 为 `7159d89fbacac6b48fe10884b8815a5bb6684b95a9701932a0b26b379687357d`，源码基于 `f14472c2`。独立 Windows 临时目录复制 21 项 Core 资产、83 项基线输入，当前测试入口重新编译，11 项源输入记录摘要。终态源码/副本/编译资产/运行时/HEAD/工作树变化均为 0。

实际 Native Node v24.16.0，VS Code 1.140.0 / Extension Host Node v24.21.0 / win32。完整入口清除 C2/C3/Provider 子集开关；21 行此前流程证明已产生，它们不代表整轮完成。[机器记录](core-current-windows-c2-failure-2026-10-07.json)保留完整失败、实际运行时、输入身份和原始编辑器流/日志摘要。

## 启动准备与记录限制

首次信息采集中的 `node -e` 字符串经 Windows PowerShell 传递时丢失引号，Node 报语法错误；该次未启动编辑器。改用独立 CJS 文件后才运行到上述真实 C2 断言失败。第一次运行记录、驱动和调用脚本仍保存，但修正驱动误用了两份同名 stdout/stderr 路径，覆盖了第一次原始流。会话中的错误文字另行保存；不将它冒充逐字节恢复。实际编辑器运行的两份原始流已逐字节归档，并核对终态摘要。

## 定向检查与下一步

原生 filesystem/junction 控制实际执行退出 0：直接路径和 junction 路径的 realpath 及大小写归一后的物理键一致；编辑器形式的 `file:///c%3A/...` URI 能解码为正确路径。这仅排除该控制中的基础路径转换问题，不证明 Hover 根因或修复。

下一步针对真实失败取得工作区事实与本地查询视图的因果证据，保护项目最近编辑标签页的事实以及另一个标签页自己的 Hover、Completion、Definition、Signature Help。当前 [D168 完整 Linux LSP](core-f14472c2-full-regression-2026-10-07.md)的 1286 项仍为通过，不能替代本轮 Windows UI 资格。

原 C1-C4/R4 与其它开放门槛保持；Goal active。没有打包、更新 Profile 或推送。
