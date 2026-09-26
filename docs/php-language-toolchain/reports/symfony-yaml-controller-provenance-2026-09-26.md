# Symfony YAML Controller 导航的路由来源

日期：2026-09-26。范围为 SoPHP Symfony 的 Controller Definition 协议处理与独立 Composer 测试；未修改业务项目，未打包 VSIX。

## 问题与修复

原处理只要在任意 YAML 文档中看到 `path` 和 `controller: App\Controller\DemoController::show`，就可能返回 PHP Controller 落点。真实 stdio 测试先在 `config/workflow.yaml` 复现误跳转。现在约定入口 `config/routes.yaml`、`config/routes.yml` 继续支持未保存的静态 Controller 输入；其它 YAML 文件须由 Symfony 路由 Provider 的导入图提供同一文件、类、方法和源码范围的 Controller 事实，才返回 Definition。普通 YAML 即使字段恰好相同也不产生 SoPHP 跳转。

## 验证

- 真实 stdio 的反例先失败、修复后通过：`config/workflow.yaml` 返回空结果，约定路由文件中的类与方法仍跳到 PHP 声明。
- 独立静态路由 Provider 从 `config/routes.yaml` 导入 `config/routes/extra.yaml`；子文件中的 Controller 类仍跳到唯一 PHP 类声明。
- 同一组回归还覆盖 YAML 服务 ID Definition，确认其原有路径未受 Controller 来源判断影响。Language Server 构建和定向 stdio 3 项通过。
- VS Code 1.139.0 Linux x64 的完整 10 项 Open Source Pack 源码宿主通过 `vscode.executeDefinitionProvider`：约定 `config/routes.yaml` 落到 `UserController.php`，普通 `config/workflow.yaml` 不返回该落点；后续服务 Rename 与 C3 编辑链继续通过，宿主退出码 0。日志 `/tmp/sophp-c3-symfony-yaml-provenance-pack10-20260926.log`。

当前结果覆盖服务器协议、独立 Composer 夹具和隔离 VS Code 源码宿主；已安装 VSIX、真实 WSL Remote 与人工 Ctrl+点击仍属于组合验收。动态路由和无法由静态导入图证明来源的 YAML 文件继续返回空结果。
