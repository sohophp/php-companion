# Symfony：新建未保存服务配置的定义跳转

日期：2026-09-27。仅修改 SoPHP 的独立工作树和临时夹具；没有修改 Winstar、安装 Profile 或打包 VSIX。

Open Source Pack 的 Symfony 扩展已经负责服务容器事实。检查发现：新建且尚未保存的 `config/services.yaml` 虽通过编辑器快照传给服务 Provider，Provider 仍先要求该文件在磁盘上能 `realpath`，因而服务图遗漏新声明。现在只在该路径有打开快照且磁盘文件确实不存在时，使用现有父目录的真实路径校验项目边界，再解析快照。指向项目外的 `config` 符号链接仍使图不完整且不发布该服务。

修复前，独立 Provider 的新文件回归失败；修复后该包 14/14 项通过。真实 Language Server stdio 的定向用例从 PHP `#[Autowire(service: 'app.mailer')]` 跳到了未落盘 YAML 的 `app.mailer` 声明，1 项通过。Provider 和 Language Server 类型检查、相关 ESLint、`git diff --check` 通过。

本次只证明服务声明的 Provider 与 Language Server 跳转链；尚未操作真实 VS Code 窗口，也未覆盖未保存服务文件的关闭、磁盘 watcher 和 Rename 完整生命周期。源码变更没有进入已冻结的 0.4.8 私有候选，真实 WSL Remote 仍属 C4 验收。
