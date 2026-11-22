# 正式模式真实响应延迟：旧Hover泄漏反例

2026-10-20。源码`71c7b40f`三包的正式安装组合，真实服务器保持testMode=false；原完整套件与全部断言保持。外部传输适配器为套件提供暂停/状态/释放控制，暂存实际生成的Hover响应；真实服务器仍拒绝Test专用暂停钩子。状态中的文档版本来自服务器实际发布的版本化诊断。

## 已执行并通过

真实服务器独立探针确认：协议消息分片可处理，旧int Hover暂存期间服务器确认版本2，原响应字节摘要相同地释放，新查询显示string，服务器退出0且临时项目删除。

正式组合失败审计退出0：7376冻结输入、39产品安装文件与原包一致；所属服务器/编辑器/显示服务和临时项目已清理。真实Xdebug及PHPUnit通过，50轮标量反馈P95为75ms。

## 已执行但失败

原完整组合实际退出1：消费文件已编辑至版本2且发生磁盘观察事件，随后释放的旧Hover仍返回旧联合类型，触发原断言`An old Hover result escaped after the consumer changed during a disk watcher event`。适配器记录同一次真实响应的暂存与释放摘要一致；服务器在其间实际确认消费文件版本2。

这是正式模式客户端接收在途旧响应时的缺口。旧Test模式的服务器内部暂停会在恢复后重新核对版本，不能替代本次响应已生成、传输尚未完成的场景。

## 修复进度

独立工作树`/var/www/node/php-companion-hover-guard-20261020`已增加客户端文档查询守卫，并接入普通及计时模式的Hover中间件。返回前检查文档版本、关闭及取消状态。六项定向测试通过；构建及后续质量检查进行中。首次类型检查先于依赖包构建，因缺少workspace输出而退出2，Lint和构建未由该失败链执行；随后已启动正常构建。

修复尚未取得正式组合通过，尚未生成或安装新候选；复杂Controller500/150ms、最终CI、macOS矩阵及真人WSL仍开放。原工作区对应客户端源码与冻结基线不同，修复留在独立工作树，避免覆盖原有代码。

证据：[失败审计](runtime-file-guard-production-gate-2026-10-20.json)、[外部响应控制真实探针](../../../.vscode-test/runtime-file-guard-production-gate-2026-10-20/probe-proof.json)、[原失败终态](../../../.vscode-test/runtime-file-guard-production-gate-2026-10-20/state.json)。修复源码及定向测试位于上述独立工作树的`src/extension/documentQuery.ts`、`src/extension/languageServer.ts`和`test/unit/document-query.test.ts`。

## 后续修复终态

[本地a7e9166a修复及同一正式模式完整套件](hover-response-production-2026-10-20.md)已退出0，独立审计通过，P95为92/101ms。最终155项根单元、构建、类型、Lint通过；以上反例与首次失败记录保持，不将新结果写回旧构建。
