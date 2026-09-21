# Symfony References 缓存与事件读取

## 本轮范围

继续缩短验证循环，并把首次 References 的测量从核心模式扩展到独立 Symfony 扩展的真实默认注册。没有安装或冻结新 VSIX，也没有修改 Winstar 源码。

`scripts/benchmark-symfony-profile.mjs` 调用扩展自己的 `SymfonyIntegration`，使用正式构建的服务、事件、Controller context、静态路由 Provider 与 WASM；不复制 Provider 描述符。通过 `PHP_COMPANION_BENCHMARK_SYMFONY=1` 启用。核心持久化结果基线显式关闭该开关，避免混用两种配置的验收条件。

## 修改

- SemanticWorkspace 对 Provider 提交的 methods、properties、literalMethodReturns 比较实际消费内容。相同内容保持引用缓存，变化或移除仍失效；generation 和容器注册元数据仍更新。复制泛型模板数组，防止调用方修改原数组破坏已保存内容。
- References 先完成框架声明加载，再计算语义引用，避免事件类型加载立即清空刚生成的缓存。服务、路由、事件引用仍重新合并。
- 事件 Provider 每批最多并行读取 8 个文件，保持原有排序、去重、未保存快照优先级、根路径检查与读取预算。任何缺失文件、越界符号链接或超限均拒绝整份结果。
- 日志分开报告 container、routes、events、semantic 耗时；事件 Provider 进一步区分准备输入与进程执行。

## Winstar 实测

目标为 `AdminPasswordChangeGuard.php` 最后一个 `get`，请求顺序为 References → References → Definition → References。每次空缓存首次均先查询 References；项目候选文件 2,289 个。

| 配置 | 首次 References | 直接重复 | Definition 后重复 |
| --- | ---: | ---: | ---: |
| 原版 cfd53ac 核心及原事件 Provider | 13,840 ms | 3,433 ms | 3,468 ms |
| 缓存修复，事件串行读取 | 12,643 ms | 920 ms | 992 ms |
| 缓存修复再次测量，事件串行读取 | 14,094 ms | 976 ms | 904 ms |

这组结果证明重复查询改善；冷查询波动较大，不把缓存修复本身宣称为稳定的首次加速。

继续隔离事件 IO，使用相同核心程序，只替换事件 Provider，随后反向运行：

| 对照顺序 | 事件串行读取：首次 / Provider 执行 | 每批 8 文件：首次 / Provider 执行 |
| --- | ---: | ---: |
| 旧 → 新 | 13,617 / 2,754 ms | 12,449 / 1,759 ms |
| 新 → 旧 | 13,406 / 2,639 ms | 12,519 / 1,709 ms |

所有上述方法查询返回相同 112 处完整引用，SHA-256 为 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`；Definition 为同一处，摘要 `62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1`。最终反向测量中，新 Provider 的两次重复查询为 1,010 / 943 ms。

实际类声明 `AdminSecuritySubscriber` 的首次为 7,560 ms，直接重复 859 ms，Definition 后重复 103 ms。准确返回：

- `config/symfony/services.yaml:42` 的 `App\Bridge\`，LSP 范围 `(41,2)–(41,13)`。
- `src/Bridge/AdminSecuritySubscriber.php:32` 的 `KernelEvents::CONTROLLER`，LSP 范围 `(31,16)–(31,40)`。

由源码独立计算上述两个期望范围，摘要与三次 References 相同：`c0d5d86b7e083c6f21354d508f2897712e0b7b6a8663efd6cf2066788ff221fd`。

## 聚焦验证

- 语义定向 3 项通过（2.09 秒）：相同事实复用、不相同/移除事实失效、模板数组隔离及声明恢复。
- 事件 Provider 3 项通过（1.17 秒）：17 文件跨批次、顺序/去重、未保存快照、数量/字节预算、缺失文件、越界符号链接与继承订阅。
- stdio Symfony 定向 5 项通过（13.87 秒）：资源注册、XML、watcher 更新、容器引用、重复事件引用及更新/移除。
- 正式核心 bundle 跨进程持久引用用例通过（24.44 秒），包含输入变化拒绝旧结果；该测试按显式开关运行。
- 受影响 TypeScript 构建、核心及 Symfony 正式 bundle、改动文件 ESLint、`git diff --check` 通过。

未重复全仓打包、完整 tarball 消费和编辑器宿主门禁。本轮验证不能替代实际 WSL Profile 中的持续编码体验。

复现默认 Symfony 测量：

```bash
PHP_COMPANION_BENCHMARK_SYMFONY=1 \
PHP_COMPANION_BENCHMARK_REFERENCES_FIRST=1 \
node scripts/benchmark-language-queries.mjs \
  /var/www/php/8.5/winstar2024 \
  /var/www/php/8.5/winstar2024/src/Security/AdminPasswordChangeGuard.php \
  get last /tmp/php-companion-symfony-fresh-cache repeat dist/language-server.js
```

每次冷测须使用新的缓存目录。原始本机证据位于 `/tmp/php-companion-symfony-profile-{first,reuse,stages,prepare,bounded}.{jsonl,log}`、`/tmp/php-companion-symfony-reverse-{old,new}.{jsonl,log}`、`/tmp/php-companion-symfony-subscriber-final.{jsonl,log}`；这些临时文件不是发行产物。

## 尚未达成

首次方法 References 仍约 12.5 秒。分段显示候选扫描约 5.2 秒、语义计算约 2.5 秒，仍是后续重点；重复查询还包含约 0.8 秒容器刷新。不能只因返回值相同就省略 Provider 的输入校验。

默认 Symfony 静态路由 Provider 对 Winstar 仍返回 incomplete，服务端忽略该路由快照；默认关闭 Winstar 运行时路由 Provider。本轮证明既定 PHP/服务/事件结果未丢失，不证明全部路由关系完整，也不代表完整 Symfony 验收通过。Symfony 配置下的跨进程引用结果持久化尚未启用。Goal 保持进行中。
