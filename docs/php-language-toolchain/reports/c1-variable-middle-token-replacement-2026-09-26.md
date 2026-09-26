# C1：变量名中间补全的替换范围

日期：2026-09-26。独立 PHP 源码用例把光标放在 `$cust|OldTail`，同一函数已声明 `$customerName`。此前 SoPHP 的变量建议只替换光标前的 `$cust`，接受建议可能留下 `OldTail`。

SoPHP 现在把光标后的变量名字符也纳入补全替换范围。语义层返回整个 token 的起止位置，语言服务器用该范围生成 `textEdit`。光标处没有后缀时仍保持原有候选过滤。

验证：定向 semantic 用例通过（1/1）；`test/extension` TypeScript 编译通过；完整 10 项 Open Source Pack 源码 Profile 的 VS Code 1.139.1 C1 Extension Host 退出码 0。宿主用例通过真实补全命令检查 `$customerName` 候选的范围覆盖整个 `$custOldTail`，应用后文档只含 `$customerName;`。`git diff --check` 通过。没有打包 VSIX，也没有修改业务项目；已安装候选和人工编辑器操作仍待 C4。
