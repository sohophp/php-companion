# 类首次 References 的并发准备

基线 `42a2602`。继续缩短验证循环，Winstar 仅作只读测量。

## 问题与修改

过去只有延迟方法体的查询才传入 `prepareSource`。类 References 使用普通完整解析，因此即使配置了 64 个并发读取槽，空缓存路径也只提前检查文件信息，源码读取、候选摘要和匹配文件解析仍留在主线程。

现在 References 显式启用既有 CandidateWorkers 准备路径。文件读取仍有界，摘要和解析在现有最多 4 个 worker 中执行，语义提交继续按文件顺序。类查询仍提供完整事实，方法查询仍按原有规则延迟方法体；没有减少候选集合。URI/内容摘要验证、未保存文档优先级、worker 失败后的普通解析回退沿用现有实现。扫描重试保留该选项。

新增参数只由 References 显式开启，其他调用者保留原有默认行为。没有修改底层索引包或持久化格式。

## 真实项目对照

使用正式核心 bundle、独立 Symfony 扩展的实际默认注册与相同 Provider，均为空缓存、References 在 Definition 之前。目标为 `src/Bridge/AdminSecuritySubscriber.php` 的类声明，扫描 2,289 文件、匹配 31 文件。

| 版本 | 首次 References | 候选扫描 | worker 提交文件 |
| --- | ---: | ---: | ---: |
| 基线 42a2602 | 7,579 ms | 4,230 ms | 0 |
| 修改版，先于基线运行 | 5,877 ms | 2,568 ms | 30 |

打开的声明文件继续使用主线程当前文档，30 个关闭文件由 worker 准备。首次实测为 5,554 ms，反向对照为 5,877 ms；不把单次最好值当作保证。

两版均精确返回 `services.yaml:42` 的 `App\Bridge\` 注册和类文件第 32 行的 `KernelEvents::CONTROLLER` 订阅。完整位置摘要均为 `c0d5d86b7e083c6f21354d508f2897712e0b7b6a8663efd6cf2066788ff221fd`，Definition 的一处位置摘要也一致。

最终收窄开关后的正式 bundle 再测：首次 5,807 ms，直接重复 846 ms，Definition 后重复 102 ms；三次均通过上述完整位置摘要。证据为 `/tmp/php-companion-class-preparation-final.{jsonl,log}`。

方法场景 `AdminPasswordChangeGuard.php` 最后一个 `get` 返回相同 112 处完整引用，摘要 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`，首次 12,623 ms，扫描 5,301 ms。该场景原本已经启用 worker，本轮不宣称其首次耗时改善。

## 定向验证

新增 stdio 测试验证关闭文件确实由 worker 提交，首次返回参数类型和实例化两处引用。重启后保持磁盘不变，只在未保存文档中删掉实例化引用，结果必须只保留参数类型引用。

最终 4 项 stdio 回归通过，16.96 秒：上述类查询、方法候选 Reload、一致的提升属性路径及 Symfony 资源注册。Language Server TypeScript、正式 bundle、改动文件 ESLint 通过。没有重复全仓门禁或重新生成安装候选。

本机原始证据：`/tmp/php-companion-class-preparation-{new-class,old-class,new-method}.{jsonl,log}`。默认 Symfony 静态路由对 Winstar 仍报告 incomplete，不能把这组 PHP/服务/事件结果当成全部路由关系验收。

首次交互目标仍未达到，尤其方法查询仍约 12.6 秒。下一步集中检查方法候选准备与语义引用计算；实际 WSL Profile 的持续编码验收和新版 VSIX 安装尚未完成，Goal 保持进行中。
