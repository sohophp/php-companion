# R43 正在执行的补全请求取消

日期：2026-10-02。补齐用户批准的补全专项阶段 5 中取消请求的直接协议证据。产品源码未修改；原有完整 429 项 stdio 回归继续使用冻结输入运行。

## 验证链

原有 `F04-NAV-12/13` 已覆盖修改文档和同版本重开的旧请求撤回，workspace/symbol 也已有 `$/cancelRequest` 测试；这些不能替代 completion 自身的取消验证。

新增可重复执行的 `scripts/check-completion-cancellation.mjs`，通过实际语言服务器子进程和标准 JSON-RPC/LSP 验证：

1. 独立 Composer fixture 打开包含 Receiver::render 的 PHP 文件。
2. 在 testMode 下暂停已经进入处理器的 completion，确认旧请求尚未返回。
3. 发出针对其请求 ID 的 `$/cancelRequest`；通过后续状态查询确认文档版本仍为 1 且请求保持暂停，排除未保存改动引起的撤回。
4. 释放暂停，要求被取消请求无错误且结果严格为 `[]`。
5. 再发送一个不存在 ID 的取消通知，随后在同一服务器／同一文档发起新 completion；必须仍返回 render，证明取消不会污染后续请求。

## 实际结果

- PHP 7.2／8.5 × onDemand／experimental／progressive，六个场景全部通过，正式脚本退出码 0。
- 临时只读探针先通过，再运行仓库中的正式脚本，结果一致；定向 ESLint 退出码 0。
- 原有 38 项产品与宿主输入在本批保持不变；独立脚本没有加入正在运行的 429 项测试，不能将六个场景计入该测试数量。

原始 [JSON](c2-completion-cancellation-2026-10-02.json) 与 `/tmp/sophp-completion-cancel-{probe.log,final.log,lint.log}`。脚本仅使用已有 testMode 暂停接口，无新增生产配置。结果证明取消状态下不返回旧候选和后续请求可用；不证明重型同步查询能被立即抢占，不是可见弹窗或真实 WSL 验收。

## 复现

使用当前已构建的 language-server 与 testkit：

```sh
node scripts/check-completion-cancellation.mjs /tmp/sophp-completion-cancellation.json
```

未打包、提交、推送或更新 Profile。继续等待本轮完整协议回归并保持其源码输入冻结。
