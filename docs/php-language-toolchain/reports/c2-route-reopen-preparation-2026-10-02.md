# 路由异步查询同版本重开：修复准备

后续：两个入口已经应用到正式源码，18 项正式协议、十项已有回归与可见 Route Status 宿主通过，见 [R44 完成记录](c2-route-reopen-completion-2026-10-02.md)。下文保留修改前的准备证据。

日期：2026-10-02。R43 取消链通过后，继续核对异步 Provider 返回与文档身份。当前主产品源码未改，R42 完整 429 项 stdio 仍使用原冻结输入。

## 已确认失败

路由补全进入处理器并等待真实独立 Provider 子进程后，关闭消费文档，以同 URI、同版本 1、不同字符串前缀重开，再释放 Provider。旧请求仍返回旧文本适用的候选，新请求已正确返回空。这不能由仅检查 version 区分；重开的 TextDocument 身份已改变。

两个 PHP 版本 7.2／8.5 × 三种索引模式 onDemand／experimental／progressive × 三个操作，共 18 个实际协议场景：

- 路由名称补全：六个场景均错误返回旧 demo 候选。
- 路径参数补全：六个场景均错误返回旧 id 候选。
- 路由 Definition：六个场景已正确返回空，其稍后的现有 currentQueryDocument 检查有效，作为保护反例保留。

每个场景先确认未重开时的正确候选或跳转，Provider 写入 started 标记后再重开并等待新版本诊断，旧请求尚未返回，随后释放 Provider。新请求均为空，因此失败不是 Provider 输出随机变化。[原始 18 项 JSON](c2-route-reopen-baseline-2026-10-02.json)。

## 修复范围与状态

只修补全的两个 Provider await 后返回入口：复用 currentQueryDocument 同时检查取消、文档对象身份与版本；保留外部 Symfony 所有权检查。Definition 已有稍后身份检查，保持其原实现。

隔离编译副本中的单个名称复现已从旧 demo 改为空，后续请求也为空。扩大验证曾同时加强 Definition 的早期检查，但它的基线已经正确；因此恢复这处修改，正式独立脚本对只修改两个补全入口的隔离副本完整 18 项全部通过，退出码 0；脚本 ESLint 退出码 0。[隔离结果](c2-route-reopen-isolated-2026-10-02.json)。原主产品与宿主冻结输入 38 项保持不变。

`scripts/check-route-query-reopen.mjs` 提供可重复的 gate 控制、暖态正例、重开后的旧结果和新结果检查，可传入隔离编译 server.js。当前主产品会在旧结果检查处失败；不得把隔离结果计作已部署修复。测试扩展矩阵时曾因 JS fixture 的 namespace 反斜线错误造成暖态空候选；纠正后取得上述正式基线，保留首次失败日志，不作为产品回归。

接下来：等待完整回归终止并核验其输入，然后把已验证的两个入口修改应用到源码，构建并执行实际产品协议及受影响宿主门禁。没有打包、提交、推送或更新 Profile。

日志：`/tmp/sophp-route-reopen-{probe.log,fixed.log,family-baseline.log,family-baseline-final.log,family-fixed.log,final-fixed.log,lint.log,baseline-product-inputs.log}`。本准备报告尚不宣布修复完成。
