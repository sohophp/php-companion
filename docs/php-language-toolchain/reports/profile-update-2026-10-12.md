# 日常 Profile 更新

已将 PHP Companion Alpha（WSL Profile `5db630d7`）的 SoPHP Core 和 Symfony 更新为当前源码构建，版本号保持 `0.4.13`。安装后的 39 份包内文件逐一与 VSIX 核对；清单忽略 VS Code 添加的安装元数据后保持一致。

Core 生产服务器 SHA-256 为 `8713a0c6250065e3f1d762cea387f8265291448ba1245fe2b35d8a5bd7b849be`，与[完整回归](version-syntax-current-full-regression-2026-10-12.md)一致。生产构建完成，Core 运行时字节保持；Symfony 四份 provider bundle 重新构建，专属 3 文件/13 项测试通过。三份同步 VSIX 校验通过，Open Source Pack 无内容变化，保留原安装。

当前 Profile 15 个扩展的成员、其它扩展版本/位置/安装元数据保持。VS Code 为 YAML 扩展补充 UUID 并规范化 URI 序列化，版本与位置不变。安装前文件及旧候选已备份至 `.vscode-test/d2452-profile-update/`。

Core 的常规打包因扫描大量历史测试目录而停止；改用 package.json 发布清单的隔离副本完成 VSCE 打包，运行时和清单与源码逐字核对，Markdown 链接按 VSCE 标准处理。初次校验读到旧 Core VSIX 而失败，最终新包校验通过；原记录保留。

需要执行 VS Code `Developer: Reload Window` 才能让运行中的扩展加载新构建。此次确认安装交付，真人 WSL 编辑器验收仍待进行；26 路线图大项和六最终检查继续。无提交、推送或公开发布。

[机器报告](profile-update-2026-10-12.json)记录安装文件哈希和验证范围；实际日志与备份位于上述证据目录。
