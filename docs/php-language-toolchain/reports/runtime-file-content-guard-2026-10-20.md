# 重构预览的PHP运行程序内容守卫

2026-10-20。本地修复已提交为`71c7b40f`，独立工作树`/var/www/node/php-companion-runtime-guard-20261020`基于`193cda54`；产品基线`1f096ff1`。修改仅涉及运行程序守卫及两份定向测试，尚未授予最终稳定候选资格。

## 问题与修复

预览生成后，已选PHP程序若被等长改写并恢复修改时间，原元数据身份可能保持相同。固定时间后的Linux原回归6项中5通过、1失败，守卫错误接受了变化。原Windows四个已安装Node版本的自然元数据观察都能区分此次改写，但不能据此排除时间分辨率碰撞。

守卫现以流式SHA-256核对内容，读取前后检查完整文件身份，并重新打开路径确认仍指向同一文件。非普通文件先拒绝，打开时使用可用的非阻塞标志，文件句柄在所有出口关闭。公开调用签名、重构工作流和已有拒绝策略保持。

跨版本实测发现Windows Node22.14的路径stat设备号为0，句柄stat为实际设备号；首个私有修复误拒绝正常文件的结果保留。最终实现用同类句柄核对全部身份字段，保留设备号检查。

## 已执行并通过

- Linux两文件7项，零跳过；包括真实文件等长改写，以及模拟粗粒度时间、全部身份字段相同的确定性反例。
- Windows原生Node20.19.0、22.14.0、22.22.3、24.16.0：正常文件保持、等长改写撤回，临时文件清理完成。
- 同四版本的粗粒度元数据模拟：原实现四组均按预期失败，修复四组均通过。使用真实临时文件，只模拟时间分辨率；这不等于Windows真实Vitest或编辑器全流程。
- 私有变体只忽略最终内容摘要时，新增确定性案例按预期失败；负向控制未进入产品。
- FIFO输入的前一哈希原型会阻塞，2秒观察后自有子进程已强制结束并回收；最终类型检查/非阻塞版本正常拒绝并退出。首次控制因文件路径错误未执行，记录保留，不计为产品测试。
- 修改范围Lint、根TypeScript检查通过。约11.4MB真实PHP文件5轮观测，每次捕获/检查约62–83ms，句柄数前后21；成本仅限该机器/文件，不作为冷I/O、Controller或全平台性能资格。

## 候选验证终态与剩余工作

独立修复树已通过构建、149项完整根单元、Lint和根类型检查；3706个源码输入保持，原型受测三份源码与本地提交内容一致。[完整C3及两类专项入口](runtime-file-content-guard-editor-2026-10-20.md)两模式合计六入口及独立审计通过，80生成边界、20运行程序替换拒绝和10恢复操作链保持。

三份VSIX通过现有打包检查，Alpha候选位于`/var/www/node/php-companion-runtime-guard-20261020/artifacts/php-companion-alpha-0.4.13-71c7b40f`。七个LS资产、普通基准与testkit逐字保持，仅extension.js变化。[冻结VSIX载荷的原完整独立入口](runtime-file-content-guard-standalone-2026-10-20.md)及独立审计已通过（396.93秒），[完整12扩展组合](runtime-file-content-guard-profile-2026-10-20.md)及独立审计通过（97.14秒，P95为99/112ms）；当前提交远程CI和真人WSL待验；日常Profile未更新，未推送或公开发布。复杂Controller原500/150ms缺口和最终六项检查继续开放。

首次等待器因Python缺少pidfd_open在执行验证命令前退出；改为核对原进程PID、启动时刻和命令身份后，已正确接续Windows矩阵终态并完成候选验证。原失败保留，没有重新运行Windows矩阵。

证据：[机器汇总](runtime-file-content-guard-2026-10-20.json)、[修复实现](../../../src/refactor/runtimeFiles.ts)、[真实文件回归](../../../test/unit/runtime-files.test.ts)、[元数据碰撞回归](../../../test/unit/runtime-files-coarse-metadata.test.ts)、[候选验证终态](../../../.vscode-test/runtime-file-guard-windows-2026-10-20/candidate-validation-state.json)。

正式安装补验：[三包CLI及39文件一致，但原完整套件依赖Test模式暂停钩子而退出1](runtime-file-content-guard-installed-2026-10-20.md)。单独保留正式模式适配缺口，不改变前述解包载荷通过范围。
