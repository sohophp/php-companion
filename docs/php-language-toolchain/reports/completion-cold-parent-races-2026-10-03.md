# 冷父类读取中的补全取消与版本撤回

2026-10-03。当前 Core／PHP 7.2、8.5／onDemand 六个受控协议场景通过；正式脚本原会话 32977 与 ESLint 原会话 76602 均退出 0。此项关闭声明追加场景 D34 缺少专用时序探针的证据缺口，产品源码没有修改。

## 方法与结果

独立临时 Composer PSR-4 项目，父类在磁盘具有 final __construct，子类光标为 public function __con。打开子类并等诊断后，测试子进程中通过 Node preload 仅拦截目标父类的第一次 fs/promises.readFile；收到 IPC held 事件后确认旧 completion ID 尚未返回。这不同于处理器入口的通用暂停，直接把竞态放在冷父类读取中。

两版各验证三个场景：

1. 显式取消原 completion ID，文档仍是版本 1，状态查询后释放读取。原请求严格返回 []；同前缀新请求仍正确过滤 final 构造函数，随后更宽 __ 前缀返回 __invoke 并继续排除 __construct，证明取消不污染后续查询。
2. 父类读取中把子类未保存名称改为 __inv，状态查询确认版本 2 后释放。旧结果严格为空，新结果包含 __invoke。
3. 父类读取中打开其非 final 未保存内容，子类仍为版本 1，状态查询后释放。旧依赖查询严格为空，新请求建议 __construct，不能被磁盘 final 声明覆盖。

每个场景最后读取两个磁盘文件，严格比较初始文本，再正常 shutdown 和 exit 0。完整数据见同名 JSON。独立原型首轮对父类打开场景错误地期待旧请求立即返回新候选，实际返回 []；修正为撤回旧请求、由新请求读取当前事实后通过。原型错误没有导致产品逻辑修改。

测试 gate 只在本脚本启动的 IPC Node 子进程中运行，不进入扩展或生产配置，不改变 LSP。正式脚本首次 lint 缺少 URL 的显式导入，补齐后 lint 与六场景重新通过。

## 复现

当前 Core 和 testkit 已构建后运行：

```sh
node scripts/check-cold-parent-completion-races.mjs /tmp/sophp-cold-parent-races.json
```

脚本检查两版 onDemand 的受控读取竞态；不代表 progressive／experimental、Windows、真实 WSL 可见 UI、重型同步任务抢占或取消停止时间预算。已有通用三索引模式取消检查另见[记录](c2-completion-cancellation-2026-10-02.md)。

集中集成的 2962 项冻结输入保持一致，完整 stdio 原会话 25202 继续运行。新增独立脚本不在该次 26 文件协议回归中，不增加其通过数量；没有打包、提交、推送或更新 Profile。
