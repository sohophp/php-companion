# Symfony：新建未保存服务配置的定义跳转

日期：2026-09-27。仅修改 SoPHP 的独立工作树和临时夹具；没有修改 Winstar、安装 Profile 或打包 VSIX。

Open Source Pack 的 Symfony 扩展已经负责服务容器事实。检查发现：新建且尚未保存的 `config/services.yaml` 虽通过编辑器快照传给服务 Provider，Provider 仍先要求该文件在磁盘上能 `realpath`，因而服务图遗漏新声明。现在只在该路径有打开快照且磁盘文件确实不存在时，使用现有父目录的真实路径校验项目边界，再解析快照。指向项目外的 `config` 符号链接仍使图不完整且不发布该服务。

修复前，独立 Provider 的新文件回归失败；修复后该包 14/14 项通过。真实 Language Server stdio 的定向用例从 PHP `#[Autowire(service: 'app.mailer')]` 跳到了未落盘 YAML 的 `app.mailer` 声明，1 项通过。随后扩展该用例：清空未保存快照后定义撤回，磁盘 watcher 创建同路径文件后立即返回磁盘位置，同版本重新打开不同未保存内容后返回缓冲区位置，关闭后再次返回磁盘位置。扩展测试先暴露服务定义请求会在 Provider 刷新期间使用旧偏移量；请求现在先确认容器事实与当前输入版本一致。该定向 stdio 用例连续三次通过。

本次证明服务声明的 Provider、Language Server 定义跳转及上述关闭、磁盘 watcher 和重开顺序；尚未操作真实 VS Code 窗口，也未覆盖 Rename 的完整应用与撤销。源码变更没有进入已冻结的 0.4.8 私有候选，真实 WSL Remote 仍属 C4 验收。
