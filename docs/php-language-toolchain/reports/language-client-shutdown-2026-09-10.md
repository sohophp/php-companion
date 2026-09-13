# LanguageClient 关闭生命周期验收

日期：2026-09-10。范围：PHP Companion 自研语言服务器的 VS Code 扩展关闭顺序。

## 问题与修复

初始候选把 `LanguageClient` 最后加入 `context.subscriptions`。VS Code 逆序清理时先关闭 stdio 客户端，仍存活的配置、工作区和扩展变化监听器可能继续发送 `phpCompanion/symfonyRouteProviders`，触发 `ERR_STREAM_DESTROYED`。

当前实现先注册客户端，再注册所有通知监听器，最后注册关闭闸门。清理开始时闸门先阻止新通知，随后移除监听器，最后关闭客户端；关闭后的异步错误不再写入普通运行日志。

## 验证

- 修复后的 TypeScript 检查与针对修改文件的 ESLint 通过。
- 十五个组件 497 项测试与根包 33 项测试，共 530 项，通过。
- 主 VSIX 重新构建并通过 manifest、依赖和打包资源校验。
- 同一 `338af4796bbca7f94f98552c32792b905a52f805b7b083e2983c5360ce4495c3` 主 VSIX 在 VS Code 1.137.0 纯净隔离配置和 Open Source Profile 中依次运行；两次均完成全部断言并以退出码 0 退出。
- Open Source Profile 同时加载 TwigPlus 1.3.7、Symfony Language Tools 0.20.0、Red Hat YAML 1.24.0、PHP Debug 1.40.1、PHPUnit 3.9.40、PHP CS Fixer 0.3.21 与 EditorConfig 0.18.2。PHP Companion 自身的关闭流错误未再出现；Symfony Language Tools 的 EPIPE 在重复运行中仍间歇复现，堆栈和所有权明确属于该第三方扩展，且本次未改变退出码 0。

公开 npm 与 Marketplace 发布未执行。
